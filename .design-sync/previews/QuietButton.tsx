import { QuietButton } from 'nuzzle-design';

const col = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 20, width: 380 } as const;

/** Links to other screens, in ink, ending with ›. */
export const Links = () => (
  <div style={col}>
    <QuietButton tone="ink" label="Add pumping ›" onPress={() => {}} />
    <QuietButton tone="ink" label="Daily plan ›" onPress={() => {}} />
    <QuietButton tone="ink" label="Add a weight ›" onPress={() => {}} />
  </div>
);

/** Quiet actions, muted. */
export const Quiet = () => (
  <div style={col}>
    <QuietButton label="Discard this feed" onPress={() => {}} />
    <QuietButton label="Delete" onPress={() => {}} />
  </div>
);
