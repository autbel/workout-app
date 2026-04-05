/**
 * expo-notifications の安全なラッパー
 * Expo Go (SDK 53+) ではリモート通知APIが削除されたためクラッシュする可能性がある。
 * このファイル経由でアクセスすることで、Expo Go でも安全に動作する。
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Expo Go (storeClient) では通知APIが制限されているためスキップ
const isExpoGo = Constants.executionEnvironment === 'storeClient';

let _Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo) {
  try {
    _Notifications = require('expo-notifications');
  } catch {
    // 通知が使えない環境ではスキップ
  }
}

export const Notifications = _Notifications;

export async function requestNotificationPermission(): Promise<boolean> {
  // Expo Go では通知APIが使えないため、常に許可済み扱いにする
  if (!_Notifications) return true;
  try {
    const { status } = await _Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return true;
  }
}

// サウンド・バイブの組み合わせごとに4チャンネルを作成
// どのチャンネルも IMPORTANCE_HIGH でポップアップ表示される
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android' || !_Notifications) return;

  const base = {
    importance: _Notifications.AndroidImportance.HIGH,
    audioAttributes: {
      usage: _Notifications.AndroidAudioUsage.ALARM,
      contentType: _Notifications.AndroidAudioContentType.SONIFICATION,
    },
  };

  const channels: Parameters<typeof _Notifications.setNotificationChannelAsync>[] = [
    ['timer-alarm-sv', { ...base, name: 'タイマーアラーム（音+バイブ）', sound: 'default', vibrationPattern: [0, 400, 200, 400] }],
    ['timer-alarm-s',  { ...base, name: 'タイマーアラーム（音のみ）',    sound: 'default', vibrationPattern: null }],
    ['timer-alarm-v',  { ...base, name: 'タイマーアラーム（バイブのみ）', sound: null,      vibrationPattern: [0, 400, 200, 400] }],
    ['timer-alarm-n',  { ...base, name: 'タイマーアラーム（通知のみ）',  sound: null,      vibrationPattern: null }],
  ];

  for (const [id, options] of channels) {
    try {
      await _Notifications.setNotificationChannelAsync(id, options);
    } catch {
      // ignore
    }
  }
}

export async function scheduleTimerNotification(
  seconds: number,
  soundEnabled: boolean,
  vibrationEnabled: boolean,
): Promise<string | null> {
  if (!_Notifications) return null;

  const channelId =
    soundEnabled && vibrationEnabled ? 'timer-alarm-sv' :
    soundEnabled                     ? 'timer-alarm-s'  :
    vibrationEnabled                 ? 'timer-alarm-v'  :
                                       'timer-alarm-n';

  try {
    return await _Notifications.scheduleNotificationAsync({
      content: {
        title: '筋トレ日記',
        body: 'タイマーが終了しました！',
        sound: soundEnabled,
        ...(Platform.OS === 'android' && { android: { channelId } }),
      },
      trigger: { type: _Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    });
  } catch {
    return null;
  }
}

export async function cancelNotification(id: string): Promise<void> {
  if (!_Notifications) return;
  try {
    await _Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}
