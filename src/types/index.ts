// ─── Timer ───────────────────────────────────────────────
export type TimerMode = 'countdown' | 'interval' | 'stopwatch';

export interface TimerPreset {
  id: string;
  label: string;
  mode: TimerMode;
  durationSec: number;       // countdown / interval の秒数
  intervalRestSec?: number;  // interval モード時のレスト秒数
}

// ─── Exercise master ─────────────────────────────────────
export interface Exercise {
  id: string;
  name: string;
  category?: string;           // 例: '胸', '背中'（省略可、後付け互換）
  timerPresets: TimerPreset[]; // 最大3件
}

// ─── Session snapshot ────────────────────────────────────
export interface SetEntry {
  reps: number;
  weightKg: number;
  completedAt: string; // ISO 8601
}

/** セッション内の1エクササイズ（名前はスナップショット） */
export interface ExerciseEntry {
  exerciseId: string;
  exerciseName: string; // マスター変更の影響を受けないようスナップショット
  timerPresets: TimerPreset[]; // スナップショット
  sets: SetEntry[];
}

export interface WorkoutSession {
  id: string;
  startedAt: string;   // ISO 8601
  finishedAt?: string; // ISO 8601
  templateId?: string;
  templateName?: string; // スナップショット
  exercises: ExerciseEntry[];
}

// ─── Template ────────────────────────────────────────────
export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: Exercise[]; // 順序付きエクササイズリスト
}
