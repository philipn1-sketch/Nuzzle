import { palettes, Ring, T, type, wash } from 'nuzzle-design';

const n = palettes.night;
const frame = { padding: 20, display: 'flex', justifyContent: 'center', width: 360 } as const;

/** At rest: lilac, filling towards the next feed; time since the last feed inside. */
export const AtRest = () => (
  <div style={frame}>
    <Ring size={280} width={14} progress={0.83} color={n.muted} track={wash(n.muted, '33')}>
      <T tone="muted" style={type.label}>Since Daphne&apos;s last feed started</T>
      <T style={type.answer}>2h 30m</T>
      <T tone="peach" style={type.small}>Ended on the right</T>
    </Ring>
  </div>
);

/** Feeding on the left: a full rose circle with the timer. */
export const FeedingLeft = () => (
  <div style={frame}>
    <Ring size={280} width={14} progress={1} color={n.accent} track={wash(n.muted, '33')}>
      <T tone="muted" style={type.label}>Feeding on the left</T>
      <T style={type.timer}>12:04</T>
      <T tone="muted" style={type.label}>Started at 4:22 PM</T>
    </Ring>
  </div>
);

/** Feeding on the right: peach. */
export const FeedingRight = () => (
  <div style={frame}>
    <Ring size={280} width={14} progress={1} color={n.peach} track={wash(n.muted, '33')}>
      <T tone="muted" style={type.label}>Feeding on the right</T>
      <T style={type.timer}>3:20</T>
    </Ring>
  </div>
);
