import { router } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Ring } from '../components/Ring';
import { SideButton, type SideState } from '../components/SideButton';
import { Card, PillButton, PrimaryButton, QuietButton, Screen, SecondaryButton, SnackbarSlot, T, TopBar } from '../components/ui';
import {
  activeFeed, endSide, feedStart, isDue, lastSaved, looksForgotten, runningSide, sideMs, sideRuns, suggestedSide, totalMs,
} from '../core/feeds';
import { clock, mins, sideWord, span, spanWords, timeOf } from '../core/format';
import { babyName } from '../core/reminder';
import type { Side } from '../core/types';
import { useApp, useNow } from '../state/AppState';
import { usePalette } from '../state/theme';
import { sideColor, space, type, wash } from '../theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function RingOrPlain({ compact, children, ...ring }: React.ComponentProps<typeof Ring> & { compact: boolean }) {
  if (compact) return <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.s }}>{children}</View>;
  return <Ring {...ring}>{children}</Ring>;
}

/** Home answers "which side was last" and "how long since the last feed", and starts a feed in one tap. */
export default function Home() {
  const app = useApp();
  const { feeds, settings, permission } = app;
  const now = useNow(1000);
  const p = usePalette();
  const active = activeFeed(feeds);
  const last = lastSaved(feeds);
  const suggested = suggestedSide(feeds);
  const name = babyName(settings);

  const sideState = (side: Side): SideState => {
    if (active) {
      if (active.status === 'paused') return endSide(active) === side ? 'paused' : 'switch';
      return runningSide(active) === side ? 'running' : 'switch';
    }
    return suggested === side ? 'suggested' : 'rest';
  };

  const showAsk = !active && last !== null && !settings.reminderAsked && permission === 'undetermined' && app.snack === null;
  const showStill = active !== null && !app.stillFeedingAnswered && looksForgotten(feeds, settings, now);
  // only when a reminder can actually ring
  const due = settings.remindersOn && permission === 'granted' && isDue(feeds, settings, now);

  // The ring: while feeding it sweeps once a minute like a gentle second hand; otherwise it fills
  // as time since the last feed started approaches her reminder time.
  const { width, height } = useWindowDimensions();
  // the ring makes room when a question card is showing
  const ring = Math.min(width - 2 * space.side - 40, height * 0.36, 300);
  // when a question card needs the room, the same answer shows without the ring
  const compact = showStill || showAsk;
  const ringProgress = active
    ? (totalMs(active, now) % 60_000) / 60_000
    : last ? (now - feedStart(last)) / (settings.intervalMin * 60_000) : 0;
  // the ring takes the colour of the side that is feeding; at rest it is rose, and full once her time has passed
  const ringColor = active ? (active.status === 'paused' ? p.muted : sideColor(p, endSide(active))) : p.accent;

  return (
    <Screen>
      <TopBar
        title={name}
        left={<PillButton label="History" onPress={() => router.push('/history')} testID="open-history" />}
        right={<PillButton label="Settings" onPress={() => router.push('/settings')} testID="open-settings" />}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <RingOrPlain compact={compact} size={ring} width={14} progress={ringProgress} color={ringColor} track={wash(p.muted, '2E')}>
            {active ? (
              <>
                <T tone="muted" style={[type.label, styles.centreText]} numberOfLines={2}>
                  {active.status === 'paused' ? `Paused on the ${sideWord(endSide(active))}` : `Feeding on the ${sideWord(endSide(active))}`}
                </T>
                <T testID="timer" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}
                  style={[type.timer, { color: active.status === 'paused' ? p.muted : p.ink }]}
                  accessibilityLabel={`Fed for ${spanWords(totalMs(active, now))}`}>
                  {clock(totalMs(active, now))}
                </T>
                <T tone="muted" style={[type.label, styles.centreText]}>Started at {timeOf(feedStart(active))}</T>
              </>
            ) : last ? (
              <>
                <T tone="muted" style={[type.label, styles.centreText]} numberOfLines={2}>Since {name}&apos;s last feed</T>
                <T testID="since" accessibilityLabel={`${spanWords(now - feedStart(last))} since the last feed started`} numberOfLines={1}
                  adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={[type.answer, { color: p.ink }]}>
                  {cap(span(now - feedStart(last)))}
                </T>
                <View style={[styles.sideChip, { backgroundColor: wash(sideColor(p, endSide(last))) }]}>
                  <T testID="last-side" tone={endSide(last) === 'L' ? 'accent' : 'peach'} style={type.body} maxFontSizeMultiplier={1.4}>Ended on the {sideWord(endSide(last))}</T>
                </View>
              </>
            ) : (
              <>
                <T style={[type.title, styles.centreText]}>No feeds yet</T>
                <T tone="muted" style={[type.label, styles.centreText]}>Tap a side below when {name} starts feeding.</T>
              </>
            )}
          </RingOrPlain>

          {active ? (
            <QuietButton label="Discard this feed" onPress={app.discard} testID="discard" />
          ) : last ? (
            <View style={styles.under}>
              <T tone="muted" style={[type.label, styles.centreText]}
                accessibilityLabel={`Last feed at ${timeOf(feedStart(last))}: ${sideRuns(last, now).map((r) => `${sideWord(r.side)} ${mins(r.ms)} minutes`).join(', then ')}`}>
                Last feed at {timeOf(feedStart(last))} · {sideRuns(last, now).map((r) => `${r.side} ${mins(r.ms)}m`).join(' then ')}
              </T>
              {due ? (
                <T tone="accent" style={[type.body, styles.centreText]}>Past your {span(settings.intervalMin * 60_000)} reminder time</T>
              ) : (
                app.scheduledAt !== null && <T testID="reminder-at" tone="muted" style={[type.label, styles.centreText]}>Reminder at {timeOf(app.scheduledAt)}</T>
              )}
            </View>
          ) : null}

          {showStill && active && (
            <Card style={styles.wide}>
              <T style={type.title}>Still feeding?</T>
              <T tone="muted" style={[type.label, { marginTop: space.xs }]}>This feed has been going for {span(now - feedStart(active))}.</T>
              <View style={styles.cardButtons}>
                <SecondaryButton label="Yes, still feeding" strong onPress={app.keepFeeding} testID="still-yes" />
                <SecondaryButton
                  label="Save and fix the time"
                  testID="still-fix"
                  onPress={() => {
                    const saved = app.done();
                    if (saved) router.push(`/feed/${saved.id}`);
                  }}
                />
              </View>
            </Card>
          )}

          {showAsk && (
            <Card style={styles.wide}>
              <T style={type.body}>Want a reminder after each feed starts?</T>
              <T tone="muted" style={[type.label, { marginTop: space.xs }]}>You choose how long in Settings. It starts at {span(settings.intervalMin * 60_000)}.</T>
              <View style={styles.cardButtons}>
                <SecondaryButton label="Turn on" strong onPress={app.askReminders} testID="reminders-on" />
                <SecondaryButton label="Not now" onPress={() => app.updateSettings({ reminderAsked: true, remindersOn: false })} testID="reminders-not-now" />
              </View>
            </Card>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <SnackbarSlot />
        {active && <PrimaryButton label="Done" onPress={app.done} testID="done" hint="Stops and saves this feed" />}
        <View style={styles.sides}>
          {(['L', 'R'] as const).map((s) => (
            <SideButton key={s} side={s} state={sideState(s)} ms={active ? sideMs(active, s, now) : null} onPress={() => app.tap(s)} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.side, paddingVertical: space.l },
  top: { gap: space.l, alignItems: 'center' },
  centreText: { textAlign: 'center' },
  sideChip: { borderRadius: 999, paddingHorizontal: space.l, paddingVertical: 6, marginTop: space.xs },
  under: { gap: 2, alignItems: 'center' },
  wide: { alignSelf: 'stretch' },
  cardButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.l },
  bottom: { gap: space.m, paddingHorizontal: space.side, paddingTop: space.s },
  sides: { flexDirection: 'row', gap: space.m },
});
