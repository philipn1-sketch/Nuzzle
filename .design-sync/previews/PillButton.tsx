import { PillButton } from 'nuzzle-design';

const row = { display: 'flex', gap: 8, padding: 20, width: 380, flexWrap: 'wrap' } as const;

/** Quick logging under the ring on Home. */
export const QuickLog = () => (
  <div style={row}>
    <PillButton label="Bottle" a11yLabel="Log a bottle" onPress={() => {}} />
    <PillButton label="Nappy" a11yLabel="Log a nappy" onPress={() => {}} />
    <PillButton label="Sleep" a11yLabel="Start a sleep" onPress={() => {}} />
  </div>
);

/** Top bar buttons. */
export const Navigation = () => (
  <div style={row}>
    <PillButton label="Back" onPress={() => {}} />
    <PillButton label="Cancel" onPress={() => {}} />
    <PillButton label="Settings" onPress={() => {}} />
    <PillButton label="Skip" onPress={() => {}} />
  </div>
);
