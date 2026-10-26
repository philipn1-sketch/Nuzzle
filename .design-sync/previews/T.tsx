import { NuzzleTheme, T, type } from 'nuzzle-design';

const col = { display: 'flex', flexDirection: 'column', gap: 10, padding: 20, width: 380 } as const;

/** The type scale, largest to smallest. */
export const Scale = () => (
  <div style={col}>
    <T style={type.timer}>12:48</T>
    <T style={type.answer}>2h 30m</T>
    <T style={type.side}>Left</T>
    <T style={type.title}>Daily plan</T>
    <T style={type.body}>Next feed in 30m · at 4:52 PM</T>
    <T tone="muted" style={type.label}>Since Daphne&apos;s last feed started</T>
    <T style={type.small}>Ended on the right</T>
  </div>
);

/** Tones: ink, muted, rose for Left and peach for Right. */
export const Tones = () => (
  <div style={col}>
    <T>Feeding on the left</T>
    <T tone="muted">Last feed at 1:52 PM · L 16m then R 6m</T>
    <T tone="accent">Left 14m</T>
    <T tone="peach">Right 8m</T>
  </div>
);

/** The same tones on the Day theme. */
export const DayTones = () => (
  <NuzzleTheme theme="day">
    <div style={col}>
      <T style={type.title}>Today</T>
      <T tone="muted" style={type.label}>5 feeds · Left 46m · Right 38m</T>
      <T tone="accent">Left 14m</T>
      <T tone="peach">Right 8m</T>
    </div>
  </NuzzleTheme>
);
