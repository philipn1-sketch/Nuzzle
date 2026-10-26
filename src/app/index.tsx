import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Ring } from '../components/Ring';
import { SideButton, type SideState } from '../components/SideButton';
import { Card, Choice, PillButton, PrimaryButton, QuietButton, Screen, SecondaryButton, SnackbarSlot, T, TopBar } from '../components/ui';
import {
  activeFeed, endSide, feedStart, lastBreast, lastSaved, looksForgotten, runningSide, sideMs, suggestedSide, totalMs,
} from '../core/feeds';
import { clock, sideWord, span, spanWords, timeOf } from '../core/format';
import { nextStep } from '../core/plan';
import { babyName, followsPlan, nextFeedAt } from '../core/reminder';
import { runningSleep } from '../core/entries';
import type { Side } from '../core/types';
import { useApp, useNow } from '../state/AppState';
import { usePalette } from '../state/theme';
import { line, radius, sideColor, space, TAP, type, wash } from '../theme';
import { APP_NAME } from '../config';
import { showCode as codeText } from '../core/sync';

function RingOrPlain({ compact, children, ...ring }: React.ComponentProps<typeof Ring> & { compact: boolean }) {
  if (compact) return <View style={{ alignItems: 'center', gap: space.xs, paddingVertical: space.s }}>{children}</View>;
  return <Ring {...ring}>{children}</Ring>;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Home answers "which side was last" and "how long since the last feed", and starts a feed in one tap. */
export default function Home() {
  const app = useApp();
  const { feeds, settings, permission } = app;
  const now = useNow(1000);
  const p = usePalette();
  const active = activeFeed(feeds);
  const last = lastSaved(feeds);
  const lastSide = lastBreast(feeds);
  const suggested = suggestedSide(feeds);
  const name = babyName(app.baby);
  const sleeping = runningSleep(app.entries);
  const many = settings.babies.length > 1;
  // while a feed runs the sleep bar steps aside for the ring; the Woke up button moves to the row below
  const sleepBar = sleeping !== null && !active;
  // one next feed, from whichever rule is on: the daily plan's times, or her gap after a feed starts
  const dueAt = nextFeedAt(feeds, settings, app.baby, app.plus);
  const overdue = !active && dueAt !== null && now >= dueAt;
  const fromPlan = followsPlan(app.baby, app.plus);
  const nd = new Date(now);
  const step = fromPlan && app.baby.plan ? nextStep(app.baby.plan, nd.getHours() * 60 + nd.getMinutes()) : null;
  const stepAt = step ? new Date(now).setHours(Math.floor(step.at / 60), step.at % 60, 0, 0) : 0;
  const stepText = step ? `${step.label === 'Bed' ? 'Bedtime' : step.label} at ${timeOf(stepAt)}` : 'Done for today';
  const [more, setMore] = useState(false);

  const sideState = (side: Side): SideState => {
    if (active) {
      if (active.status === 'paused') return endSide(active) === side ? 'paused' : 'switch';
      return runningSide(active) === side ? 'running' : 'switch';
    }
    return suggested === side ? 'suggested' : 'rest';
  };

  const showAsk = !active && last !== null && !settings.reminderAsked && permission === 'undetermined' && app.snack === null;
  const showStill = active !== null && !app.stillFeedingAnswered && looksForgotten(feeds, settings, now);

  const { width, height } = useWindowDimensions();
  // Home never scrolls: the ring takes whatever height is left between the top bars and the side
  // buttons, after the button under it. Measured, so the plan bar, baby switch and sleep bar all fit.
  const [area, setArea] = useState(0);
  const showCode = app.sync.code !== null && !settings.codeSaved && !active;
  const under = active ? TAP : TAP + (showCode ? TAP + space.xl : 0);
  const room = area > 0 ? area - under - space.xl - 2 * space.l : height * 0.36;
  const ring = Math.min(width - 2 * space.side - 40, room, 300);
  // a question card, or a phone too small for the ring, shows the same answer as plain text and may scroll
  const asking = showStill || showAsk;
  const compact = asking || ring < 200;
  const ringProgress = active || overdue ? 1 : last && dueAt ? (now - feedStart(last)) / Math.max(1, dueAt - feedStart(last)) : 0;
  // While feeding the ring is a calm full circle in the feeding side's colour. At rest it is neutral
  // and fills as time passes towards the next feed; once that passes it stays full and turns bright.
  const ringColor = active ? (active.status === 'paused' ? p.muted : sideColor(p, endSide(active))) : overdue ? p.ink : p.muted;
  // history badge over the side the last breast feed ended on
  const badgeSide = !active && lastSide ? endSide(lastSide) : null;
  const badgeText = last && lastSide ? (last === lastSide ? `Last feed · ${timeOf(feedStart(last))}` : `Last breast · ${timeOf(feedStart(lastSide))}`) : '';

  // the first launch questions, until they are answered or skipped
  if (!settings.onboarded && app.allFeeds.length === 0) return <Redirect href="/welcome" />;

  return (
    <Screen>
      <TopBar
        title={name}
        left={<PillButton label="History" onPress={() => router.push('/history')} testID="open-history" />}
        right={<PillButton label="Settings" onPress={() => router.push('/settings')} testID="open-settings" />}
      />
      {settings.babies.length > 1 && (
        <View style={styles.babies}>
          <Choice<string>
            label="Baby"
            value={app.baby.id}
            onChange={app.switchBaby}
            options={settings.babies.map((b) => ({ value: b.id, label: babyName(b) }))}
          />
        </View>
      )}
      {/* only while the plan is on; it is turned back on in Settings */}
      {!active && fromPlan && (
        <Pressable
          onPress={() => router.push('/plan')}
          accessibilityRole="button"
          accessibilityLabel={`Daily plan, next: ${stepText}`}
          accessibilityHint="Opens the daily plan"
          testID="plan-bar"
          style={({ pressed }) => [styles.planBar, { backgroundColor: p.surface, opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={{ flex: 1 }}>
            <T tone="muted" style={type.small}>DAILY PLAN</T>
            <T style={type.body} numberOfLines={1}>Next: {stepText}</T>
          </View>
          <T tone="muted" style={type.title}>›</T>
        </Pressable>
      )}
      {sleepBar && sleeping && (
        <View style={[styles.sleepBar, { backgroundColor: p.surface }]} accessibilityLiveRegion="polite">
          <View style={{ flex: 1 }}>
            <T style={type.body} testID="asleep">
              {many ? `${name} ` : ''}{now - sleeping.at < 60_000 ? (many ? 'just fell asleep' : 'Just fell asleep') : `${many ? 'asleep' : 'Asleep'} for ${span(now - sleeping.at)}`}
            </T>
            <T tone="muted" style={type.label}>Since {timeOf(sleeping.at)}</T>
          </View>
          <PillButton label="Woke up" onPress={app.toggleSleep} testID="woke-up" a11yLabel="She woke up" />
        </View>
      )}
      {/* it only scrolls when something doesn't fit, such as a question card or very large text */}
      <View style={{ flex: 1 }} onLayout={(e) => setArea(e.nativeEvent.layout.height)}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} scrollEnabled={asking} alwaysBounceVertical={false} showsVerticalScrollIndicator={false}>
        <View style={[styles.top, compact && !asking && { gap: space.m }]}>
          <Pressable
            disabled={active !== null || last === null}
            onPress={() => last && router.push(`/feed/${last.id}`)}
            // the numbers inside stay separate for VoiceOver; the Edit last feed line below is the button
            accessible={false}
            testID="ring"
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], alignSelf: 'stretch', alignItems: 'center' })}
          >
            <RingOrPlain compact={compact} size={ring} width={14} progress={ringProgress} color={ringColor} track={line(p)}>
              {active ? (
                <>
                  <T testID="timer" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}
                    style={[type.timer, { color: active.status === 'paused' ? p.muted : p.ink }]}
                    accessibilityLabel={`${active.status === 'paused' ? 'Paused' : `Feeding on the ${sideWord(endSide(active))}`}, fed for ${spanWords(totalMs(active, now))}`}>
                    {clock(totalMs(active, now))}
                  </T>
                  <T tone="muted" style={[type.body, styles.centreText]} testID="feed-state">{active.status === 'paused' ? 'Paused' : 'this feed'}</T>
                </>
              ) : last ? (
                <>
                  <T testID="since" accessibilityLabel={`${spanWords(now - feedStart(last))} since the last feed started`} numberOfLines={1}
                    adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={[type.timer, { color: p.ink }]}>
                    {cap(span(now - feedStart(last)))}
                  </T>
                  <T tone="muted" style={[type.body, styles.centreText]}>since last feed</T>
                  {overdue && dueAt !== null ? (
                    <View style={[styles.due, { borderColor: p.muted }]} testID="due" accessibilityLabel={`Next feed was due ${spanWords(now - dueAt)} ago`}>
                      <View style={[styles.dot, { backgroundColor: p.ink }]} />
                      <T style={[type.label, { fontWeight: '700' }]}>Due {span(now - dueAt)} ago</T>
                    </View>
                  ) : dueAt !== null ? (
                    <T testID="reminder-at" style={[type.label, styles.centreText, styles.next]} accessibilityLabel={`Next feed at ${timeOf(dueAt)}${fromPlan ? " in the daily plan" : ""}, in ${spanWords(dueAt - now)}`}>
                      Next feed {timeOf(dueAt)}{fromPlan ? ' · plan' : ''}
                    </T>
                  ) : null}
                  {!overdue && (
                    <T tone="muted" style={[type.small, styles.centreText]} accessibilityRole="button" testID="edit-last" onPress={() => router.push(`/feed/${last.id}`)}>
                      Edit last feed ›
                    </T>
                  )}
                </>
              ) : (
                <>
                  <T style={[type.title, styles.centreText]}>No feeds yet</T>
                  <T tone="muted" style={[type.body, styles.centreText]}>Tap a side to start</T>
                </>
              )}
            </RingOrPlain>
          </Pressable>

          {active && <QuietButton label="Discard this feed" onPress={app.discard} testID="discard" />}

          {!asking && !active && (
            <View style={styles.wide}>
              <SecondaryButton strong label="+ Log something" onPress={() => setMore(true)} testID="log" />
            </View>
          )}
          {showCode && !asking && (
            <QuietButton
              label="Save your family code ›"
              tone="ink"
              testID="save-code-home"
              onPress={() => {
                // one tap is enough: it leaves Home straight away, and the code stays in Settings
                app.updateSettings({ codeSaved: true });
                Share.share({
                  message: `Our ${APP_NAME} family code: ${codeText(app.sync.code ?? '')}\n\nKeep this safe. On a new phone, open ${APP_NAME}, then Settings, then Join with a code.`,
                }).catch(() => {});
              }}
            />
          )}

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
              <T style={type.body}>Remind you when the next feed is due?</T>
              <T tone="muted" style={[type.label, { marginTop: space.xs }]}>You can change this in Settings.</T>
              <View style={styles.cardButtons}>
                <SecondaryButton label="Turn on" strong onPress={app.askReminders} testID="reminders-on" />
                <SecondaryButton label="Not now" onPress={() => app.updateSettings({ reminderAsked: true, remindersOn: false })} testID="reminders-not-now" />
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
      </View>

      <View style={styles.bottom}>
        <SnackbarSlot />
        {active && <PrimaryButton label="Done" onPress={() => app.done()} testID="done" hint="Stops and saves this feed" />}
        <View style={styles.sides}>
          {(['L', 'R'] as const).map((s) => (
            <View key={s} style={{ flex: 1 }}>
              {/* a side that hasn't fed yet shows no 0:00 */}
              <SideButton side={s} state={sideState(s)} ms={active && (sideState(s) === 'running' || sideMs(active, s, now) > 0) ? sideMs(active, s, now) : null} onPress={() => app.tap(s)} />
              {badgeSide === s && (
                <View pointerEvents="none" style={styles.badgeRow}>
                  <View style={[styles.badgeWrap, { backgroundColor: p.bg }]}>
                    <View style={[styles.badge, { backgroundColor: p.surface, borderColor: sideColor(p, s) }]}>
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: wash(sideColor(p, s), '3D') }]} />
                      <T testID="last-side" style={[type.label, { fontWeight: '700' }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{badgeText}</T>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      <Modal visible={more} transparent animationType="fade" onRequestClose={() => setMore(false)}>
        <Pressable style={[styles.shade, { backgroundColor: wash(p.bg, 'B3') }]} onPress={() => setMore(false)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: p.surface }]}>
          <View style={[styles.grabber, { backgroundColor: line(p) }]} />
          <T style={[type.title, { paddingHorizontal: space.xs, paddingBottom: space.xs }]} accessibilityRole="header">Log</T>
          {([
            ['Bottle', 'log-bottle', () => router.push('/feed/new?kind=bottle')],
            ['Nappy', 'log-nappy', () => router.push('/entry/new?kind=nappy')],
            sleeping ? ['Woke up', 'log-sleep', app.toggleSleep] : ['Sleep', 'log-sleep', app.toggleSleep],
            ['Pumping', 'log-pump', () => router.push('/entry/new?kind=pump')],
            ['Weight and length', 'add-growth', () => router.push('/entry/new?kind=growth')],
          ] as [string, string, () => void][]).map(([label, id, go]) => (
            <SecondaryButton key={id} strong label={label} testID={id} onPress={() => { setMore(false); go(); }} />
          ))}
          <QuietButton label="Cancel" onPress={() => setMore(false)} testID="more-cancel" style={{ alignSelf: 'center' }} />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.side, paddingVertical: space.l },
  top: { gap: space.xl, alignItems: 'center' },
  centreText: { textAlign: 'center' },
  babies: { paddingHorizontal: space.side, paddingTop: space.s },
  sleepBar: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginHorizontal: space.side, marginTop: space.s, paddingLeft: space.l, paddingRight: space.xs, paddingVertical: space.xs, borderRadius: radius.row },
  next: { fontWeight: '700', marginTop: space.s },
  due: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.s, paddingVertical: 4, paddingLeft: 10, paddingRight: space.m, borderRadius: 8, borderWidth: 1.5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  planBar: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginHorizontal: space.side, marginTop: space.s, paddingHorizontal: space.l, paddingVertical: space.s + 2, borderRadius: radius.row },
  badgeRow: { position: 'absolute', top: -14, left: -space.s, right: -space.s, alignItems: 'center' },
  badgeWrap: { padding: 3, borderRadius: 999 },
  badge: { borderRadius: 999, borderWidth: 2, paddingHorizontal: space.m, paddingVertical: 2, overflow: 'hidden' },
  wide: { alignSelf: 'stretch' },
  cardButtons: { gap: space.xs, marginTop: space.l },
  bottom: { gap: space.m, paddingHorizontal: space.side, paddingTop: space.s },
  sides: { flexDirection: 'row', gap: space.m, paddingTop: space.s },
  shade: { flex: 1 },
  sheet: { gap: space.s, paddingHorizontal: space.side, paddingTop: space.m, paddingBottom: space.xxl, borderTopLeftRadius: radius.big, borderTopRightRadius: radius.big },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: space.s },
});
