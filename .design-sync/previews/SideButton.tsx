import { NuzzleTheme, SideButton } from 'nuzzle-design';

const pair = { display: 'flex', gap: 12, padding: 20, width: 380 } as const;
const noop = () => {};

/** Nothing running: Left is suggested because the last feed ended on the right. */
export const StartHere = () => (
  <div style={pair}>
    <SideButton side="L" state="suggested" ms={null} onPress={noop} />
    <SideButton side="R" state="rest" ms={null} onPress={noop} />
  </div>
);

/** Feeding on the left for 12 minutes; Right offers to switch. */
export const FeedingLeft = () => (
  <div style={pair}>
    <SideButton side="L" state="running" ms={12 * 60_000 + 4_000} onPress={noop} />
    <SideButton side="R" state="switch" ms={null} onPress={noop} />
  </div>
);

/** Switched to the right after 9 minutes on the left. */
export const FeedingRight = () => (
  <div style={pair}>
    <SideButton side="L" state="switch" ms={9 * 60_000} onPress={noop} />
    <SideButton side="R" state="running" ms={3 * 60_000 + 20_000} onPress={noop} />
  </div>
);

/** Paused on the right. */
export const Paused = () => (
  <div style={pair}>
    <SideButton side="L" state="switch" ms={9 * 60_000} onPress={noop} />
    <SideButton side="R" state="paused" ms={5 * 60_000} onPress={noop} />
  </div>
);

/** The same buttons in the Day theme. */
export const DayTheme = () => (
  <NuzzleTheme theme="day">
    <div style={pair}>
      <SideButton side="L" state="running" ms={7 * 60_000} onPress={noop} />
      <SideButton side="R" state="switch" ms={null} onPress={noop} />
    </div>
  </NuzzleTheme>
);
