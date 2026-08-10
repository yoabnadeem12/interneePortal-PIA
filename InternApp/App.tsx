/**
 * PIA Intern Management System
 * Main App Entry Point
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {Provider} from 'react-redux';
import {store} from './src/store';
import AppNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />
      <AppNavigator />
    </Provider>
  );
}
