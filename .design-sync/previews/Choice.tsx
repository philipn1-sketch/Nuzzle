import { Choice, NuzzleTheme } from 'nuzzle-design';

const frame = { display: 'flex', flexDirection: 'column', padding: 20, width: 380 } as const;
const noop = () => {};

/** On and Off. */
export const OnOff = () => (
  <div style={frame}><Choice label="Reminder" value="on" onChange={noop} options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} /></div>
);

/** Three options: the theme. */
export const Theme = () => (
  <div style={frame}>
    <Choice label="Theme" value="night" onChange={noop} options={[{ value: 'night', label: 'Night' }, { value: 'day', label: 'Day' }, { value: 'system', label: 'Phone' }]} />
  </div>
);

/** Units, second option chosen. */
export const Units = () => (
  <div style={frame}>
    <Choice label="Units" value="oz" onChange={noop} options={[{ value: 'ml', label: 'ml, kg, cm' }, { value: 'oz', label: 'oz, lb, in' }]} />
  </div>
);

/** Day theme. */
export const Day = () => (
  <NuzzleTheme theme="day">
    <div style={frame}><Choice label="Milk" value="breast" onChange={noop} options={[{ value: 'breast', label: 'Breast milk' }, { value: 'formula', label: 'Formula' }]} /></div>
  </NuzzleTheme>
);
