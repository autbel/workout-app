import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { generateId } from '@/src/lib/id';
import { getSessions, getSettings, getTemplates, upsertSession } from '@/src/lib/storage';
import ExercisePicker from '@/src/components/ExercisePicker';
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
}

// ─── Sub-components ──────────────────────────────────────

function isValidDecimal(v: string) {
  // 末尾の小数点（"60." など）も入力中の中間状態として許容
  return v === '' || /^\d+\.?\d*$/.test(v);
}
function isValidInt(v: string) {
  return v === '' || /^\d+$/.test(v);
}

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

  return (
    <View style={rowStyles.wrapper}>
      <View style={rowStyles.container}>
        <Text style={rowStyles.index}>{index + 1}</Text>
        {/* 重量 → 回数 の順 */}
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
      </View>
      {weightError && <Text style={rowStyles.errorText}>重量は数値で入力してください</Text>}
      {repsError && <Text style={rowStyles.errorText}>回数は整数で入力してください</Text>}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  wrapper: { marginBottom: 8 },
  container: { flexDirection: 'row', alignItems: 'center' },
  index: { width: 20, fontSize: 13, color: '#aaa', textAlign: 'right', marginRight: 8 },
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
  inputError: {
    borderColor: '#e53e3e',
    backgroundColor: '#fff5f5',
  },
  errorText: { fontSize: 11, color: '#e53e3e', marginLeft: 28, marginTop: 2 },
  unit: { fontSize: 13, color: '#888', marginHorizontal: 4 },
});

// ─── ExerciseCard ─────────────────────────────────────────

function ExerciseCard({
  exercise,
  unit,
  onChange,
  onRemove,
}: {
  exercise: DraftExercise;
  unit: 'kg' | 'lb';
  onChange: (updated: DraftExercise) => void;
  onRemove: () => void;
}) {
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
      <View style={cardStyles.header}>
        <Text style={cardStyles.name}>{exercise.exerciseName}</Text>
        <Pressable onPress={onRemove} hitSlop={12}>
          <FontAwesome name="times" size={16} color="#ccc" />
        </Pressable>
      </View>

      <View style={cardStyles.setHeader}>
        <Text style={[cardStyles.colLabel, { width: 28 }]}>#</Text>
        <Text style={[cardStyles.colLabel, { width: 64, textAlign: 'center' }]}>重量 ({unit})</Text>
        <Text style={[cardStyles.colLabel, { width: 80, textAlign: 'center', marginLeft: 28 }]}>回数</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: '700' },
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
});

// ─── Main Screen ─────────────────────────────────────────

export default function WorkoutsScreen() {
  const { templateId, templateName, copyFromSessionId } = useLocalSearchParams<{
    templateId?: string;
    templateName?: string;
    copyFromSessionId?: string;
  }>();
  const navigation = useNavigation();
  const router = useRouter();

  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    unit: 'kg',
    recentSessionCount: 3,
    timerSoundEnabled: true,
    timerVibrationEnabled: true,
  });
  const [pickerVisible, setPickerVisible] = useState(false);
  const startedAt = useRef(new Date().toISOString());

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  // テンプレートがあれば読み込む
  useEffect(() => {
    if (copyFromSessionId) {
      // 履歴からコピー
      getSessions().then((all) => {
        const session = all.find((s) => s.id === copyFromSessionId);
        if (!session) return;
        setExercises(
          session.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            sets: [{ id: generateId(), reps: '', weightKg: '' }],
          })),
        );
      });
    } else if (templateId) {
      // テンプレートから開始
      getTemplates().then((all) => {
        const tmpl = all.find((t) => t.id === templateId);
        if (!tmpl) return;
        setExercises(
          tmpl.exercises.map((e) => ({
            exerciseId: e.id,
            exerciseName: e.name,
            sets: [{ id: generateId(), reps: '', weightKg: '' }],
          })),
        );
      });
    }
  }, [templateId, copyFromSessionId]);

  useEffect(() => {
    navigation.setOptions({
      title: templateName ?? 'フリーワークアウト',
    });
  }, [templateName, navigation]);

  const updateExercise = (idx: number, updated: DraftExercise) => {
    setExercises((prev) => prev.map((e, i) => (i === idx ? updated : e)));
  };

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const addExercise = (picked: { id: string; name: string }) => {
    setExercises((prev) => [
      ...prev,
      { exerciseId: picked.id, exerciseName: picked.name, sets: [{ id: generateId(), reps: '', weightKg: '' }] },
    ]);
  };

  const handleFinish = async () => {
    const hasError = exercises.some((e) =>
      e.sets.some((s) => !isValidDecimal(s.weightKg) || !isValidInt(s.reps)),
    );
    if (hasError) {
      Alert.alert('入力エラー', '正しい数値を入力してください');
      return;
    }

    const filledExercises = exercises.filter((e) => e.sets.some((s) => s.reps !== '' || s.weightKg !== ''));
    if (filledExercises.length === 0) {
      Alert.alert('確認', 'セットが記録されていません。終了しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '終了する', style: 'destructive', onPress: () => router.replace('/(tabs)/' as never) },
      ]);
      return;
    }

    const now = new Date().toISOString();
    const unit = settings.unit;

    const sessionExercises: ExerciseEntry[] = filledExercises.map((e) => {
      const validSets: SetEntry[] = e.sets
        .filter((s) => s.reps !== '' || s.weightKg !== '')
        .map((s) => {
          const reps = parseInt(s.reps, 10) || 0;
          const weightKg = unit === 'kg'
            ? parseFloat(s.weightKg) || 0
            : (parseFloat(s.weightKg) || 0) * 0.453592;
          return { reps, weightKg, completedAt: now };
        });
      return {
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        timerPresets: [],
        sets: validSets,
      };
    });

    const session: WorkoutSession = {
      id: generateId(),
      startedAt: startedAt.current,
      finishedAt: now,
      templateId: templateId ?? undefined,
      templateName: templateName ?? undefined,
      exercises: sessionExercises,
    };

    await upsertSession(session);
    Alert.alert('完了！', 'ワークアウトを保存しました', [
      { text: 'OK', onPress: () => router.replace('/(tabs)/' as never) },
    ]);
  };

  const weightLabel = settings.unit === 'kg' ? 'kg' : 'lb';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {exercises.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>種目がありません</Text>
            <Text style={styles.emptyHint}>下の「種目を追加」から追加してください</Text>
          </View>
        )}

        {exercises.map((ex, idx) => (
          <ExerciseCard
            key={ex.exerciseId}
            exercise={ex}
            unit={weightLabel as 'kg' | 'lb'}
            onChange={(updated) => updateExercise(idx, updated)}
            onRemove={() => removeExercise(idx)}
          />
        ))}

        <Pressable style={styles.addExBtn} onPress={() => setPickerVisible(true)}>
          <FontAwesome name="plus" size={14} color="#2563eb" />
          <Text style={styles.addExBtnText}>種目を追加</Text>
        </Pressable>

        {/* 完了ボタン */}
        <Pressable style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>ワークアウトを完了</Text>
        </Pressable>
      </ScrollView>

      <ExercisePicker
        visible={pickerVisible}
        alreadyAdded={exercises.map((e) => e.exerciseId)}
        onSelect={addExercise}
        onClose={() => setPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555', marginBottom: 4 },
  emptyHint: { fontSize: 12, color: '#aaa', textAlign: 'center' },

  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  addExBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },

  finishBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  finishBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
