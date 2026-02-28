# Workout App (Mobile) - Claude Code Project Instructions

## Stack / 前提
- Mobile app only (not web)
- Expo (managed workflow)
- React Native + TypeScript
- Expo Router (file-based routing). Screens live under /app.

## Directory Rules（超重要）
- /app : routing + screen entrypoints ONLY (keep thin)
  - Each route file should mostly render a screen component from /src
- /src : all implementation details
  - /src/features/* : feature modules (workout, history, template, timer, settings, home)
  - /src/types : shared domain types (Workout/Exercise/SetEntry/Template/TimerPreset)
  - /src/lib : cross-cutting utilities (storage/db/date)
  - /src/components : shared UI components
- Never read/write secrets (.env). Use .env.example if needed.

## Product Requirements（あなたの要望）
1) Timers
- Each exercise supports up to 3 timer presets.
- Preset types: countdown / interval / stopwatch
- In workout screen, user can quickly switch and start a preset.

2) Copy from history
- Starting flow should allow copying from recent sessions (last 3; ideally configurable up to 5).
- History detail page also provides "Copy and start".

3) Templates (routine)
- User can define templates like "Leg day", "Shoulder day".
- Start flow: choose a template first, then the workout screen is prefilled with its exercises.

## MVP Scope（まず作る範囲：クラウド同期なし、端末内保存）
Tabs:
- Home: Templates + Recent sessions (last 3) and start actions
- Workouts: run session (add sets: reps/weightKg), timers basic
- History: list + detail, copy-to-start
- Settings: units (kg/lb), timer sound/vibration (later)

## Data Model (initial)
- WorkoutSession -> ExerciseEntry -> SetEntry
- Exercise master: Exercise (name + timerPresets[<=3])
- Template: WorkoutTemplate (name + ordered exercises)
- Use snapshots in sessions to avoid issues when exercise names change.

## Working Agreement（進め方）
- Before coding: propose a short plan (tasks <= 10).
- Keep changes small and incremental.
- After each task:
  - list changed files
  - explain what changed
  - give exact run/check steps
- Ask before:
  - adding new dependencies
  - changing storage schema/migrations
  - editing files outside /app and /src
- Prefer simple, testable functions and keep UI components small.

## Git Workflow（バージョン管理）

### ブランチ戦略
- `main` : 常に動作する状態を維持
- `feat/<task-name>` : 各タスクの作業ブランチ（例: `feat/task-3-template-crud`）
- 作業は必ずブランチで行い、完了後に `main` へマージ

### コミットルール
- コミット前に `npx tsc --noEmit` でエラーがないことを確認
- コミットメッセージは Conventional Commits 形式:
  - `feat:` 新機能
  - `fix:` バグ修正
  - `chore:` 設定・依存の変更
  - `refactor:` 動作変更なしの構造改善
- 1タスク = 1コミット（細かい作業は squash してからマージ）

### 各タスクの Git 手順（Claude が守るルール）
1. タスク開始前: `git checkout -b feat/<task-name>`
2. 実装完了後: `npx tsc --noEmit` でエラーなしを確認
3. コミット: `git add <関係ファイルのみ>` → `git commit -m "feat: ..."`
4. main にマージ: `git checkout main && git merge feat/<task-name>`
5. GitHub に push: `git push origin main`

### 注意
- `node_modules/`, `.expo/`, `*.env` は絶対にコミットしない（.gitignore で管理）
- 破壊的な操作（`--force`, `reset --hard`）は事前に確認を取る

## Useful Commands
- Start dev server: `npx expo start`
- Type check: `npx tsc --noEmit`
- Git status/diff: `git status`, `git diff`
- Push to GitHub: `git push origin main`
