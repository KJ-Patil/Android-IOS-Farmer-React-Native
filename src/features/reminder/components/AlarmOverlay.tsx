import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useAlarmStore } from '../../../shared/hooks/useAlarmStore';
import {
  playAlarmSound,
  stopAlarmSound,
  getAlarmDisplayTime,
  getAlarmDurationSeconds,
} from '../../../shared/services/alarmService';
import { fontSizes } from '../../../shared/utils/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function AlarmOverlay() {
  const { isRinging, setRinging, isEnabled } = useAlarmStore();
  const [countdown, setCountdown] = useState(getAlarmDurationSeconds());
  const [prevRinging, setPrevRinging] = useState(false);

  if (isRinging !== prevRinging) {
    setPrevRinging(isRinging);
    if (isRinging) {
      setCountdown(getAlarmDurationSeconds());
    }
  }

  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [bellAnim] = useState(() => new Animated.Value(0));
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = useCallback(async () => {
    await stopAlarmSound();
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setRinging(false);
    });
  }, [fadeAnim, setRinging]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const id = notification.request.identifier;
      if (id === 'daily-645pm-ist' && isEnabled) {
        setRinging(true);
      }
    });
    return () => sub.remove();
  }, [isEnabled, setRinging]);

  useEffect(() => {
    if (!isRinging) return;

    const remaining = { value: getAlarmDurationSeconds() };
    playAlarmSound();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    const bell = Animated.loop(
      Animated.sequence([
        Animated.timing(bellAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bellAnim, {
          toValue: -1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bellAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    );
    bell.start();

    countdownRef.current = setInterval(() => {
      remaining.value -= 1;
      if (remaining.value <= 0) {
        dismiss();
        setCountdown(0);
      } else {
        setCountdown(remaining.value);
      }
    }, 1000);

    return () => {
      pulse.stop();
      bell.stop();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isRinging, fadeAnim, pulseAnim, bellAnim, dismiss]);

  const bellRotate = bellAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Modal
      visible={isRinging}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <StatusBar style="light" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.gradientBg}>
          <View style={styles.content}>
            <Animated.View
              style={[
                styles.bellCircle,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Animated.Text
                style={[
                  styles.bellIcon,
                  { transform: [{ rotate: bellRotate }] },
                ]}
              >
                {'🔔'}
              </Animated.Text>
            </Animated.View>

            <Text style={styles.alarmTitle}>Daily Reminder</Text>
            <Text style={styles.alarmSubtitle}>
              {getAlarmDisplayTime()}
            </Text>

            <Text style={styles.currentTime}>{timeStr}</Text>

            <View style={styles.messageCard}>
              <Text style={styles.messageText}>
                Time to review your daily farm records!
              </Text>
              <Text style={styles.messageHint}>
                Update your ledger entries, check expenses & income
              </Text>
            </View>

            <Text style={styles.countdown}>
              Auto-dismiss in {countdown}s
            </Text>

            <TouchableOpacity
              onPress={dismiss}
              activeOpacity={0.8}
              style={styles.dismissBtn}
            >
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBg: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  bellCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  bellIcon: {
    fontSize: 52,
  },
  alarmTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  alarmSubtitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#EAB308',
    marginBottom: 20,
  },
  currentTime: {
    fontSize: fontSizes.xxxl + 8,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 32,
  },
  messageCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  messageText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  messageHint: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  countdown: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
  },
  dismissBtn: {
    width: SCREEN_WIDTH * 0.65,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  dismissBtnText: {
    color: '#FFFFFF',
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
