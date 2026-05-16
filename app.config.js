/* Dynamic Expo config — keeps app.json static fields while injecting env-driven extras */
const appJson = require('./app.json');

module.exports = () => ({
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      // Expo: EXPO_PUBLIC_* — Amplify “Vite” UI often uses VITE_*; both work at build time
      socketServerUrl:
        process.env.EXPO_PUBLIC_SOCKET_SERVER_URL ||
        process.env.VITE_SOCKET_SERVER_URL ||
        '',
    },
  },
});
