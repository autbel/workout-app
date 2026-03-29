/**
 * expo-notifications の安全なラッパー
 * Expo Go (SDK 53+) ではリモート通知APIが削除されたためクラッシュする可能性がある。
 * このファイル経由でアクセスすることで、Expo Go でも安全に動作する。
 */

import Constants from 'expo-constants';

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

export async function scheduleTimerNotification(seconds: number): Promise<string | null> {
  if (!_Notifications) return null;
  try {
    return await _Notifications.scheduleNotificationAsync({
      content: {
        title: '筋トレ日記',
        body: 'タイマーが終了しました！',
        sound: true,
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
