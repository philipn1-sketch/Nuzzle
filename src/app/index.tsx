import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SideButton, type SideState } from '../components/SideButton';
import { Card, PillButton, PrimaryButton, QuietButton, Screen, SecondaryButton, SnackbarSlot, T, TopBar } from '../components/ui';
import {
  activeFeed, endSide, feedStart, isDue, lastSaved, looksForgotten, runningSide, sideMs, sideRuns, suggestedSide, totalMs,
} from '../core/feeds';
import { clock, mins, sideWord, span, timeOf } from '../core/format';
import { babyName, planReminder } from '../core/reminder';
import type { Side } from '../core/types';
import { useApp, useNow } from '../state/AppState';
import { usePalette } from '../state/theme';
import { space, type } from '../theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
      if (active.status === 'paused') return 'paused';
      return runningSide(active) === side ? 'running' : 'switch';
    }
    return suggested === side ? 'suggested' : 'rest';
  };

  const showAsk = !active && last !== null && !settings.reminderAsked && permission === 'undetermined' && app.snack === null;
  const showStill = active !== null && !app.stillFeedingAnswered && looksForgotten(feeds, settings, now);
  const reminder = permission === 'granted' ? planReminder(feeds, settings, now) : null;
  const due = isDue(feeds, settings, now);

  return (
    <Screen>
      <TopBar
        left={<PillButton label="History" onPress={() => router.push('/history')} testID="open-history" />}
        right={<PillButton label="Settings" onPress={() => router.push('/settings')} testID="open-settings" />}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          {active ? (
            <Card style={styles.answer}>
              <T tone="muted" style={type.label}>{active.status === 'paused' ? 'Paused' : `Feeding on the ${sideWord(endSide(active))}`}</T>
              <T testID="timer" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.4} style={[type.timer, { color: active.status === 'paused' ? p.muted : p.ink }]} accessibilityLabel={`Fed for ${span(totalMs(active, now))}`}>
                {clock(totalMs(active, now))}
              </T>
              <T tone="muted" style={type.label}>Started at {timeOf(feedStart(active))}</T>
            </Card>
          ) : last ? (
            <Card style={styles.answer}>
              <T tone="muted" style={type.label}>Since {name}&apos;s last feed started</T>
              <T testID="since" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.4} style={[type.answer, { color: due ? p.accent : p.ink }]}>{cap(span(now - feedStart(last)))}</T>
              <T testID="last-side" style={type.title}>Ended on the {sideWord(endSide(last))}</T>
              <T tone="muted" style={[type.label, { marginTop: space.s }]}>
                Last feed at {timeOf(feedStart(last))}: {sideRuns(last, now).map((r) => `${r.side} ${mins(r.ms)}m`).join(' then ')}
              </T>
              {due ? (
                <T tone="accent" style={type.label}>Past your {span(settings.intervalMin * 60_000)} reminder time</T>
              ) : (
                reminder && <T tone="muted" style={type.label}>Reminder at {timeOf(reminder.at)}</T>
              )}
            </Card>
          ) : (
            <Card style={styles.answer}>
              <T style={type.title}>No feeds yet</T>
              <T tone="muted" style={type.label}>Tap a side below when {name} starts feeding.</T>
            </Card>
          )}

          {showStill && active && (
            <Card>
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
            <Card>
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
        {active && <QuietButton label="Discard this feed" onPress={app.discard} testID="discard" style={{ alignSelf: 'center' }} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.side, paddingBottom: space.l },
  top: { gap: space.m, paddingTop: space.s },
  answer: { gap: space.xs, minHeight: 168, justifyContent: 'center' },
  cardButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.l },
  bottom: { gap: space.m, paddingHorizontal: space.side, paddingTop: space.s },
  sides: { flexDirection: 'row', gap: space.m },
});
