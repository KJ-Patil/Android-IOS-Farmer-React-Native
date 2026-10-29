import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlotListScreen } from '../../features/plots/screens/PlotListScreen';
import { PlotDashboardScreen } from '../../features/plots/screens/PlotDashboardScreen';
import { CropDashboardScreen } from '../../features/crops/screens/CropDashboardScreen';

const Stack = createNativeStackNavigator();

export function PlotsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlotList" component={PlotListScreen} />
      <Stack.Screen name="PlotDashboard" component={PlotDashboardScreen} />
      <Stack.Screen name="CropDashboard" component={CropDashboardScreen} />
    </Stack.Navigator>
  );
}
