import { Card, Choice, T, type } from 'nuzzle-design';

const frame = { display: 'flex', flexDirection: 'column', padding: 20, width: 380 } as const;

/** The daily plan's switch, as it sits at the top of the plan screen. */
export const PlanSwitch = () => (
  <div style={frame}>
    <Card style={{ gap: 12 }}>
      <T style={type.body}>Follow a daily plan</T>
      <T tone="muted" style={type.label}>When it is on, Home shows what is next in the plan. Turn it off any time; the plan stays saved.</T>
      <Choice label="Follow a daily plan" value="on" onChange={() => {}} options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} />
    </Card>
  </div>
);

/** A summary card with a title and two facts. */
export const Facts = () => (
  <div style={frame}>
    <Card style={{ gap: 12 }}>
      <T style={type.title}>Today</T>
      <T tone="muted" style={type.label}>5 feeds · Left 46m · Right 38m · Bottles 90 ml</T>
      <T tone="muted" style={type.label}>5 nappies: 3 wet, 2 wet and dirty</T>
    </Card>
  </div>
);
