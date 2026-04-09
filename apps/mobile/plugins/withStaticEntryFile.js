const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withStaticEntryFile(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Replace the Expo "resolveAppEntry" exec with a stable entry file.
    // This prevents Gradle from executing node during configuration phase.
    contents = contents.replace(
      /entryFile\s*=\s*file\(\s*\[[^\]]*resolveAppEntry[^\]]*\][^\)]*\)\s*/m,
      `entryFile = file("index.js")\n`
    );

    config.modResults.contents = contents;
    return config;
  });
};