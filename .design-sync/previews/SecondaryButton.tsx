import { Card, SecondaryButton, T, type } from 'nuzzle-design';

const frame = { display: 'flex', flexDirection: 'column', padding: 20, width: 380 } as const;

/** Strong: the one action a card is about. */
export const Strong = () => (
  <div style={frame}>
    <Card style={{ gap: 12 }}>
      <T tone="muted" style={type.label}>Keep a backup online and share feeds with a second phone. No account needed.</T>
      <SecondaryButton strong label="Start backup and sharing" onPress={() => {}} />
      <SecondaryButton label="Join with a code" onPress={() => {}} />
    </Card>
  </div>
);

/** Plain, on the page. */
export const Plain = () => (
  <div style={frame}><SecondaryButton label="Keep sharing" onPress={() => {}} /></div>
);
