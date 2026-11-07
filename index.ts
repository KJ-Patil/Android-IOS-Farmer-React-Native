import { registerRootComponent } from 'expo';
import React from 'react';

let App: React.ComponentType;
try {
  App = require('./App').default;
} catch (e: any) {
  const RN = require('react-native');
  const msg = String(e?.message || e);
  const stack = String(e?.stack || '');
  App = () =>
    React.createElement(
      RN.View,
      { style: { flex: 1, backgroundColor: '#1a1a2e', padding: 24, paddingTop: 80 } },
      React.createElement(RN.Text, { style: { fontSize: 20, color: '#e94560', fontWeight: 'bold' } }, 'Startup Error'),
      React.createElement(
        RN.ScrollView,
        { style: { flex: 1, marginTop: 16 } },
        React.createElement(RN.Text, { style: { fontSize: 14, color: '#fff' } }, msg),
        React.createElement(RN.Text, { style: { fontSize: 11, color: '#888', marginTop: 12 } }, stack),
      ),
    );
}

registerRootComponent(App);
