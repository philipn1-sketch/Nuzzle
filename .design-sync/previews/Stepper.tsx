import { Stepper, T, type } from 'nuzzle-design';

const col = { display: 'flex', flexDirection: 'column', gap: 8, padding: 20, width: 380 } as const;
const noop = () => {};

/** A time. */
export const Time = () => (
  <div style={col}>
    <T tone="muted" style={type.label}>Started at</T>
    <Stepper label="Start time" display="7:22 PM" onStep={noop} />
  </div>
);

/** An amount she can also type. */
export const Amount = () => (
  <div style={col}>
    <T tone="muted" style={type.label}>Amount</T>
    <Stepper label="Amount" display="90 ml" numeric={90} onType={noop} onStep={noop} />
  </div>
);

/** A date that opens a calendar when the value is tapped. */
export const Birthday = () => (
  <div style={col}>
    <T tone="muted" style={type.label}>Birthday · 2 weeks 4 days old</T>
    <Stepper label="Birthday" display="Oct 8, 2026" onStep={noop} onPressValue={noop} />
  </div>
);
