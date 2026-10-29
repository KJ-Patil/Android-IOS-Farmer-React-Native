import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { DashboardScreen } from '../../features/dashboard/screens/DashboardScreen';
import { PlotsStack } from './PlotsStack';
import { LedgerScreen } from '../../features/ledger/screens/LedgerScreen';
import { InventoryScreen } from '../../features/inventory/screens/InventoryScreen';
import { SettingsScreen } from '../../features/settings/screens/SettingsScreen';
import { CustomTabBar } from '../../components/navigation/CustomTabBar';
import { LayoutDashboard, Map, BookOpen, Package, Settings } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('dashboard'),
          tabBarIcon: ({ color, size, focused }) => <LayoutDashboard color={color} size={size} fill={focused ? color : 'none'} strokeWidth={focused ? 1.5 : 2} />,
        }}
      />
      <Tab.Screen
        name="PlotsTab"
        component={PlotsStack}
        options={{
          tabBarLabel: t('plots'),
          tabBarIcon: ({ color, size, focused }) => <Map color={color} size={size} fill={focused ? color : 'none'} strokeWidth={focused ? 1.5 : 2} />,
        }}
      />
      <Tab.Screen
        name="LedgerTab"
        component={LedgerScreen}
        options={{
          tabBarLabel: t('ledger'),
          tabBarIcon: ({ color, size, focused }) => <BookOpen color={color} size={size} fill={focused ? color : 'none'} strokeWidth={focused ? 1.5 : 2} />,
        }}
      />
      <Tab.Screen
        name="InventoryTab"
        component={InventoryScreen}
        options={{
          tabBarLabel: t('inventory'),
          tabBarIcon: ({ color, size, focused }) => <Package color={color} size={size} fill={focused ? color : 'none'} strokeWidth={focused ? 1.5 : 2} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings'),
          tabBarIcon: ({ color, size, focused }) => <Settings color={color} size={size} fill={focused ? color : 'none'} strokeWidth={focused ? 1.5 : 2} />,
        }}
      />
    </Tab.Navigator>
  );
}
