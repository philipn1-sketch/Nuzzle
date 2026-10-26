import { NuzzleTheme, PrimaryButton } from 'nuzzle-design';

const frame = { display: 'flex', flexDirection: 'column', padding: 20, width: 380 } as const;

/** Ending a feed. */
export const Done = () => <div style={frame}><PrimaryButton label="Done" onPress={() => {}} /></div>;

/** Saving an edit. */
export const Save = () => <div style={frame}><PrimaryButton label="Save" onPress={() => {}} /></div>;

/** Day theme. */
export const Day = () => (
  <NuzzleTheme theme="day"><div style={frame}><PrimaryButton label="Add a feed" onPress={() => {}} /></div></NuzzleTheme>
);
