/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  name: 'NuzzleWatch',
  displayName: 'Nuzzle',
  bundleIdentifier: '.watchkitapp',
  deploymentTarget: '10.0',
  icon: '../../assets/icon.png',
  frameworks: ['SwiftUI', 'WatchConnectivity'],
  colors: {
    $accent: { color: '#A8456A', darkColor: '#EBA3B9' },
  },
};
