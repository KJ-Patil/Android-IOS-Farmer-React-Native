import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Audio } from 'expo-av';
import { File as ExpoFile, Paths } from 'expo-file-system';
import { Platform, Vibration } from 'react-native';

const ALARM_CHANNEL_ID = 'farmer-daily-alarm';
const ALARM_NOTIFICATION_ID = 'daily-645pm-ist';
const ALARM_DURATION_MS = 35_000;
const IST_TARGET_HOUR = 18;
const IST_TARGET_MINUTE = 45;
const IST_UTC_OFFSET_MINUTES = 330;

let alarmSound: Audio.Sound | null = null;
let alarmTimeout: ReturnType<typeof setTimeout> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getLocalAlarmTime(): { hour: number; minute: number } {
  const utcTotalMinutes =
    IST_TARGET_HOUR * 60 + IST_TARGET_MINUTE - IST_UTC_OFFSET_MINUTES;
  const offsetMinutes = new Date().getTimezoneOffset();
  let localMinutes = utcTotalMinutes - offsetMinutes;
  if (localMinutes < 0) localMinutes += 1440;
  if (localMinutes >= 1440) localMinutes -= 1440;
  return {
    hour: Math.floor(localMinutes / 60),
    minute: localMinutes % 60,
  };
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Daily Reminder Alarm',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 300, 500],
      sound: 'default',
    });
  }
}

export async function scheduleDailyAlarm(): Promise<boolean> {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  await setupNotificationChannel();
  await Notifications.cancelScheduledNotificationAsync(ALARM_NOTIFICATION_ID).catch(() => {});

  const { hour, minute } = getLocalAlarmTime();

  await Notifications.scheduleNotificationAsync({
    identifier: ALARM_NOTIFICATION_ID,
    content: {
      title: 'FarmerLedger Reminder',
      body: 'Time to review your daily farm records!',
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return true;
}

export async function cancelDailyAlarm() {
  await Notifications.cancelScheduledNotificationAsync(ALARM_NOTIFICATION_ID).catch(() => {});
}


async function getAlarmSoundUri(): Promise<string> {
  const file = new ExpoFile(Paths.cache, 'alarm_tone.wav');

  if (file.exists) return file.uri;

  const wavBytes = generateAlarmWavBytes();
  await file.write(wavBytes);
  return file.uri;
}

function generateAlarmWavBytes(): Uint8Array {
  const sampleRate = 8000;
  const bitsPerSample = 8;
  const numChannels = 1;
  const beepDuration = 0.4;
  const pauseDuration = 0.25;
  const cycleDuration = beepDuration + pauseDuration;
  const totalDuration = cycleDuration * 3;
  const numSamples = Math.floor(sampleRate * totalDuration);
  const headerSize = 44;
  const fileSize = headerSize + numSamples;
  const buffer = new Uint8Array(fileSize);
  const view = new DataView(buffer.buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples, true);

  const freq1 = 880;
  const freq2 = 698;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const cyclePos = t % cycleDuration;
    if (cyclePos < beepDuration) {
      const mix =
        0.6 * Math.sin(2 * Math.PI * freq1 * t) +
        0.4 * Math.sin(2 * Math.PI * freq2 * t);
      const envelope =
        cyclePos < 0.02
          ? cyclePos / 0.02
          : cyclePos > beepDuration - 0.02
            ? (beepDuration - cyclePos) / 0.02
            : 1;
      buffer[headerSize + i] = Math.round(128 + 100 * mix * envelope);
    } else {
      buffer[headerSize + i] = 128;
    }
  }

  return buffer;
}

export async function playAlarmSound(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    });

    const uri = await getAlarmSoundUri();
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { isLooping: true, volume: 1.0, shouldPlay: true },
    );
    alarmSound = sound;

    Vibration.vibrate(
      [0, 500, 300, 500, 300, 500, 800, 500, 300, 500, 300, 500, 800],
      true,
    );

    alarmTimeout = setTimeout(() => {
      stopAlarmSound();
    }, ALARM_DURATION_MS);
  } catch {
    Vibration.vibrate(
      [0, 500, 300, 500, 300, 500, 800],
      true,
    );
    alarmTimeout = setTimeout(() => {
      stopAlarmSound();
    }, ALARM_DURATION_MS);
  }
}

export async function stopAlarmSound(): Promise<void> {
  if (alarmTimeout) {
    clearTimeout(alarmTimeout);
    alarmTimeout = null;
  }

  Vibration.cancel();

  if (alarmSound) {
    try {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
    } catch {}
    alarmSound = null;
  }
}

export function getAlarmDisplayTime(): string {
  return '6:45 PM IST';
}

export function getAlarmDurationSeconds(): number {
  return ALARM_DURATION_MS / 1000;
}
