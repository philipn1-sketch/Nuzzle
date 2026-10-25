// Copies the Siri shortcuts (native/NuzzleIntents.swift) into the app target at prebuild, so they live in git
// outside the generated ios folder. App Intents have to be compiled into the app itself for Siri to find them.
const fs = require('fs');
const path = require('path');
const { IOSConfig, withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const FILE = 'NuzzleIntents.swift';

module.exports = function withNuzzleIntents(config) {
  config = withDangerousMod(config, [
    'ios',
    (c) => {
      const name = IOSConfig.XcodeUtils.sanitizedName(c.modRequest.projectName ?? c.name);
      fs.copyFileSync(path.join(c.modRequest.projectRoot, 'native', FILE), path.join(c.modRequest.platformProjectRoot, name, FILE));
      return c;
    },
  ]);
  return withXcodeProject(config, (c) => {
    const name = IOSConfig.XcodeUtils.sanitizedName(c.modRequest.projectName ?? c.name);
    const filePath = `${name}/${FILE}`;
    if (!c.modResults.hasFile(filePath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath: filePath, groupName: name, project: c.modResults });
    }
    return c;
  });
};
