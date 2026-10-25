import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Choice, PillButton, PrimaryButton, Screen, SnackbarSlot, T, TopBar } from '../components/ui';
import { ageText, amount, mins, span } from '../core/format';
import { babyName } from '../core/reminder';
import { summaryDays, summaryHtml } from '../core/summary';
import { useApp, useNow } from '../state/AppState';
import { usePalette } from '../state/theme';
import { line, space, type } from '../theme';
import { shareSummaryPdf } from '../services/summary';

/** A page to show at a check up: what was logged, day by day. Only what she recorded, never advice. */
export default function Summary() {
  const { feeds, entries, settings, baby } = useApp();
  const now = useNow(60_000);
  const p = usePalette();
  const [days, setDays] = useState<'7' | '14'>('7');
  const [busy, setBusy] = useState(false);
  const rows = summaryDays(feeds, entries, Number(days), now);
  const name = babyName(baby);
  const share = async () => {
    setBusy(true);
    const html = summaryHtml({
      name, age: baby.birthday !== null ? ageText(baby.birthday, now) : '', feeds, entries, days: Number(days), units: settings.units, now,
    });
    await shareSummaryPdf(html).catch(() => {});
    setBusy(false);
  };
  const dayName = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <Screen>
      <TopBar left={<PillButton label="Back" onPress={() => router.back()} testID="back" />} title="Summary" />
      <ScrollView contentContainerStyle={styles.body}>
        <T tone="muted" style={type.label}>
          A one page summary of what you logged for {name}, to show at a check up. It has feeds (bottles included), sides, nappies, sleep and any weights.
        </T>
        <Choice<'7' | '14'>
          label="How many days"
          value={days}
          onChange={setDays}
          options={[{ value: '7', label: 'Last 7 days' }, { value: '14', label: 'Last 14 days' }]}
        />
        <View style={{ gap: 0 }}>
          {[...rows].reverse().map((r) => (
            <View key={r.dayStart} style={[styles.row, { borderBottomColor: line(p) }]}
              accessible accessibilityLabel={`${dayName(r.dayStart)}: ${r.feeds} feeds, left ${mins(r.leftMs)} minutes, right ${mins(r.rightMs)} minutes, ${r.wet} wet and ${r.dirty} dirty nappies`}>
              <T style={[type.body, { width: 112 }]}>{dayName(r.dayStart)}</T>
              {r.empty ? <T tone="muted" style={[type.label, { flex: 1 }]}>Nothing logged</T> : <View style={{ flex: 1, gap: 2 }}>
                <T style={type.label}>{r.feeds} {r.feeds === 1 ? 'feed' : 'feeds'} · L {mins(r.leftMs)}m · R {mins(r.rightMs)}m{r.bottleMl ? ` · ${amount(r.bottleMl, settings.units)}` : ''}</T>
                <T tone="muted" style={type.label}>
                  {r.wet} wet · {r.dirty} dirty{r.sleepMs ? ` · slept ${span(r.sleepMs)}` : ''}
                </T>
              </View>}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        <SnackbarSlot />
        <PrimaryButton label={busy ? 'Making the PDF' : 'Share as a PDF'} onPress={share} testID="share-summary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.side, paddingBottom: space.xl, gap: space.l },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  bottom: { paddingHorizontal: space.side, gap: space.m, paddingTop: space.s },
});
