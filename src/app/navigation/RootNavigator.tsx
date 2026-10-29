import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../../shared/hooks/useAuthStore';
import { AuthStack } from './AuthStack';
import { MainTabNavigator } from './MainTabNavigator';
import { Spinner } from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { t } = useTranslation();
  const { user, isLoading, isInitialized } = useAuthStore();

  if (!isInitialized || isLoading) {
    return <Spinner message={t('profileLoading')} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
