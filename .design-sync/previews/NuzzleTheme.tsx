import { Card, Choice, NuzzleTheme, PrimaryButton, T, type } from 'nuzzle-design';

const sample = (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, width: 360 }}>
    <T style={type.title}>Reminders</T>
    <Card style={{ gap: 12 }}>
      <T tone="muted" style={type.label}>Remind me after a feed starts</T>
      <Choice label="Reminder" value="on" onChange={() => {}} options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} />
    </Card>
    <PrimaryButton label="Save" onPress={() => {}} />
  </div>
);

/** Night, the default: deep plum. */
export const Night = () => <NuzzleTheme theme="night">{sample}</NuzzleTheme>;

/** Day: blush. */
export const Day = () => <NuzzleTheme theme="day">{sample}</NuzzleTheme>;
