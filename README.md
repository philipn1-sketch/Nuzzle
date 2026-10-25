# Nuzzle

A calm breastfeeding tracker for iPhone, with a home and lock screen widget, a live lock screen timer,
an Apple Watch app, Siri shortcuts, and backup and sharing between two phones with a family code.

Built with Expo (React Native and TypeScript). Pip Flap lives in its own repository, Game.

* How to install and use it: [docs/guide.md](docs/guide.md)
* What it does and why: [docs/features.md](docs/features.md), [docs/flow.md](docs/flow.md), [docs/style.md](docs/style.md)
* Finishing the online backup: [docs/phase2-setup.md](docs/phase2-setup.md)

```
npm install
npm test            # logic tests
npx tsc --noEmit    # types
npm run check:dashes
npx expo run:ios --device --configuration Release
```
