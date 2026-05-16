/* Dynamic Expo config — keeps app.json static fields while injecting env-driven extras */
const appJson = require('./app.json');

module.exports = () => ({
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
    },
  },
});
