const path = require('path');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
  require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });
} catch {
  /* dotenv optional */
}

const socketUrl = process.env.VITE_SOCKET_SERVER_URL ?? '';

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'babel-plugin-transform-define',
        {
          'import.meta.env.VITE_SOCKET_SERVER_URL': socketUrl,
        },
      ],
    ],
  };
};
