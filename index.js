import React from 'react';
import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';
import AppErrorBoundary from './components/AppErrorBoundary';
import { injectWebGameTouchGuard } from './utils/webGameTouch';

if (Platform.OS === 'web') {
  injectWebGameTouchGuard();
}

function Root() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(Root);
