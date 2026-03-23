import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { generateId } from '@/src/lib/id';
import { getSessions, getSettings, saveSessions, upsertSession } from '@/src/lib/storage';
import { useWorkoutStore } from '@/src/store/workoutStore';
import type { AppSettings } from '@/src/lib/storage';
import type { ExerciseEntry, SetEntry, WorkoutSession } from '@/src/types';

// ─── Types ───────────────────────────────────────────────

interface DraftSet {
  id: string;
  reps: string;
  weightKg: string;
}

interface DraftExercise {
  exerciseId: string;
  exerciseName: string;
  sets: DraftSet[];
  timerSec?: number;
  memo?: string;
}

// フォアグラウンドでも通知を表示する
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Helpers ─────────────────────────────────────────────

function isValidDecimal(v: string) {
  return v === '' || /^\d+\.?\d*$/.test(v);
}
function isValidInt(v: string) {
  return v === '' || /^\d+$/.test(v);
}

/** Epley 式による推定1RM */
function epley1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** YYYY-MM-DD の日付文字列を当日 00:00:00 の ISO 文字列に変換 */
function dateToStartedAt(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

/** startedAt からローカル日付文字列 (YYYY-MM-DD) を取得 */
function sessionToLocalDate(session: WorkoutSession): string {
  const d = new Date(session.startedAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** セッションの startedAt が指定日付（ローカル日付）と一致するか */
function sessionMatchesDate(session: WorkoutSession, date: string): boolean {
  return sessionToLocalDate(session) === date;
}

// ─── SetRow ──────────────────────────────────────────────

function SetRow({
  index,
  set,
  unit,
  onChangeReps,
  onChangeWeight,
  onRemove,
}: {
  index: number;
  set: DraftSet;
  unit: 'kg' | 'lb';
  onChangeReps: (val: string) => void;
  onChangeWeight: (val: string) => void;
  onRemove: () => void;
}) {
  const [weightTouched, setWeightTouched] = useState(false);
  const [repsTouched, setRepsTouched] = useState(false);

  const weightError = weightTouched && !isValidDecimal(set.weightKg);
  const repsError = repsTouched && !isValidInt(set.reps);

  const w = parseFloat(set.weightKg);
  const r = parseInt(set.reps, 10);
  const estimatedRM = (isFinite(w) && w > 0 && isFinite(r) && r > 0) ? epley1RM(w, r) : null;

  return (
    <View style={rowStyles.wrapper}>
      <View style={rowStyles.container}>
        <Text style={rowStyles.index}>{index + 1}</Text>
        <TextInput
          style={[rowStyles.input, weightError && rowStyles.inputError]}
          value={set.weightKg}
          onChangeText={onChangeWeight}
          onBlur={() => setWeightTouched(true)}
          keyboardType="decimal-pad"
          placeholder="重量"
          returnKeyType="next"
        />
        <Text style={rowStyles.unit}>{unit}</Text>
        <TextInput
          style={[rowStyles.input, repsError && rowStyles.inputError]}
          value={set.reps}
          onChangeText={onChangeReps}
          onBlur={() => setRepsTouched(true)}
          keyboardType="number-pad"
          placeholder="回数"
          returnKeyType="done"
        />
        <Text style={rowStyles.unit}>回</Text>
        <Pressable onPress={onRemove} hitSlop={12} style={{ marginLeft: 4 }}>
          <FontAwesome name="times-circle" size={18} color="#bbb" />
        </Pressable>
        {estimatedRM !== null && (
          <Text style={rowStyles.rmText}>≈{estimatedRM}{unit}</Text>
        )}
      </View>
      {weightError && <Text style={rowStyles.errorText}>重量は数値で入力してください</Text>}
      {repsError && <Text style={rowStyles.errorText}>回数は整数で入力してください</Text>}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  wrapper: { marginBottom: 8 },
  container: { flexDirection: 'row', alignItems: 'center' },
  index: { width: 32, fontSize: 13, color: '#aaa', textAlign: 'right', marginRight: 8 },
  input: {
    width: 64,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 15,
    textAlign: 'center',
    backgroundColor: '#fafafa',
  },
  inputError: { borderColor: '#e53e3e', backgroundColor: '#fff5f5' },
  errorText: { fontSize: 11, color: '#e53e3e', marginLeft: 28, marginTop: 2 },
  unit: { fontSize: 13, color: '#888', marginHorizontal: 4 },
  rmText: { flex: 1, fontSize: 12, color: '#6b7280', textAlign: 'right' },
});

// ─── ExerciseCard ─────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ExerciseCard({
  exercise,
  unit,
  timerSoundEnabled,
  timerVibrationEnabled,
  onChange,
  onRemove,
  onNamePress,
}: {
  exercise: DraftExercise;
  unit: 'kg' | 'lb';
  timerSoundEnabled: boolean;
  timerVibrationEnabled: boolean;
  onChange: (updated: DraftExercise) => void;
  onRemove: () => void;
  onNamePress: () => void;
}) {
  // ── タイマー ──────────────────────────────────────────
  const [timerInput, setTimerInput] = useState(
    exercise.timerSec ? String(exercise.timerSec) : '180'
  );
  const [timerTouched, setTimerTouched] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<any>(null);
  const notificationIdRef = useRef<string | null>(null);
  const backgroundTimeRef = useRef<number | null>(null);
  const isRunning = remainingSec !== null;
  const isFinished = remainingSec === 0;
  const timerError = timerTouched && (timerInput === '' || parseInt(timerInput, 10) <= 0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      if (notificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
        notificationIdRef.current = null;
      }
    };
  }, []);

  // バックグラウンド移行時に時刻を記録し、復帰時に経過時間を補正する
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now();
      } else if (nextState === 'active' && backgroundTimeRef.current !== null) {
        const elapsed = Math.round((Date.now() - backgroundTimeRef.current) / 1000);
        backgroundTimeRef.current = null;
        setRemainingSec((prev) => {
          if (prev === null) return null;
          const next = prev - elapsed;
          if (next <= 0) {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            // 通知はすでにシステムが発火済みなのでここでは何もしない
            return 0;
          }
          return next;
        });
      }
    });
    return () => sub.remove();
  }, []);

  const playBeep = async () => {
    try {
      const { Audio } = await import('expo-av');
      const { sound } = await Audio.Sound.createAsync(
        require('../../../../assets/sounds/beep.mp3')
      );
      soundRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && s.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (_) {}
  };

  const stopSound = () => {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  };

  const startTimer = () => {
    const sec = parseInt(timerInput, 10);
    if (!sec || sec <= 0) return;
    setRemainingSec(sec);
    // バックグラウンド/別画面用にローカル通知をスケジュール
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'タイマー終了',
        body: `${exercise.exerciseName} のタイマーが終了しました`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: sec,
      },
    }).then((id) => { notificationIdRef.current = id; }).catch(() => {});
    intervalRef.current = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          if (prev === 1) {
            // 画面上で自然終了: 通知をキャンセルして in-app 音/バイブを使う
            if (notificationIdRef.current) {
              Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
              notificationIdRef.current = null;
            }
            if (timerVibrationEnabled) Vibration.vibrate([0, 400, 200, 400]);
            if (timerSoundEnabled) playBeep();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    stopSound();
    setRemainingSec(null);
  };

  // ── セット操作 ────────────────────────────────────────
  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    onChange({
      ...exercise,
      sets: [
        ...exercise.sets,
        {
          id: generateId(),
          reps: last?.reps ?? '',
          weightKg: last?.weightKg ?? '',
        },
      ],
    });
  };

  const updateSet = (setId: string, patch: Partial<DraftSet>) => {
    onChange({
      ...exercise,
      sets: exercise.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    });
  };

  const removeSet = (setId: string) => {
    onChange({ ...exercise, sets: exercise.sets.filter((s) => s.id !== setId) });
  };

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.headerWrap}>
      <View style={cardStyles.header}>
        <View style={cardStyles.nameRow}>
          <Text style={cardStyles.name} numberOfLines={1}>{exercise.exerciseName}</Text>
          <Pressable
            onPress={() => {
              Alert.alert(
                '種目を削除',
                `「${exercise.exerciseName}」を削除しますか？`,
                [
                  { text: 'キャンセル', style: 'cancel' },
                  { text: '削除', style: 'destructive', onPress: onRemove },
                ]
              );
            }}
            hitSlop={12}
            style={{ marginLeft: 8 }}
          >
            <FontAwesome name="trash-o" size={18} color="#ef4444" />
          </Pressable>
        </View>
        <View style={cardStyles.timerRow}>
          <Pressable style={cardStyles.historyBtn} onPress={onNamePress} hitSlop={8}>
            <Text style={cardStyles.historyBtnText}>履歴</Text>
          </Pressable>
          <View style={cardStyles.timerInner}>
            <FontAwesome name="clock-o" size={13} color="#888" />
            {isRunning ? (
              <Text style={[cardStyles.timerDisplay, isFinished && cardStyles.timerFinished]}>
                {formatTime(remainingSec!)}
              </Text>
            ) : (
              <TextInput
                style={[cardStyles.timerInput, timerError && cardStyles.timerInputError]}
                value={timerInput}
                onChangeText={(v) => {
                  if (/^\d*$/.test(v)) {
                    setTimerInput(v);
                    const sec = parseInt(v, 10);
                    if (sec > 0) onChange({ ...exercise, timerSec: sec });
                  }
                }}
                onBlur={() => setTimerTouched(true)}
                keyboardType="number-pad"
                returnKeyType="done"
                selectTextOnFocus
              />
            )}
            <Pressable
              style={[cardStyles.timerBtn, timerError && cardStyles.timerBtnDisabled]}
              onPress={isRunning ? resetTimer : startTimer}
              disabled={!isRunning && timerError}
              hitSlop={8}
            >
              <FontAwesome name={isRunning ? 'stop' : 'play'} size={10} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
      {timerError && (
        <Text style={cardStyles.timerErrorText}>整数で入力してください</Text>
      )}
      </View>

      <View style={cardStyles.setHeader}>
        <Text style={[cardStyles.colLabel, { width: 40 }]}>セット</Text>
        <Text style={[cardStyles.colLabel, { width: 64, textAlign: 'center' }]}>
          重量 ({unit})
        </Text>
        <Text style={[cardStyles.colLabel, { width: 80, textAlign: 'center', marginLeft: 28 }]}>
          回数
        </Text>
        <Text style={[cardStyles.colLabel, { flex: 1, textAlign: 'right' }]}>
          推定1RM
        </Text>
      </View>

      {exercise.sets.map((s, i) => (
        <SetRow
          key={s.id}
          index={i}
          set={s}
          unit={unit}
          onChangeReps={(v) => updateSet(s.id, { reps: v })}
          onChangeWeight={(v) => updateSet(s.id, { weightKg: v })}
          onRemove={() => removeSet(s.id)}
        />
      ))}

      <Pressable style={cardStyles.addSetBtn} onPress={addSet}>
        <FontAwesome name="plus" size={12} color="#2563eb" />
        <Text style={cardStyles.addSetText}>セット追加</Text>
      </Pressable>

      <TextInput
        style={cardStyles.exerciseMemoInput}
        placeholder="メモ..."
        placeholderTextColor="#bbb"
        multiline
        value={exercise.memo ?? ''}
        onChangeText={(v) => onChange({ ...exercise, memo: v })}
      />
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerWrap: {
    marginBottom: 10,
  },
  header: {
    flexDirection: 'column',
    gap: 6,
  },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  setHeader: { flexDirection: 'row', marginBottom: 4 },
  colLabel: { fontSize: 11, color: '#aaa', fontWeight: '600' },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  addSetText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },

  exerciseMemoInput: {
    marginTop: 10,
    fontSize: 13,
    color: '#444',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    paddingTop: 8,
    minHeight: 32,
    textAlignVertical: 'top',
  },

  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timerInput: {
    width: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: '#fafafa',
    color: '#444',
  },
  timerDisplay: {
    width: 44,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: '#444',
  },
  timerFinished: { color: '#ef4444' },
  timerInputError: { borderColor: '#e53e3e', backgroundColor: '#fff5f5' },
  timerErrorText: { fontSize: 11, color: '#e53e3e', marginTop: 2 },
  timerBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBtnDisabled: { backgroundColor: '#93c5fd' },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 8,
  },
  historyBtnText: { fontSize: 11, color: '#0284c7', fontWeight: '600' },
});

// ─── Main Screen ─────────────────────────────────────────

export default function WorkoutScreen() {
  useKeepAwake();
  const { date } = useLocalSearchParams<{ date: string }>();
  const navigation = useNavigation();
  const router = useRouter();

  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    unit: 'kg',
    recentSessionCount: 3,
    timerSoundEnabled: true,
    timerVibrationEnabled: true,
    categoryOrder: ['胸', '脚', '背中', '肩', '腕', '腹筋'],
    prExercises: ['ベンチプレス', 'スクワット', 'デッドリフト'],
  });
  const insets = useSafeAreaInsets();
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [sessionTemplateId, setSessionTemplateId] = useState<string | null>(null);
  const [sessionTemplateName, setSessionTemplateName] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  const hasUnsavedDataRef = useRef(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardOffset(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOffset(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // 通知パーミッションをリクエスト
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  // ユーザーが実際に編集した時だけフラグを立てるヘルパー
  const markModified = useCallback(() => {
    if (hasUnsavedDataRef.current) return;
    hasUnsavedDataRef.current = true;
    setHasUnsavedData(true);
  }, []);

  // 確認アラート（戻るボタン・BackHandler・beforeRemove で共用）
  const showUnsavedAlert = useCallback(() => {
    Alert.alert(
      '変更内容が保存されていません。',
      '変更内容を破棄して戻りますか？',
      [
        { text: '入力を続ける', style: 'cancel' },
        {
          text: '破棄して戻る',
          style: 'destructive',
          onPress: () => {
            hasUnsavedDataRef.current = false;
            setHasUnsavedData(false);
            router.back();
          },
        },
      ]
    );
  }, [router]);

  // スワイプジェスチャー無効化（変更あり時）
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !hasUnsavedData,
    });
  }, [navigation, hasUnsavedData]);

  // Android ハードウェアバックボタン（フォーカス中のみ有効）
  useFocusEffect(
    useCallback(() => {
      if (!hasUnsavedData) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        showUnsavedAlert();
        return true;
      });
      return () => sub.remove();
    }, [hasUnsavedData, showUnsavedAlert]),
  );

  // beforeRemove（左上の戻るボタン対応）
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedDataRef.current) return;
      e.preventDefault();
      showUnsavedAlert();
    });
    return unsubscribe;
  }, [navigation, showUnsavedAlert]);

  const { pendingExercises, pendingTemplateId, pendingTemplateName, clearPending, copiedSets, setCopiedSets } = useWorkoutStore();

  // ExerciseHistoryScreen でコピーされたセットを該当種目に適用
  useFocusEffect(
    useCallback(() => {
      if (!copiedSets) return;
      const { exerciseName, sets } = copiedSets;
      setCopiedSets(null);
      setExercises((prev) =>
        prev.map((ex) =>
          ex.exerciseName === exerciseName
            ? {
                ...ex,
                sets: sets.map((s) => ({ id: generateId(), reps: s.reps, weightKg: s.weightKg })),
              }
            : ex,
        ),
      );
      // 履歴からコピーしたデータがある → 変更あり扱い
      if (sets.some((s) => s.reps !== '' || s.weightKg !== '')) {
        markModified();
      }
    }, [copiedSets, setCopiedSets, markModified]),
  );

  // ヘッダータイトル
  useEffect(() => {
    if (date) {
      const [year, month, day] = date.split('-');
      navigation.setOptions({ title: `${year}.${month}.${day}` });
    }
  }, [date, navigation]);

  // 設定とその日の既存セッション読み込み
  useEffect(() => {
    getSettings().then(setSettings);
    if (date) {
      getSessions().then((all) => {
        const existing = all.find((s) => sessionMatchesDate(s, date));
        if (existing) {
          setExistingSessionId(existing.id);
          setSessionTemplateId(existing.templateId ?? null);
          setSessionTemplateName(existing.templateName ?? null);
          setExercises(
            existing.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              exerciseName: e.exerciseName,
              sets: e.sets.map((s) => ({
                id: generateId(),
                reps: String(s.reps),
                weightKg: String(s.weightKg),
              })),
              timerSec: e.timerPresets[0]?.durationSec,
              memo: e.memo,
            })),
          );
        }
      });
    }
  }, [date]);

  // AddExerciseScreen から種目が戻ってきたら前回値で pre-fill して追加
  useEffect(() => {
    if (pendingExercises.length === 0) return;

    const exercises = [...pendingExercises];
    const tplId = pendingTemplateId;
    const tplName = pendingTemplateName;
    clearPending();

    getSessions().then((allSessions) => {
      // finishedAt があり、かつ入力日より前のセッションを過去履歴とする
      const pastSessions = allSessions.filter(
        (s) => s.finishedAt != null && (!date || sessionToLocalDate(s) < date),
      );

      const defaultSets: Record<string, DraftSet[]> = {};
      const defaultTimers: Record<string, number | undefined> = {};

      // 入力対象日より前の全セッションから直近の当該種目記録を取得
      const findEntry = (exId: string, exName: string): ExerciseEntry | null => {
        const found = pastSessions
          .flatMap((s) => s.exercises.map((e) => ({ s, e })))
          .filter(({ e }) => e.exerciseId === exId || e.exerciseName === exName)
          .sort((a, b) => {
            const byDate = sessionToLocalDate(b.s).localeCompare(sessionToLocalDate(a.s));
            if (byDate !== 0) return byDate;
            return b.e.sets.length - a.e.sets.length;
          })[0];
        return found ? found.e : null;
      };

      const toDraft = (sets: SetEntry[]): DraftSet[] =>
        sets.map((s) => ({ id: generateId(), reps: String(s.reps), weightKg: String(s.weightKg) }));

      for (const ex of exercises) {
        const entry = findEntry(ex.id, ex.name);
        if (entry) {
          defaultSets[ex.id] = toDraft(entry.sets);
          defaultTimers[ex.id] = entry.timerPresets[0]?.durationSec;
        }
      }

      if (tplId && !sessionTemplateId) {
        setSessionTemplateId(tplId);
        setSessionTemplateName(tplName);
      }

      setExercises((prev) => [
        ...prev,
        ...exercises.map((ex) => ({
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets: defaultSets[ex.id] ?? [{ id: generateId(), reps: '', weightKg: '' }],
          timerSec: defaultTimers[ex.id],
        })),
      ]);

      // 履歴から反映されたデータがある → 変更あり扱い
      const hasPrefilledData = Object.values(defaultSets).some((sets) =>
        sets.some((s) => s.reps !== '' || s.weightKg !== ''),
      );
      if (hasPrefilledData) markModified();
    });
  }, [pendingExercises, markModified]);

  const updateExercise = (idx: number, updated: DraftExercise) => {
    markModified();
    setExercises((prev) => prev.map((e, i) => (i === idx ? updated : e)));
  };

  const removeExercise = (idx: number) => {
    markModified();
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const hasError = exercises.some((e) =>
      e.sets.some((s) => !isValidDecimal(s.weightKg) || !isValidInt(s.reps)),
    );
    if (hasError) {
      Alert.alert('入力エラー', '正しい数値を入力してください');
      return;
    }

    const filledExercises = exercises.filter((e) =>
      e.sets.some((s) => s.reps !== '' || s.weightKg !== ''),
    );

    const exitWithoutSave = async () => {
      if (existingSessionId) {
        const now = new Date().toISOString();
        await upsertSession({
          id: existingSessionId,
          startedAt: date ? dateToStartedAt(date) : now,
          finishedAt: now,
          templateId: sessionTemplateId ?? undefined,
          templateName: sessionTemplateName ?? undefined,
          exercises: [],
        });
        if (date) {
          const all = await getSessions();
          const toDelete = all.filter(
            (s) => s.id !== existingSessionId && sessionMatchesDate(s, date),
          );
          if (toDelete.length > 0) {
            await saveSessions(all.filter((s) => !toDelete.some((d) => d.id === s.id)));
          }
        }
      }
      hasUnsavedDataRef.current = false;
      setHasUnsavedData(false);
      setExercises([]);
      router.back();
    };

    // パターン 1: 種目が 1 つも追加されていない
    if (exercises.length === 0) {
      Alert.alert('種目が記録されていません', '入力を終了しますか？', [
        { text: '入力を続ける', style: 'cancel' },
        { text: '終了して戻る', style: 'destructive', onPress: exitWithoutSave },
      ]);
      return;
    }

    // パターン 2: 種目はあるが全セットが未入力
    if (filledExercises.length === 0) {
      Alert.alert(
        '回数・重量が入力されていません',
        '種目が追加されていますが、回数と重量が入力されていません。\n入力を終了しますか？',
        [
          { text: '入力を続ける', style: 'cancel' },
          { text: '終了して戻る', style: 'destructive', onPress: exitWithoutSave },
        ],
      );
      return;
    }

    // パターン 3: 入力済みデータあり → 確認して保存
    const doSave = async () => {
      const now = new Date().toISOString();
      const unit = settings.unit;

      const sessionExercises: ExerciseEntry[] = filledExercises.map((e) => {
        const validSets: SetEntry[] = e.sets
          .filter((s) => s.reps !== '' || s.weightKg !== '')
          .map((s) => {
            const reps = parseInt(s.reps, 10) || 0;
            const weightKg =
              unit === 'kg'
                ? parseFloat(s.weightKg) || 0
                : (parseFloat(s.weightKg) || 0) * 0.453592;
            return { reps, weightKg, completedAt: now };
          });
        return {
          exerciseId: e.exerciseId,
          exerciseName: e.exerciseName,
          timerPresets: e.timerSec
            ? [{ id: generateId(), label: 'last', mode: 'countdown' as const, durationSec: e.timerSec }]
            : [],
          sets: validSets,
          memo: e.memo?.trim() || undefined,
        };
      });

      const session: WorkoutSession = {
        id: existingSessionId ?? generateId(),
        startedAt: date ? dateToStartedAt(date) : new Date().toISOString(),
        finishedAt: now,
        templateId: sessionTemplateId ?? undefined,
        templateName: sessionTemplateName ?? undefined,
        exercises: sessionExercises,
      };

      await upsertSession(session);
      if (date) {
        const all = await getSessions();
        const toDelete = all.filter(
          (s) => s.id !== session.id && sessionMatchesDate(s, date),
        );
        if (toDelete.length > 0) {
          await saveSessions(all.filter((s) => !toDelete.some((d) => d.id === s.id)));
        }
      }
      hasUnsavedDataRef.current = false;
      setHasUnsavedData(false);
      setExercises([]);
      router.back();
    };

    Alert.alert('保存の確認', 'この内容で保存しますか？', [
      { text: '入力を続ける', style: 'cancel' },
      { text: '保存して戻る', onPress: doSave },
    ]);
  };

  return (
    <View style={[styles.container, {
      paddingBottom: keyboardOffset > 0 ? keyboardOffset + 80 : insets.bottom + 80,
    }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.length === 0 && (
          <View style={styles.emptyCard}>
            <FontAwesome name="plus-circle" size={36} color="#ddd" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>種目がありません</Text>
            <Text style={styles.emptyHint}>右下の ＋ ボタンで種目を追加</Text>
          </View>
        )}

        {exercises.map((ex, idx) => (
          <ExerciseCard
            key={`${ex.exerciseId}-${idx}`}
            exercise={ex}
            unit={settings.unit}
            timerSoundEnabled={settings.timerSoundEnabled}
            timerVibrationEnabled={settings.timerVibrationEnabled}
            onChange={(updated) => updateExercise(idx, updated)}
            onRemove={() => removeExercise(idx)}
            onNamePress={() => {
              router.push(`/exercise-history/${encodeURIComponent(ex.exerciseName)}` as never);
            }}
          />
        ))}

      </ScrollView>

      {/* 完了ボタン: キーボードの上に固定 */}
      <View style={[styles.footer, {
        bottom: keyboardOffset > 0 ? keyboardOffset : 0,
        paddingBottom: keyboardOffset > 0 ? 8 : insets.bottom + 8,
      }]}>
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>保存</Text>
        </Pressable>
      </View>

      {/* FAB */}
      <Pressable
        style={[styles.fab, {
          bottom: keyboardOffset > 0 ? keyboardOffset + 80 : insets.bottom + 80,
        }]}
        onPress={() => router.push('/workout/add-exercise' as never)}
      >
        <FontAwesome name="plus" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  footer: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555', marginBottom: 6 },
  emptyHint: { fontSize: 12, color: '#aaa', textAlign: 'center' },

  saveBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
