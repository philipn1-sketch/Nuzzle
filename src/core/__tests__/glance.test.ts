import { feedFromDraft, tapSide } from '../feeds';
import { activityProps, glanceProps, waitingProps } from '../glance';
import type { Feed } from '../types';

const MIN = 60_000;
const T0 = new Date(2026, 9, 24, 3, 0, 0).getTime();
const id = () => 'r';

describe('widget and lock screen', () => {
  it('shows the last feed and the next side', () => {
    const f = feedFromDraft({ start: T0, leftMin: 10, rightMin: 8, endedOn: 'L' }, 'a');
    expect(glanceProps([f], 'Daphne', 'ml', T0 + 60 * MIN)).toEqual({
      name: 'Daphne', lastStart: T0, lastLine: 'Ended on the left', next: 'Right', letter: 'R', feeding: '', timerFrom: 0, pausedAt: 0,
      dueAt: T0 + 120 * MIN, windowText: '2h',
    });
    expect(glanceProps([], 'Baby', 'ml', T0)).toMatchObject({ lastStart: 0, lastLine: '', next: '', dueAt: 0 });
    expect(glanceProps([f], 'Daphne', 'ml', T0, 165)).toMatchObject({ dueAt: T0 + 165 * MIN, windowText: '2h 45m' });
  });

  it('counts up from a point that leaves pauses out, and stops while paused', () => {
    let f: Feed = tapSide(null, 'L', T0, id);
    f = tapSide(f, 'L', T0 + 5 * MIN, id); // pause after 5 minutes
    const paused = activityProps(f, 'Baby', T0 + 9 * MIN);
    expect(paused).toMatchObject({ status: 'Paused on the left', letter: 'L', pausedAt: T0 + 5 * MIN });
    expect(paused.pausedAt - paused.timerFrom).toBe(5 * MIN);
    f = tapSide(f, 'R', T0 + 10 * MIN, id); // carry on, on the right
    const running = activityProps(f, 'Baby', T0 + 12 * MIN);
    expect(running).toMatchObject({ status: 'Feeding on the right', letter: 'R', pausedAt: 0 });
    // at 12 minutes she has fed 5 + 2 = 7 minutes
    expect(T0 + 12 * MIN - running.timerFrom).toBe(7 * MIN);
    expect(glanceProps([f], 'Baby', 'ml', T0 + 12 * MIN).feeding).toBe('Feeding on the right');
  });
});

describe('the lock screen between feeds', () => {
  it('counts up from the last feed and names the side to start on', () => {
    const start = new Date(2026, 9, 20, 9, 0).getTime();
    const feeds: Feed[] = [{ id: 'a', status: 'saved', deletedAt: null, segments: [{ side: 'L', start, end: start + 10 * 60_000 }] }];
    const w = waitingProps(feeds, 'Daphne');
    expect(w).toMatchObject({ mode: 'waiting', lastStart: start, letter: 'R', status: 'Start on the right' });
  });
  it('shows nothing before the first feed or while one is running', () => {
    expect(waitingProps([], 'Daphne')).toBeNull();
    const running: Feed[] = [{ id: 'b', status: 'running', deletedAt: null, segments: [{ side: 'L', start: 1, end: null }] }];
    expect(waitingProps(running, 'Daphne')).toBeNull();
  });
});
