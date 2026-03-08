import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { Exercise, WorkoutSession, WorkoutTemplate } from '@/src/types';
import {
  getExercises, saveExercises,
  getTemplates, saveTemplates,
  getSessions, saveSessions,
  getSettings, saveSettings,
  type AppSettings,
} from './storage';

export type BackupData = {
  version: number;
  exportedAt: string;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  settings: AppSettings;
};

export async function exportBackup(): Promise<void> {
  const [exercises, templates, sessions, settings] = await Promise.all([
    getExercises(),
    getTemplates(),
    getSessions(),
    getSettings(),
  ]);

  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises,
    templates,
    sessions,
    settings,
  };

  const json = JSON.stringify(data, null, 2);
  const filename = `kintore-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const fileUri = (FileSystem.cacheDirectory ?? '') + filename;
  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'バックアップを保存',
  });
}

export async function importBackup(): Promise<void> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
  if (result.canceled) return;

  const json = await FileSystem.readAsStringAsync(result.assets[0].uri);
  const data: BackupData = JSON.parse(json);

  if (typeof data.version !== 'number' || data.version !== 1) {
    throw new Error('未対応のバックアップ形式です');
  }

  await Promise.all([
    saveExercises(data.exercises ?? []),
    saveTemplates(data.templates ?? []),
    saveSessions(data.sessions ?? []),
    saveSettings(data.settings),
  ]);
}
