---
category: Layout
---
# Screen

A full phone screen: theme background, safe area padding top and bottom. Every page in Nuzzle is one `Screen` with a `TopBar` first, a scrolling body, and the main action pinned at the bottom in thumb reach.

```tsx
<Screen>
  <TopBar title="Settings" left={<PillButton label="Back" onPress={back} />} />
  <div style={{ flex: 1, overflowY: 'auto', padding: '0 var(--nz-space-side)', display: 'flex', flexDirection: 'column', gap: 'var(--nz-space-l)' }}>…</div>
  <div style={{ padding: '0 var(--nz-space-side)' }}><PrimaryButton label="Save" onPress={save} /></div>
</Screen>
```
