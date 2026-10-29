import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Animated } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../app/providers/ThemeProvider';

const TAB_COLORS: Record<string, { active: string; bg: string }> = {
  DashboardTab: { active: '#16A34A', bg: '#DCFCE7' },
  PlotsTab:     { active: '#2563EB', bg: '#DBEAFE' },
  LedgerTab:    { active: '#D97706', bg: '#FEF3C7' },
  InventoryTab: { active: '#7C3AED', bg: '#EDE9FE' },
  SettingsTab:  { active: '#64748B', bg: '#F1F5F9' },
};

function TabItem({ route, isFocused, options, onPress, onLongPress, isDark, colors }: any) {
  const anim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const tabColor = TAB_COLORS[route.name] || TAB_COLORS.SettingsTab;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
  }, [isFocused]);

  const label =
    typeof options.tabBarLabel === 'string'
      ? options.tabBarLabel
      : typeof options.title === 'string'
        ? options.title
        : route.name;

  const iconColor = isFocused
    ? (isDark ? '#FFFFFF' : tabColor.active)
    : (isDark ? '#94A3B8' : '#9CA3AF');
  const labelColor = isFocused
    ? (isDark ? '#FFFFFF' : tabColor.active)
    : (isDark ? '#94A3B8' : '#6B7280');

  const iconScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const indicatorScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const indicatorOpacity = anim;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={styles.tab}
    >
      <Animated.View style={[styles.topIndicator, { opacity: indicatorOpacity, transform: [{ scaleX: indicatorScale }], backgroundColor: isDark ? '#FFFFFF' : tabColor.active }]} />

      <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
        {options.tabBarIcon?.({
          focused: isFocused,
          color: iconColor,
          size: 22,
        })}
      </Animated.View>

      <Text
        style={[
          styles.label,
          {
            color: labelColor,
            fontWeight: isFocused ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          paddingBottom: Math.max(insets.bottom, 10),
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: isDark ? '#000' : '#94A3B8',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: isDark ? 0.3 : 0.08,
                shadowRadius: 12,
              }
            : { elevation: 12 }),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <TabItem
            key={route.key}
            route={route}
            isFocused={isFocused}
            options={options}
            onPress={onPress}
            onLongPress={onLongPress}
            isDark={isDark}
            colors={colors}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 0,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  topIndicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
    width: 26,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.1,
  },
});
