import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';

import { REMINDER_DEFAULT_MIN } from '../config';
import {
  activeFeed, applyDraft, checkDraft, endSide, feedFromDraft, feedStart, finishFeed, sideMs, tapSide, totalMs,
  type DraftProblem, type FeedDraft,
} from '../core/feeds';
import { mins, sideName, sideWord, timeOf } from '../core/format';
import { planReminder } from '../core/reminder';
import type { Feed, Settings, Side } from '../core/types';
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

const DEFAULT_SETTINGS: Settings = {
  babyName: '',
  remindersOn: true,
  intervalMin: REMINDER_DEFAULT_MIN,
  theme: 'night',
  reminderAsked: false,
};

interface AppStateValue {
  feeds: Feed[];
  settings: Settings;
  permission: notify.Permission;
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
  askReminders: () => Promise<void>;
  hideSnack: () => void;
}

const Ctx = createContext<AppStateValue | null>(null);

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** The lock screen notice for a feed in progress. */
function runningText(f: Feed): string {
  const now = Date.now();
  if (f.status === 'paused') {
    return `Feed paused. Left ${mins(sideMs(f, 'L', now))}m, right ${mins(sideMs(f, 'R', now))}m.`;
  }
  return `Feeding on the ${sideWord(endSide(f))} since ${timeOf(feedStart(f))}.`;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [feeds, setFeeds] = useState<Feed[]>(() => db.loadFeeds());
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...db.loadSettings() }));
  const [permission, setPermission] = useState<notify.Permission>('undetermined');
  const [snack, setSnack] = useState<Snack | null>(null);
  const [stillFeedingAnswered, setStillFeedingAnswered] = useState(false);
  const [foreground, setForeground] = useState(0);
  const snackId = useRef(0);

  // the latest feeds, for undo actions that run after later renders
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;

  /** Writes the changed feeds to the phone first, then shows them. */
  const commit = useCallback((changed: Feed[], removedIds: string[] = []) => {
    for (const f of changed) db.putFeed(f);
    for (const id of removedIds) db.removeFeed(id);
    const ids = new Set([...changed.map((f) => f.id), ...removedIds]);
    setFeeds([...feedsRef.current.filter((f) => !ids.has(f.id)), ...changed]);
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
    const plan = planReminder(feeds, settings, Date.now());
    notify.scheduleReminder(plan?.at ?? null, plan?.body ?? '').catch(() => {});
    const a = activeFeed(feeds);
    notify.showRunningNotice(a ? runningText(a) : null).catch(() => {});
  }, [feeds, settings, permission, foreground]);

  const tap = useCallback(
    (side: Side) => {
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
      const problem = checkDraft(draft, feedsRef.current, editingId, now);
      if (problem) return problem;
      const original = editingId ? feedsRef.current.find((f) => f.id === editingId) : undefined;
      const feed = original ? applyDraft(original, draft, now) : feedFromDraft(draft, newId());
      commit([feed]);
      showSnack(original ? 'Feed updated.' : `Feed added. ${sideName(endSide(feed))} side last.`);
      return null;
    },
    [commit, showSnack],
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

  const askReminders = useCallback(async () => {
    const p = await notify.askPermission().catch(() => 'denied' as const);
    setPermission(p);
    updateSettings({ reminderAsked: true, remindersOn: true });
  }, [updateSettings]);

  const value = useMemo<AppStateValue>(
    () => ({
      feeds, settings, permission, snack, stillFeedingAnswered,
      tap, done, discard, keepFeeding, saveDraft, remove, updateSettings, askReminders, hideSnack,
    }),
    [feeds, settings, permission, snack, stillFeedingAnswered, tap, done, discard, keepFeeding, saveDraft, remove, updateSettings, askReminders, hideSnack],
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
