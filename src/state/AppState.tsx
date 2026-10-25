import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';

import {
  activeFeed, applyDraft, checkDraft, endSide, feedFromDraft, finishFeed, sideMs, tapSide, totalMs,
  type DraftProblem, type FeedDraft,
} from '../core/feeds';
import { amount, clockTime, mins, sideWord, timeOf } from '../core/format';
import { activeBaby, babyName, feedsOf, planReminder } from '../core/reminder';
import { migrateSettings } from '../core/settings';
import type { Baby, Feed, Settings, Side } from '../core/types';
import * as db from '../data/db';
import { tick } from '../services/haptics';
import * as notify from '../services/notify';

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
  permission: notify.Permission;
  /** When the phone actually has the next reminder queued, read back after scheduling. */
  scheduledAt: number | null;
  snack: Snack | null;
  /** The "Still feeding?" card was answered with Yes since the app last came to the front. */
  stillFeedingAnswered: boolean;
  tap: (side: Side) => void;
  done: () => Feed | null;
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
  hideSnack: () => void;
}

const Ctx = createContext<AppStateValue | null>(null);

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** The lock screen notice for a feed in progress. */
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

  /** Writes the changed feeds to the phone first, then shows them. A new feed belongs to the baby on screen. */
  const commit = useCallback((changed: Feed[], removedIds: string[] = []) => {
    const now = Date.now();
    const stamped = changed.map((f) => {
      const before = allRef.current.find((x) => x.id === f.id);
      const babyId = f.babyId ?? (before ? before.babyId : babyRef.current.id);
      return { ...f, ...(babyId ? { babyId } : {}), updatedAt: now };
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
    for (const b of settings.babies) {
      const mine = feedsOf(allFeeds, settings, b.id);
      const plan = planReminder(mine, settings, now, babyName(b));
      if (plan) plans.push({ babyId: b.id, ...plan });
      const a = activeFeed(mine);
      const text = a ? `${many ? `${babyName(b)}: ` : ''}${runningText(a)}` : null;
      notify.showRunningNotice(b.id, text).catch(() => {});
    }
    const clock = settings.clockReminders.map((c) => ({ ...c, body: `Your ${clockTime(c.hour, c.minute)} reminder.` }));
    notify
      .syncReminders(plans, clock)
      .then(() => notify.pendingReminderAt(baby.id))
      .then(setScheduledAt)
      .catch(() => setScheduledAt(null));
  }, [allFeeds, settings, baby.id, permission, foreground]);

  const lastTap = useRef({ side: 'L' as Side, at: 0 });

  const tap = useCallback(
    (side: Side) => {
      // half asleep, a double tap is one tap: ignore a second tap on the same side within 0.6 s
      if (lastTap.current.side === side && Date.now() - lastTap.current.at < 600) return;
      lastTap.current = { side, at: Date.now() };
      const before = activeFeed(feedsRef.current);
      const next = tapSide(before, side, Date.now(), newId);
      commit([next]);
      tick();
      if (!before) {
        showSnack(`Started on the ${sideWord(side)}.`, [
          {
            label: 'Undo',
            onPress: () => {
              const current = feedsRef.current.find((f) => f.id === next.id) ?? next;
              commit([], [next.id]);
              showSnack('Feed discarded.', [{ label: 'Undo', onPress: () => commit([current]) }]);
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

  const done = useCallback((): Feed | null => {
    const before = activeFeed(feedsRef.current);
    if (!before) return null;
    const now = Date.now();
    const saved = finishFeed(before, now);
    tick();
    if (!saved) {
      commit([], [before.id]);
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
    commit([], [before.id]);
    tick();
    showSnack('Feed discarded.', [{ label: 'Undo', onPress: () => commit([before]) }]);
  }, [commit, showSnack]);

  const keepFeeding = useCallback(() => setStillFeedingAnswered(true), []);

  const saveDraft = useCallback(
    (draft: FeedDraft, editingId: string | null): DraftProblem | null => {
      const now = Date.now();
      const original = editingId ? feedsRef.current.find((f) => f.id === editingId) : undefined;
      const feed = original ? applyDraft(original, draft, now) : feedFromDraft(draft, newId());
      const problem = checkDraft(draft, feed, feedsRef.current, now);
      if (problem) return problem;
      commit([feed]);
      if (original) showSnack(feed.bottle ? 'Bottle updated.' : 'Feed updated.');
      else if (feed.bottle) showSnack(`Bottle added. ${amount(feed.bottle.amountMl, settings.units)}.`);
      else showSnack(`Feed added. Ended on the ${sideWord(endSide(feed))}.`);
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

  const switchBaby = useCallback((id: string) => {
    setStillFeedingAnswered(false);
    setSnack(null);
    updateSettings({ activeBabyId: id });
  }, [updateSettings]);

  const addBaby = useCallback(() => {
    setSettings((s) => {
      const id = `b${Date.now().toString(36)}`;
      const next = { ...s, babies: [...s.babies, { id, name: '', birthday: null }], activeBabyId: id };
      db.putSettings(next);
      return next;
    });
  }, []);

  const updateBaby = useCallback((id: string, patch: Partial<Omit<Baby, 'id'>>) => {
    setSettings((s) => {
      const next = { ...s, babies: s.babies.map((b) => (b.id === id ? { ...b, ...patch } : b)) };
      db.putSettings(next);
      return next;
    });
  }, []);

  const removeBaby = useCallback((id: string) => {
    setSettings((s) => {
      if (s.babies.length < 2 || feedsOf(allRef.current, s, id).length > 0) return s;
      const babies = s.babies.filter((b) => b.id !== id);
      const next = { ...s, babies, activeBabyId: s.activeBabyId === id ? babies[0].id : s.activeBabyId };
      db.putSettings(next);
      return next;
    });
  }, []);

  const askReminders = useCallback(async () => {
    const p = await notify.askPermission().catch(() => 'denied' as const);
    setPermission(p);
    updateSettings({ reminderAsked: true, remindersOn: true });
  }, [updateSettings]);

  const value = useMemo<AppStateValue>(
    () => ({
      feeds, allFeeds, settings, baby, permission, scheduledAt, snack, stillFeedingAnswered,
      tap, done, discard, keepFeeding, saveDraft, remove, updateSettings, switchBaby, addBaby, updateBaby, removeBaby, askReminders, hideSnack,
    }),
    [feeds, allFeeds, settings, baby, permission, scheduledAt, snack, stillFeedingAnswered, tap, done, discard, keepFeeding, saveDraft, remove,
      updateSettings, switchBaby, addBaby, updateBaby, removeBaby, askReminders, hideSnack],
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
