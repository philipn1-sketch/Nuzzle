import { PillButton, PrimaryButton, QuietButton, Screen, Stepper, T, TopBar, type } from 'nuzzle-design';

const noop = () => {};

/** A whole editor screen: top bar, body, main action at the bottom. */
export const EditFeed = () => (
  <div style={{ width: 390, height: 640, display: 'flex' }}>
    <Screen>
      <TopBar title="Edit feed" left={<PillButton label="Cancel" onPress={noop} />} />
      <div style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <T tone="muted" style={type.label}>Started at</T>
        <Stepper label="Start time" display="7:22 PM" onStep={noop} />
        <T tone="muted" style={type.label}>Left</T>
        <Stepper label="Minutes on the left" display="10 min" onStep={noop} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
        <PrimaryButton label="Save" onPress={noop} />
        <QuietButton label="Delete feed" onPress={noop} />
      </div>
    </Screen>
  </div>
);
