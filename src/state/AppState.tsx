import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';

import {
  activeFeed, applyDraft, feedStart, lastSaved, checkDraft, endSide, feedFromDraft, finishFeed, fitToNow, runningSide, sideMs, tapSide, totalMs,
  type DraftProblem, type FeedDraft,
} from '../core/feeds';
import { planFeedAlerts, planIsOn } from '../core/plan';
import { amount, clockTime, mins, sideWord, timeOf } from '../core/format';
import { activeBaby, babyName, feedsOf, planReminder } from '../core/reminder';
import { migrateSettings } from '../core/settings';
import type { Baby, Entry, Feed, Nappy, Settings, Side } from '../core/types';
import { checkEntry, entriesOf, inQuiet, nappyWord, runningSleep, sleepMs, startSleep as newSleep, wakeUp, type EntryProblem } from '../core/entries';
import { span } from '../core/format';
import { activityProps, glanceProps } from '../core/glance';
import * as db from '../data/db';
import * as glance from '../services/glance';
import * as nuzzleNative from '../../modules/nuzzle-native';
import { mergeBabies, mergeFeeds, unsent, withNewerPlans } from '../core/sync';
import { syncAvailable, syncWithServer } from '../services/sync';
import { tick } from '../services/haptics';
import * as notify from '../services/notify';

/** Keeps plan reminders well inside the 64 notifications an iPhone holds, even with twins. */
const PLAN_ALERTS_PER_BABY = 20;

export interface SnackAction {
  label: string;
  onPress: () => void;
}
export interface Snack {
  id: number;
  message: string;
  actions: SnackAction[];
}

interface AppStateValue {
  /** The feeds of the baby being shown. */
  feeds: Feed[];
  /** Every baby's feeds, for the export. */
  allFeeds: Feed[];
  settings: Settings;
  baby: Baby;
  /** Nappies, pumping, growth and sleep for the baby being shown (pumping for every baby). */
  entries: Entry[];
  allEntries: Entry[];
  /** Saves a new or edited entry; returns a problem to show instead when it can't be saved. */
  saveEntry: (e: Entry) => EntryProblem | null;
  removeEntry: (id: string) => void;
  /** One tap from Home. */
  logNappy: (n: Nappy, at?: number) => void;
  /** Starts a sleep, or wakes her when one is running. */
  toggleSleep: () => void;
  permission: notify.Permission;
  /** When the phone actually has the next reminder queued, read back after scheduling. */
  scheduledAt: number | null;
  snack: Snack | null;
  /** The "Still feeding?" card was answered with Yes since the app last came to the front. */
  stillFeedingAnswered: boolean;
  /** A tap on a side. `at` is when it happened, for taps passed on from the Watch. */
  tap: (side: Side, at?: number) => void;
  /** Starts, switches to or carries on with a side, but never pauses: for Siri. */
  startOn: (side: Side) => void;
  done: (at?: number) => Feed | null;
  discard: () => void;
  keepFeeding: () => void;
  saveDraft: (draft: FeedDraft, editingId: string | null) => DraftProblem | null;
  remove: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  switchBaby: (id: string) => void;
  addBaby: () => void;
  updateBaby: (id: string, patch: Partial<Omit<Baby, 'id'>>) => void;
  /** Only a baby with no feeds can be removed, so nothing is ever lost. */
  removeBaby: (id: string) => void;
  askReminders: () => Promise<void>;
  /** Asks for notifications without changing which reminders are on. */
  askNotifications: () => Promise<void>;
  sync: SyncStatus;
  /** Starts sharing with a new family code, or joins one typed in from the other phone. */
  startSync: (code: string, joining: boolean) => void;
  stopSync: () => void;
  syncNow: () => void;
  hideSnack: () => void;
}

export interface SyncStatus {
  /** Off when the app was built without the online copy's address. */
  available: boolean;
  code: string | null;
  state: 'off' | 'syncing' | 'ok' | 'offline';
  lastOk: number | null;
}

/** How far this phone has got, kept apart from settings so syncing doesn't re-run reminders. */
interface SyncProgress {
  code: string;
  /** The server's change counter at the last pull. */
  since: number;
  /** Local time the last successful send began: anything changed after it is sent next time. */
  sentAt: number;
  lastOk: number | null;
}

const SYNC_EVERY_MS = 20_000;

const Ctx = createContext<AppStateValue | null>(null);

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** The lock screen notice for a feed in progress. */
/** Whether a baby has anything logged: such a baby is never removed or dropped. */
export function hasData(feeds: Feed[], entries: Entry[], s: Settings, babyId: string): boolean {
  return feedsOf(feeds, s, babyId).some((f) => f.deletedAt === null) || entriesOf(entries, s, babyId).some((e) => e.kind !== 'pump' && e.deletedAt === null);
}

/** A time passed on from the Watch, kept between the start of the current stretch and now. */
function clampAt(active: Feed | null, at: number | undefined): number {
  const now = Date.now();
  if (typeof at !== 'number' || !Number.isFinite(at)) return now;
  if (!active) return Math.min(at, now);
  const last = active.segments[active.segments.length - 1];
  return Math.min(now, Math.max(at, last.end ?? last.start));
}

function runningText(f: Feed): string {
  const now = Date.now();
  if (f.status === 'paused') {
    return `Paused on the ${sideWord(endSide(f))}. Left ${mins(sideMs(f, 'L', now))}m, right ${mins(sideMs(f, 'R', now))}m.`;
  }
  return `Feeding on the ${sideWord(endSide(f))} since ${timeOf(f.segments[f.segments.length - 1].start)}.`;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [allFeeds, setAllFeeds] = useState<Feed[]>(() => db.loadFeeds());
  const [settings, setSettings] = useState<Settings>(() => migrateSettings(db.loadSettings()));
  const baby = activeBaby(settings);
  const feeds = useMemo(() => feedsOf(allFeeds, settings, baby.id), [allFeeds, settings, baby.id]);
  const [allEntries, setAllEntries] = useState<Entry[]>(() => db.loadEntries());
  const entries = useMemo(() => entriesOf(allEntries, settings, baby.id), [allEntries, settings, baby.id]);
  const [permission, setPermission] = useState<notify.Permission>('undetermined');
  const [snack, setSnack] = useState<Snack | null>(null);
  const [scheduledAt, setScheduledAt] = useState<number | null>(null);
  const [stillFeedingAnswered, setStillFeedingAnswered] = useState(false);
  const [foreground, setForeground] = useState(0);
  const snackId = useRef(0);

  // the latest feeds, for undo actions that run after later renders
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;
  const allRef = useRef(allFeeds);
  allRef.current = allFeeds;
  const babyRef = useRef(baby);
  babyRef.current = baby;
  const allEntriesRef = useRef(allEntries);
  allEntriesRef.current = allEntries;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  /** Writes the changed feeds to the phone first, then shows them. A new feed belongs to the baby on screen. */
  const commit = useCallback((changed: Feed[], removedIds: string[] = []) => {
    const now = Date.now();
    const stamped = changed.map((f) => {
      const before = allRef.current.find((x) => x.id === f.id);
      const babyId = f.babyId ?? (before ? before.babyId : babyRef.current.id);
      return { ...f, ...(babyId ? { babyId } : {}), updatedAt: Math.max(now, (before?.updatedAt ?? 0) + 1) };
    });
    for (const f of stamped) db.putFeed(f);
    for (const id of removedIds) db.removeFeed(id);
    const ids = new Set([...stamped.map((f) => f.id), ...removedIds]);
    const next = [...allRef.current.filter((f) => !ids.has(f.id)), ...stamped];
    allRef.current = next;
    setAllFeeds(next);
  }, []);

  const showSnack = useCallback((message: string, actions: SnackAction[] = []) => {
    snackId.current += 1;
    setSnack({ id: snackId.current, message, actions });
  }, []);
  const hideSnack = useCallback(() => setSnack(null), []);

  useEffect(() => {
    notify.setUpNotifications().catch(() => {});
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') {
        glance.resend();
        setForeground((n) => n + 1);
        setStillFeedingAnswered(false);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    notify.permission().then(setPermission).catch(() => {});
  }, [foreground]);

  // The reminder and the lock screen notice always follow the stored feeds. Running this whenever the
  // feeds, settings or permission change, and whenever the app comes back, means a restart can't lose them.
  useEffect(() => {
    const now = Date.now();
    const many = settings.babies.length > 1;
    const plans: notify.Planned[] = [];
    const notices: { babyId: string; text: string | null }[] = [];
    for (const b of settings.babies) {
      const mine = feedsOf(allFeeds, settings, b.id);
      const plan = planReminder(mine, settings, now, babyName(b));
      if (plan) plans.push({ babyId: b.id, ...plan, silent: inQuiet(plan.at, settings.quiet) });
      const a = activeFeed(mine);
      notices.push({ babyId: b.id, text: a ? `${many ? `${babyName(b)}: ` : ''}${runningText(a)}` : null });
    }
    // the home screen widget follows the baby on screen; the lock screen timer follows a running feed
    const shown = glanceProps(feedsOf(allFeeds, settings, baby.id), babyName(baby), settings.units, now, settings.intervalMin);
    const others = settings.babies
      .filter((b) => b.id !== baby.id)
      .map((b) => ({ ...glanceProps(feedsOf(allFeeds, settings, b.id), babyName(b), settings.units, now, settings.intervalMin), babyId: b.id }));
    glance.updateWidget({ babies: [{ ...shown, babyId: baby.id }, ...others] });
    glance.offerBabies(settings.babies);
    // the same numbers go to the Watch and to Siri
    nuzzleNative.setGlance(JSON.stringify(shown));
    const timing = [baby, ...settings.babies]
      .map((b) => ({ b, a: activeFeed(feedsOf(allFeeds, settings, b.id)) }))
      .find((x) => x.a !== null);
    glance
      .syncActivity(timing?.a ? activityProps(timing.a, babyName(timing.b), now) : null)
      .then((shown) => {
        // the lock screen timer replaces the plain notice; the notice stays for when Live Activities are off
        for (const n of notices) {
          notify.showRunningNotice(n.babyId, shown && n.babyId === timing?.b.id ? null : n.text).catch(() => {});
        }
      })
      .catch(() => {});
    const clock = settings.clockReminders.map((c) => ({
      ...c,
      body: `Your ${clockTime(c.hour, c.minute)} reminder.`,
      silent: inQuiet(new Date(2000, 0, 1, c.hour, c.minute).getTime(), settings.quiet),
    }));
    // feed times from a plan she follows, for the next two days, skipping any she has just fed for
    // and any where one of her own daily reminders already rings
    const planFeeds: notify.Planned[] = [];
    for (const b of settings.babies) {
      const plan = b.plan;
      if (!planIsOn(plan) || !settings.planReminders?.includes(b.id)) continue;
      const mine = feedsOf(allFeeds, settings, b.id);
      const latest = activeFeed(mine) ?? lastSaved(mine);
      const interval = plans.find((x) => x.babyId === b.id)?.at;
      for (const at of planFeedAlerts(plan, now, latest ? feedStart(latest) : null).slice(0, PLAN_ALERTS_PER_BABY)) {
        const d = new Date(at);
        if (settings.clockReminders.some((c) => c.hour === d.getHours() && c.minute === d.getMinutes())) continue;
        // the feed reminder already rings about then
        if (interval !== undefined && Math.abs(interval - at) < 15 * 60_000) continue;
        planFeeds.push({ babyId: b.id, at, body: many ? `Feed time in ${babyName(b)}'s plan.` : 'Feed time in the plan.', silent: inQuiet(at, settings.quiet) });
      }
    }
    notify
      .syncReminders(plans, clock, planFeeds)
      .then(() => notify.pendingReminderAt(baby.id))
      .then(setScheduledAt)
      .catch(() => setScheduledAt(null));
  }, [allFeeds, settings, baby.id, permission, foreground]);

  const lastTap = useRef({ side: 'L' as Side, at: 0 });

  const tap = useCallback(
    (side: Side, at?: number) => {
      // half asleep, a double tap is one tap: ignore a second tap on the same side within 0.6 s
      if (lastTap.current.side === side && Date.now() - lastTap.current.at < 600) return;
      lastTap.current = { side, at: Date.now() };
      const before = activeFeed(feedsRef.current);
      const next = tapSide(before, side, clampAt(before, at), newId);
      commit([next]);
      tick();
      if (!before) {
        showSnack(`Started on the ${sideWord(side)}.`, [
          {
            label: 'Undo',
            onPress: () => {
              const current = feedsRef.current.find((f) => f.id === next.id) ?? next;
              // kept as deleted, not erased, so the other phone hears it was thrown away
              commit([{ ...current, deletedAt: Date.now() }]);
              showSnack('Feed discarded.', [{ label: 'Undo', onPress: () => commit([{ ...current, deletedAt: null }]) }]);
            },
          },
        ]);
      } else {
        // a switch or pause makes the "Started" snackbar out of date
        setSnack(null);
      }
    },
    [commit, showSnack],
  );

  const startOn = useCallback(
    (side: Side) => {
      const a = activeFeed(feedsRef.current);
      if (a && runningSide(a) === side) return;
      tap(side);
    },
    [tap],
  );

  const done = useCallback((at?: number): Feed | null => {
    const before = activeFeed(feedsRef.current);
    if (!before) return null;
    const now = clampAt(before, at);
    const saved = finishFeed(before, now);
    tick();
    if (!saved) {
      commit([{ ...before, deletedAt: Date.now() }]);
      showSnack('That was under five seconds, so it was not saved.');
      return null;
    }
    commit([saved]);
    showSnack(`Saved. ${mins(totalMs(saved, now))} min, ended on the ${sideWord(endSide(saved))}.`, [
      // puts the feed back exactly as it was when Done was tapped
      { label: 'Undo', onPress: () => commit([before]) },
      { label: 'Edit', onPress: () => router.push(`/feed/${saved.id}`) },
    ]);
    return saved;
  }, [commit, showSnack]);

  const discard = useCallback(() => {
    const before = activeFeed(feedsRef.current);
    if (!before) return;
    commit([{ ...before, deletedAt: Date.now() }]);
    tick();
    showSnack('Feed discarded.', [{ label: 'Undo', onPress: () => commit([before]) }]);
  }, [commit, showSnack]);

  const keepFeeding = useCallback(() => setStillFeedingAnswered(true), []);

  const saveDraft = useCallback(
    (draft: FeedDraft, editingId: string | null): DraftProblem | null => {
      const now = Date.now();
      const original = editingId ? feedsRef.current.find((f) => f.id === editingId) : undefined;
      const build = (d: FeedDraft) => (original ? applyDraft(original, d, now) : feedFromDraft(d, newId()));
      let feed = build(draft);
      let problem = checkDraft(draft, feed, feedsRef.current, now);
      let moved = '';
      if (problem === 'ends-later') {
        // she typed how long it lasted: it started earlier than shown, so it ends now
        const fitted = fitToNow(draft, now);
        if (fitted) {
          feed = build(fitted);
          problem = checkDraft(fitted, feed, feedsRef.current, now);
          moved = ` Start moved to ${timeOf(fitted.start)} so it ends now.`;
        }
      }
      if (problem) return problem;
      commit([feed]);
      if (original) showSnack(`${feed.bottle ? 'Bottle updated.' : 'Feed updated.'}${moved}`);
      else if (feed.bottle) showSnack(`Bottle added. ${amount(feed.bottle.amountMl, settings.units)}.`);
      else showSnack(`Feed added. Ended on the ${sideWord(endSide(feed))}.${moved}`);
      return null;
    },
    [commit, showSnack, settings.units],
  );

  const remove = useCallback(
    (id: string) => {
      const f = feedsRef.current.find((x) => x.id === id);
      if (!f) return;
      commit([{ ...f, deletedAt: Date.now() }]);
      showSnack('Feed deleted.', [{ label: 'Undo', onPress: () => commit([{ ...f, deletedAt: null }]) }]);
    },
    [commit, showSnack],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      db.putSettings(next);
      return next;
    });
  }, []);

  // Taps made on the Watch, including any that arrived before the app was listening
  const watchRef = useRef({ tap, done });
  watchRef.current = { tap, done };
  useEffect(() => {
    const apply = (a: nuzzleNative.WatchAction) => {
      if (a.action === 'L' || a.action === 'R') watchRef.current.tap(a.action, a.at);
      else if (a.action === 'done') watchRef.current.done(a.at);
    };
    const sub = nuzzleNative.onWatchAction(apply);
    nuzzleNative.takePendingActions().forEach(apply);
    return () => sub.remove();
  }, [foreground]);

  const switchBaby = useCallback((id: string) => {
    setStillFeedingAnswered(false);
    setSnack(null);
    updateSettings({ activeBabyId: id });
  }, [updateSettings]);

  const addBaby = useCallback(() => {
    setSettings((s) => {
      const id = `b${Date.now().toString(36)}`;
      const next = { ...s, babies: [...s.babies, { id, name: '', birthday: null }], activeBabyId: id, babiesUpdatedAt: Date.now() };
      db.putSettings(next);
      return next;
    });
  }, []);

  const updateBaby = useCallback((id: string, patch: Partial<Omit<Baby, 'id'>>) => {
    setSettings((s) => {
      const next = { ...s, babies: s.babies.map((b) => (b.id === id ? { ...b, ...patch } : b)), babiesUpdatedAt: Date.now() };
      db.putSettings(next);
      return next;
    });
  }, []);

  const removeBaby = useCallback((id: string) => {
    setSettings((s) => {
      if (s.babies.length < 2 || hasData(allRef.current, allEntriesRef.current, s, id)) return s;
      const babies = s.babies.filter((b) => b.id !== id);
      const next = { ...s, babies, activeBabyId: s.activeBabyId === id ? babies[0].id : s.activeBabyId, babiesUpdatedAt: Date.now() };
      db.putSettings(next);
      return next;
    });
  }, []);

  // ---------- nappies, pumping, growth, sleep ----------

  /** Writes changed entries to the phone first, then shows them. A new entry belongs to the baby on screen. */
  const commitEntries = useCallback((changed: Entry[], removedIds: string[] = []) => {
    const now = Date.now();
    const stamped = changed.map((e) => {
      const before = allEntriesRef.current.find((x) => x.id === e.id);
      const babyId = e.kind === 'pump' ? undefined : (e.babyId ?? before?.babyId ?? babyRef.current.id);
      return { ...e, ...(babyId ? { babyId } : {}), updatedAt: Math.max(now, (before?.updatedAt ?? 0) + 1) };
    });
    for (const e of stamped) db.putEntry(e);
    for (const id of removedIds) db.removeEntry(id);
    const ids = new Set([...stamped.map((e) => e.id), ...removedIds]);
    const next = [...allEntriesRef.current.filter((e) => !ids.has(e.id)), ...stamped];
    allEntriesRef.current = next;
    setAllEntries(next);
  }, []);

  const saveEntry = useCallback(
    (e: Entry): EntryProblem | null => {
      const problem = checkEntry(e, Date.now());
      if (problem) return problem;
      const existed = allEntriesRef.current.some((x) => x.id === e.id);
      commitEntries([e]);
      const words = { nappy: 'Nappy', pump: 'Pumping', growth: 'Measurement', sleep: 'Sleep' }[e.kind];
      showSnack(`${words} ${existed ? 'updated' : 'saved'}.`);
      return null;
    },
    [commitEntries, showSnack],
  );

  const removeEntry = useCallback(
    (id: string) => {
      const e = allEntriesRef.current.find((x) => x.id === id);
      if (!e) return;
      commitEntries([{ ...e, deletedAt: Date.now() }]);
      showSnack('Deleted.', [{ label: 'Undo', onPress: () => commitEntries([{ ...e, deletedAt: null }]) }]);
    },
    [commitEntries, showSnack],
  );

  const logNappy = useCallback(
    (n: Nappy, at?: number) => {
      const e: Entry = { id: newId(), type: 'entry', kind: 'nappy', nappy: n, at: Math.min(at ?? Date.now(), Date.now()), deletedAt: null };
      commitEntries([e]);
      tick();
      showSnack(`${nappyWord(n)} nappy at ${timeOf(e.at)}.`, [
        { label: 'Undo', onPress: () => commitEntries([{ ...e, deletedAt: Date.now() }]) },
        { label: 'Edit', onPress: () => router.push(`/entry/${e.id}`) },
      ]);
    },
    [commitEntries, showSnack],
  );

  const toggleSleep = useCallback(() => {
    const now = Date.now();
    const running = runningSleep(entriesOf(allEntriesRef.current, settingsRef.current, babyRef.current.id));
    tick();
    if (running) {
      const woke = wakeUp(running, now);
      commitEntries([woke]);
      showSnack(`Awake. Slept ${span(sleepMs(woke, now))}.`, [
        { label: 'Undo', onPress: () => commitEntries([running]) },
        { label: 'Edit', onPress: () => router.push(`/entry/${woke.id}`) },
      ]);
    } else {
      const s = newSleep(now, newId());
      commitEntries([s]);
      showSnack('Sleep started.', [{ label: 'Undo', onPress: () => commitEntries([{ ...s, deletedAt: Date.now() }]) }]);
    }
  }, [commitEntries, showSnack]);

  // ---------- sync ----------

  const [progress, setProgress] = useState<SyncProgress | null>(() => db.getValue<SyncProgress>('sync'));
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [syncState, setSyncState] = useState<SyncStatus['state']>(progress ? 'syncing' : 'off');
  const busy = useRef(false);
  const again = useRef(false);

  const saveProgress = (p: SyncProgress | null) => {
    db.setValue('sync', p);
    progressRef.current = p;
    setProgress(p);
  };

  /** Changes from the other phone go straight in, keeping their own change times. */
  const takeIn = useCallback((remote: (Feed | Entry)[]) => {
    const isEntry = (x: Feed | Entry): x is Entry => (x as Entry).type === 'entry';
    const changed = mergeFeeds(allRef.current, remote.filter((x): x is Feed => !isEntry(x)));
    if (changed.length > 0) {
      for (const f of changed) db.putFeed(f);
      const ids = new Set(changed.map((f) => f.id));
      const next = [...allRef.current.filter((f) => !ids.has(f.id)), ...changed];
      allRef.current = next;
      setAllFeeds(next);
    }
    const changedEntries = mergeFeeds(allEntriesRef.current, remote.filter(isEntry));
    if (changedEntries.length > 0) {
      for (const e of changedEntries) db.putEntry(e);
      const ids = new Set(changedEntries.map((e) => e.id));
      const next = [...allEntriesRef.current.filter((e) => !ids.has(e.id)), ...changedEntries];
      allEntriesRef.current = next;
      setAllEntries(next);
    }
  }, []);

  const runSync = useCallback(async () => {
    const p = progressRef.current;
    if (!p || !syncAvailable) return;
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    setSyncState('syncing');
    const startedAt = Date.now();
    const s = settingsRef.current;
    try {
      // a little overlap, so a change saved by the other phone at the same moment is never skipped
      const outgoing = [...unsent(allRef.current, p.sentAt), ...unsent(allEntriesRef.current, p.sentAt)];
      const reply = await syncWithServer(p.code, outgoing, s.babies, s.babiesUpdatedAt ?? 0, Math.max(0, p.since - 100));
      if (progressRef.current?.code !== p.code) return; // stopped or changed while this was running
      takeIn(reply.feeds);
      const babies = mergeBabies(settingsRef.current.babiesUpdatedAt ?? 0, reply.babies, reply.babiesUpdated);
      if (babies) {
        setSettings((cur) => {
          const kept = cur.babies.filter((b) => !babies.some((r) => r.id === b.id) && hasData(allRef.current, allEntriesRef.current, cur, b.id));
          const merged = withNewerPlans(babies, cur.babies);
          const list = [...merged.list, ...kept];
          const next = {
            ...cur, babies: list, babiesUpdatedAt: kept.length || merged.kept ? Date.now() : reply.babiesUpdated,
            activeBabyId: list.some((b) => b.id === cur.activeBabyId) ? cur.activeBabyId : list[0].id,
          };
          db.putSettings(next);
          return next;
        });
      }
      saveProgress({ code: p.code, since: reply.seq, sentAt: startedAt, lastOk: Date.now() });
      setSyncState('ok');
    } catch {
      setSyncState('offline');
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        runSync();
      }
    }
  }, [takeIn]);

  // send soon after any change here, check for the other phone's changes regularly while open
  useEffect(() => {
    if (!progress) return;
    const t = setTimeout(runSync, 1500);
    return () => clearTimeout(t);
  }, [allFeeds, allEntries, settings.babies, progress?.code, runSync]);
  useEffect(() => {
    if (!progress) return;
    runSync();
    const t = setInterval(() => RNAppState.currentState === 'active' && runSync(), SYNC_EVERY_MS);
    return () => clearInterval(t);
  }, [foreground, progress?.code, runSync]);

  const startSync = useCallback((code: string, joining: boolean) => {
    // A new family takes this phone's babies. A phone joining takes the family's babies instead,
    // so a blank "Baby" here never overwrites her name there.
    setSettings((cur) => {
      // a phone joining got the code from somewhere it is already written down
      const next = { ...cur, babiesUpdatedAt: joining ? 0 : Date.now(), codeSaved: joining };
      db.putSettings(next);
      settingsRef.current = next;
      return next;
    });
    // from 0, so this phone sends everything it has and takes in everything already there
    saveProgress({ code, since: 0, sentAt: 0, lastOk: null });
    setSyncState('syncing');
  }, []);

  const stopSync = useCallback(() => {
    saveProgress(null);
    setSyncState('off');
  }, []);

  const sync = useMemo<SyncStatus>(
    () => ({ available: syncAvailable, code: progress?.code ?? null, state: progress ? syncState : 'off', lastOk: progress?.lastOk ?? null }),
    [progress, syncState],
  );

  const askNotifications = useCallback(async () => {
    const p = await notify.askPermission().catch(() => 'denied' as const);
    setPermission(p);
  }, []);

  const askReminders = useCallback(async () => {
    const p = await notify.askPermission().catch(() => 'denied' as const);
    setPermission(p);
    updateSettings({ reminderAsked: true, remindersOn: true });
  }, [updateSettings]);

  const value = useMemo<AppStateValue>(
    () => ({
      feeds, allFeeds, settings, baby, permission, scheduledAt, snack, stillFeedingAnswered,
      tap, startOn, done, discard, keepFeeding, saveDraft, remove, updateSettings, switchBaby, addBaby, updateBaby, removeBaby, askReminders, askNotifications, hideSnack,
      sync, startSync, stopSync, syncNow: runSync,
      entries, allEntries, saveEntry, removeEntry, logNappy, toggleSleep,
    }),
    [feeds, allFeeds, settings, baby, permission, scheduledAt, snack, stillFeedingAnswered, tap, startOn, done, discard, keepFeeding, saveDraft, remove,
      updateSettings, switchBaby, addBaby, updateBaby, removeBaby, askReminders, askNotifications, hideSnack, sync, startSync, stopSync, runSync,
      entries, allEntries, saveEntry, removeEntry, logNappy, toggleSleep],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppStateValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppStateProvider');
  return v;
}

/** Re-renders every `everyMs` so times stay fresh. The values themselves always come from stored timestamps. */
export function useNow(everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    const sub = RNAppState.addEventListener('change', (s) => s === 'active' && setNow(Date.now()));
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [everyMs]);
  return now;
}
