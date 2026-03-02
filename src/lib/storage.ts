/**
 * ストレージ層 — AsyncStorage のキー・型付きラッパー
 *
 * キー設計:
 *   exercises          : Exercise[]         エクササイズマスター
 *   templates          : WorkoutTemplate[]  テンプレート一覧
 *   sessions           : WorkoutSession[]   全セッション（完了済み）
 *   settings           : AppSettings        ユーザー設定
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Exercise,
  WorkoutSession,
  WorkoutTemplate,
} from '@/src/types';

// ─── Settings ────────────────────────────────────────────
export interface AppSettings {
  unit: 'kg' | 'lb';
  recentSessionCount: number; // Home に表示する直近セッション数（デフォルト3, 最大5）
  timerSoundEnabled: boolean;
  timerVibrationEnabled: boolean;
  categoryOrder: string[]; // AddExerciseScreen での種目カテゴリ表示順
  prExercises: string[];   // ホーム画面の自己記録セクションに表示する種目名（最大3）
}

export const DEFAULT_CATEGORY_ORDER = ['胸', '脚', '背中', '肩', '腕', '腹筋'];

const DEFAULT_SETTINGS: AppSettings = {
  unit: 'kg',
  recentSessionCount: 3,
  timerSoundEnabled: true,
  timerVibrationEnabled: true,
  categoryOrder: DEFAULT_CATEGORY_ORDER,
  prExercises: ['ベンチプレス', 'スクワット', 'デッドリフト'],
};

// ─── Generic helpers ─────────────────────────────────────

async function getJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return null;
  return JSON.parse(raw) as T;
}

async function setJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ─── Exercises ───────────────────────────────────────────

export async function getExercises(): Promise<Exercise[]> {
  return (await getJson<Exercise[]>('exercises')) ?? [];
}

export async function saveExercises(exercises: Exercise[]): Promise<void> {
  await setJson('exercises', exercises);
}

export async function upsertExercise(exercise: Exercise): Promise<void> {
  const all = await getExercises();
  const idx = all.findIndex((e) => e.id === exercise.id);
  if (idx >= 0) {
    all[idx] = exercise;
  } else {
    all.push(exercise);
  }
  await saveExercises(all);
}

export async function deleteExercise(id: string): Promise<void> {
  const all = await getExercises();
  await saveExercises(all.filter((e) => e.id !== id));
}

// ─── Templates ───────────────────────────────────────────

export async function getTemplates(): Promise<WorkoutTemplate[]> {
  return (await getJson<WorkoutTemplate[]>('templates')) ?? [];
}

export async function saveTemplates(templates: WorkoutTemplate[]): Promise<void> {
  await setJson('templates', templates);
}

export async function upsertTemplate(template: WorkoutTemplate): Promise<void> {
  const all = await getTemplates();
  const idx = all.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    all[idx] = template;
  } else {
    all.push(template);
  }
  await saveTemplates(all);
}

export async function deleteTemplate(id: string): Promise<void> {
  const all = await getTemplates();
  await saveTemplates(all.filter((t) => t.id !== id));
}

// ─── Sessions ────────────────────────────────────────────

export async function getSessions(): Promise<WorkoutSession[]> {
  return (await getJson<WorkoutSession[]>('sessions')) ?? [];
}

export async function saveSessions(sessions: WorkoutSession[]): Promise<void> {
  await setJson('sessions', sessions);
}

export async function upsertSession(session: WorkoutSession): Promise<void> {
  const all = await getSessions();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    all[idx] = session;
  } else {
    all.push(session);
  }
  await saveSessions(all);
}

export async function getRecentSessions(count: number): Promise<WorkoutSession[]> {
  const all = await getSessions();
  return [...all]
    .filter((s) => s.finishedAt != null)
    .sort((a, b) => (b.finishedAt! > a.finishedAt! ? 1 : -1))
    .slice(0, count);
}

export async function deduplicateSessions(): Promise<void> {
  const all = await getSessions();

  const latestByDate = new Map<string, WorkoutSession>();
  const unfinished: WorkoutSession[] = [];

  for (const s of all) {
    if (!s.finishedAt) {
      unfinished.push(s);
      continue;
    }
    const d = new Date(s.startedAt);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const existing = latestByDate.get(dateStr);
    if (!existing || s.finishedAt > existing.finishedAt!) {
      latestByDate.set(dateStr, s);
    }
  }

  const cleaned = [...latestByDate.values(), ...unfinished];
  if (cleaned.length < all.length) {
    await saveSessions(cleaned);
  }
}

// ─── Settings ────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const stored = await getJson<Partial<AppSettings>>('settings');
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await setJson('settings', settings);
}

export async function patchSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...patch };
  await saveSettings(updated);
  return updated;
}

// ─── Category helpers ─────────────────────────────────────

export async function renameCategory(oldName: string, newName: string): Promise<void> {
  const [settings, exercises] = await Promise.all([getSettings(), getExercises()]);
  const newOrder = settings.categoryOrder.map((c) => (c === oldName ? newName : c));
  const newExercises = exercises.map((e) =>
    e.category === oldName ? { ...e, category: newName } : e,
  );
  await Promise.all([patchSettings({ categoryOrder: newOrder }), saveExercises(newExercises)]);
}

export async function deleteCategory(name: string): Promise<void> {
  const [settings, exercises] = await Promise.all([getSettings(), getExercises()]);
  const newOrder = settings.categoryOrder.filter((c) => c !== name);
  const newExercises = exercises.map((e) =>
    e.category === name ? { ...e, category: 'その他' } : e,
  );
  await Promise.all([patchSettings({ categoryOrder: newOrder }), saveExercises(newExercises)]);
}
