import AsyncStorage from '@react-native-async-storage/async-storage';

import { getExercises, getTemplates, saveExercises, saveTemplates, patchSettings, DEFAULT_CATEGORY_ORDER } from './storage';
import type { Exercise, WorkoutTemplate } from '@/src/types';

const SEED_KEY = 'seeded_v4';

// ─── 種目マスター ─────────────────────────────────────────

const E = (id: string, name: string, category: string): Exercise => ({
  id,
  name,
  category,
  timerPresets: [],
});

const SEED_EXERCISES: Exercise[] = [
  // 胸
  E('ex-chest-1', 'ベンチプレス',                  '胸'),
  E('ex-chest-2', 'ダンベルフライ',                '胸'),
  E('ex-chest-3', 'ペックフライ',                  '胸'),
  E('ex-chest-4', 'インクラインダンベルプレス',    '胸'),
  E('ex-chest-5', 'ディップス',                    '胸'),
  // 脚
  E('ex-leg-1',   'スクワット',               '脚'),
  E('ex-leg-2',   'ブルガリアンスクワット',   '脚'),
  E('ex-leg-3',   'レッグエクステンション',   '脚'),
  E('ex-leg-4',   'レッグカール',             '脚'),
  E('ex-leg-5',   'レッグプレス',             '脚'),
  // 背中
  E('ex-back-1',  'デッドリフト',             '背中'),
  E('ex-back-2',  'チンニング',               '背中'),
  E('ex-back-3',  'ラットプルダウン',         '背中'),
  E('ex-back-4',  'プーリーロウ',             '背中'),
  // 肩
  E('ex-sh-1',    'ダンベルショルダープレス',  '肩'),
  E('ex-sh-2',    'サイドレイズ',              '肩'),
  E('ex-sh-3',    'リアレイズ',                '肩'),
  // 腕
  E('ex-arm-1',   'インクラインダンベルカール', '腕'),
  E('ex-arm-2',   'フレンチプレス',             '腕'),
  E('ex-arm-3',   'バーベルカール',             '腕'),
  E('ex-arm-4',   'ライイングエクステンション', '腕'),
  // 腹筋
  E('ex-abs-1',   'アブローラー',             '腹筋'),
  E('ex-abs-2',   'クランチ',                 '腹筋'),
  E('ex-abs-3',   'ハンギングレッグレイズ',   '腹筋'),
];

// ─── デフォルトテンプレート ───────────────────────────────

const byId = (id: string) => SEED_EXERCISES.find((e) => e.id === id)!;

const SEED_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tmpl-chest',
    name: '胸',
    exercises: [byId('ex-chest-1'), byId('ex-chest-2'), byId('ex-chest-3'), byId('ex-chest-4'), byId('ex-chest-5')],
  },
  {
    id: 'tmpl-leg',
    name: '脚',
    exercises: [byId('ex-leg-1'), byId('ex-leg-2'), byId('ex-leg-3'), byId('ex-leg-4'), byId('ex-leg-5')],
  },
  {
    id: 'tmpl-back',
    name: '背中',
    exercises: [byId('ex-back-1'), byId('ex-back-2'), byId('ex-back-3'), byId('ex-back-4')],
  },
  {
    id: 'tmpl-shoulder',
    name: '肩',
    exercises: [byId('ex-sh-1'), byId('ex-sh-2'), byId('ex-sh-3')],
  },
  {
    id: 'tmpl-arm',
    name: '腕',
    exercises: [byId('ex-arm-1'), byId('ex-arm-2'), byId('ex-arm-3'), byId('ex-arm-4')],
  },
  {
    id: 'tmpl-abs',
    name: '腹筋',
    exercises: [byId('ex-abs-1'), byId('ex-abs-2'), byId('ex-abs-3')],
  },
];

// ─── 初期化（初回起動のみ実行）──────────────────────────

export async function initSeedDataIfNeeded(): Promise<void> {
  const already = await AsyncStorage.getItem(SEED_KEY);
  if (already) return;
  await saveExercises(SEED_EXERCISES);
  await saveTemplates(SEED_TEMPLATES);
  await AsyncStorage.setItem(SEED_KEY, '1');
}

// 削除されたプリセット種目・メニューのみを追加（既存データは保持）
export async function restoreMissingPresets(): Promise<void> {
  const current = await getExercises();
  const currentIds = new Set(current.map((e) => e.id));
  const missing = SEED_EXERCISES.filter((e) => !currentIds.has(e.id));
  if (missing.length > 0) {
    await saveExercises([...current, ...missing]);
  }

  const currentTemplates = await getTemplates();
  const currentTemplateIds = new Set(currentTemplates.map((t) => t.id));
  const missingTemplates = SEED_TEMPLATES.filter((t) => !currentTemplateIds.has(t.id));
  if (missingTemplates.length > 0) {
    await saveTemplates([...currentTemplates, ...missingTemplates]);
  }
}

// 全種目・メニューをプリセットにリセット（履歴は保持）
export async function resetToPresets(): Promise<void> {
  await saveExercises(SEED_EXERCISES);
  await saveTemplates(SEED_TEMPLATES);
  await patchSettings({ categoryOrder: DEFAULT_CATEGORY_ORDER });
}
