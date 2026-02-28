import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveExercises, saveTemplates } from './storage';
import type { Exercise, WorkoutTemplate } from '@/src/types';

const SEED_KEY = 'seeded_v1';

// ─── 種目マスター ─────────────────────────────────────────

const E = (id: string, name: string, category: string): Exercise => ({
  id,
  name,
  category,
  timerPresets: [],
});

const SEED_EXERCISES: Exercise[] = [
  // 胸
  E('ex-chest-1', 'ベンチプレス',             '胸'),
  E('ex-chest-2', 'ダンベルフライ',            '胸'),
  E('ex-chest-3', 'ペックフライ',              '胸'),
  // 肩
  E('ex-sh-1',    'ダンベルショルダープレス',  '肩'),
  E('ex-sh-2',    'サイドレイズ',              '肩'),
  E('ex-sh-3',    'リアレイズ',                '肩'),
  // 腕
  E('ex-arm-1',   'ダンベルカール',            '腕'),
  E('ex-arm-2',   'フレンチプレス',            '腕'),
  E('ex-arm-3',   'ハンマーカール',            '腕'),
  // 背中
  E('ex-back-1',  'チンニング',               '背中'),
  E('ex-back-2',  'ラットプルダウン',         '背中'),
  E('ex-back-3',  'プーリーロウ',             '背中'),
  // 脚
  E('ex-leg-1',   'スクワット',               '脚'),
  E('ex-leg-2',   'デッドリフト',             '脚'),
  E('ex-leg-3',   'ブルガリアンスクワット',   '脚'),
  // 腹
  E('ex-abs-1',   'アブローラー',             '腹'),
  E('ex-abs-2',   'ハンギングレッグレイズ',   '腹'),
  E('ex-abs-3',   'クランチ',                 '腹'),
];

// ─── デフォルトテンプレート ───────────────────────────────

const byId = (id: string) => SEED_EXERCISES.find((e) => e.id === id)!;

const SEED_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tmpl-chest',
    name: '胸トレ',
    exercises: [byId('ex-chest-1'), byId('ex-chest-2'), byId('ex-chest-3')],
  },
  {
    id: 'tmpl-shoulder',
    name: '肩トレ',
    exercises: [byId('ex-sh-1'), byId('ex-sh-2'), byId('ex-sh-3')],
  },
  {
    id: 'tmpl-arm',
    name: '腕トレ',
    exercises: [byId('ex-arm-1'), byId('ex-arm-2'), byId('ex-arm-3')],
  },
  {
    id: 'tmpl-back',
    name: '背中トレ',
    exercises: [byId('ex-back-1'), byId('ex-back-2'), byId('ex-back-3')],
  },
  {
    id: 'tmpl-leg',
    name: '脚トレ',
    exercises: [byId('ex-leg-1'), byId('ex-leg-2'), byId('ex-leg-3')],
  },
  {
    id: 'tmpl-abs',
    name: '腹筋トレ',
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
