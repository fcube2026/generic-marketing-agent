// apps/mobile/app.config.js
module.exports = ({ config }) => ({
  ...config,
  plugins: ["./plugins/withStaticEntryFile"],
});