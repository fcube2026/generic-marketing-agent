const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withStaticEntryFile(config) {
  return withAppBuildGradle(config, (config) => {
    const original = config.modResults.contents;

    const lines = original.split("\n").map((line) => {
      if (
        line.includes("entryFile") &&
        line.includes("resolveAppEntry") &&
        line.includes("execute")
      ) {
        const indent = (line.match(/^\s*/) || [""])[0];
        return `${indent}entryFile = file("../../index.js")`;
      }
      return line;
    });

    config.modResults.contents = lines.join("\n");
    return config;
  });
};