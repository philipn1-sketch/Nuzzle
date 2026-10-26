import { NuzzleTheme, PillButton, TopBar } from 'nuzzle-design';

const noop = () => {};
const frame = { display: 'flex', flexDirection: 'column', width: 390, paddingTop: 8 } as const;

/** Home: the baby's name, History and Settings. */
export const Home = () => (
  <div style={frame}>
    <TopBar title="Daphne" left={<PillButton label="History" onPress={noop} />} right={<PillButton label="Settings" onPress={noop} />} />
  </div>
);

/** A pushed screen: Back on the left, an action on the right. */
export const WithBack = () => (
  <div style={frame}>
    <TopBar title="History" left={<PillButton label="Back" onPress={noop} />} right={<PillButton label="Summary" onPress={noop} />} />
  </div>
);

/** A sheet: Cancel only. */
export const Sheet = () => (
  <div style={frame}>
    <TopBar title="Log a bottle" left={<PillButton label="Cancel" onPress={noop} />} />
  </div>
);

/** Day theme. */
export const Day = () => (
  <NuzzleTheme theme="day">
    <div style={frame}>
      <TopBar title="Settings" left={<PillButton label="Back" onPress={noop} />} />
    </div>
  </NuzzleTheme>
);
