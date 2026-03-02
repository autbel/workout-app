import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';

import { getExercises, getSessions, DEFAULT_CATEGORY_ORDER } from '@/src/lib/storage';
import HistoryGraphView from './HistoryGraphView';
import type { Exercise, WorkoutSession } from '@/src/types';

type MarkedDates = Record<string, { marked: boolean; dotColor: string }>;
type Mode = 'calendar' | 'graph';

const BIG3 = 'Big3';
const BIG3_EXERCISES = ['ベンチプレス', 'スクワット', 'デッドリフト'];

/** 種目マスターからカテゴリ → 種目名[] のマップを構築（Big3を先頭に固定） */
function buildCategoryExerciseMap(exercises: Exercise[]): Map<string, string[]> {
  const map = new Map<string, string[]>([[BIG3, BIG3_EXERCISES]]);
  // デフォルト順でカテゴリを初期化
  for (const cat of DEFAULT_CATEGORY_ORDER) {
    map.set(cat, []);
  }
  for (const ex of exercises) {
    const cat = ex.category ?? 'その他';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(ex.name);
  }
  // 空のカテゴリを除去（Big3は常に残す）
  for (const [cat, names] of map.entries()) {
    if (cat !== BIG3 && names.length === 0) map.delete(cat);
  }
  return map;
}

function getMarkedDates(sessions: WorkoutSession[], exerciseName: string | null): MarkedDates {
  const marks: MarkedDates = {};
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    if (exerciseName === null && s.exercises.length === 0) continue;
    const hasExercise =
      exerciseName === null || s.exercises.some((e) => e.exerciseName === exerciseName);
    if (hasExercise) {
      const d = new Date(s.startedAt);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      marks[dateStr] = { marked: true, dotColor: '#2563eb' };
    }
  }
  return marks;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('calendar');
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(BIG3);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);
  const navigatingToWorkoutRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const fromWorkout = navigatingToWorkoutRef.current;
      navigatingToWorkoutRef.current = false;

      setMode('calendar');
      if (!fromWorkout) {
        setCalendarKey((k) => k + 1);
      }
      getSessions().then(setSessions);
      getExercises().then(setExercises);
    }, []),
  );

  const categoryExerciseMap = useMemo(() => buildCategoryExerciseMap(exercises), [exercises]);
  const categories = useMemo(() => Array.from(categoryExerciseMap.keys()), [categoryExerciseMap]);

  const exercisesInCategory = useMemo(
    () => categoryExerciseMap.get(selectedCategory) ?? [],
    [selectedCategory, categoryExerciseMap],
  );

  const markedDates = useMemo(
    () => getMarkedDates(sessions, selectedExercise),
    [sessions, selectedExercise],
  );

  const handleCategoryPress = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedExercise(null);
  };

  const handleDayPress = (day: DateData) => {
    navigatingToWorkoutRef.current = true;
    router.push(`/workout/${day.dateString}` as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ─ 部位（1行均等） ─ */}
      <View style={styles.categoryBar}>
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <Pressable
              key={cat}
              style={[styles.catBtn, active && styles.catBtnActive]}
              onPress={() => handleCategoryPress(cat)}
            >
              <Text style={[styles.catText, active && styles.catTextActive]}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ─ 種目（横スクロール、選択部位でフィルタ） ─ */}
      <View style={styles.exerciseBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.exerciseRow}
        >
          <Pressable
            style={[styles.exChip, selectedExercise === null && styles.exChipActive]}
            onPress={() => setSelectedExercise(null)}
          >
            <Text style={[styles.exChipText, selectedExercise === null && styles.exChipTextActive]}>
              ALL
            </Text>
          </Pressable>
          {exercisesInCategory.map((name) => (
            <Pressable
              key={name}
              style={[styles.exChip, selectedExercise === name && styles.exChipActive]}
              onPress={() => setSelectedExercise(name)}
            >
              <Text style={[styles.exChipText, selectedExercise === name && styles.exChipTextActive]}>
                {name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ─ カレンダー/グラフ切り替え ─ */}
      <View style={styles.segmentWrapper}>
        <View style={styles.segment}>
          <Pressable
            style={[styles.segBtn, mode === 'calendar' && styles.segBtnActive]}
            onPress={() => setMode('calendar')}
          >
            <Text style={[styles.segText, mode === 'calendar' && styles.segTextActive]}>
              カレンダー
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segBtn, mode === 'graph' && styles.segBtnActive]}
            onPress={() => setMode('graph')}
          >
            <Text style={[styles.segText, mode === 'graph' && styles.segTextActive]}>
              グラフ
            </Text>
          </Pressable>
        </View>
      </View>

      {mode === 'calendar' ? (
        <Calendar
          key={calendarKey}
          style={styles.calendar}
          markedDates={markedDates}
          onDayPress={handleDayPress}
          theme={{
            todayTextColor: '#2563eb',
            arrowColor: '#2563eb',
            dotColor: '#2563eb',
            monthTextColor: '#1e293b',
            textMonthFontWeight: '700',
            textDayFontSize: 14,
            textMonthFontSize: 16,
          }}
        />
      ) : (
        <HistoryGraphView
          sessions={sessions}
          selectedExercise={selectedExercise}
          exercisesInCategory={exercisesInCategory}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  /* 部位バー: 1行均等 */
  categoryBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  catBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  catBtnActive: {
    borderBottomColor: '#2563eb',
  },
  catText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  catTextActive: { color: '#2563eb' },

  /* 種目バー: 横スクロール */
  exerciseBar: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  exerciseRow: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  exChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exChipActive: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  exChipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  exChipTextActive: { color: '#1d4ed8', fontWeight: '700' },

  segmentWrapper: { paddingHorizontal: 16, paddingVertical: 10 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 3,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  segBtnActive: { backgroundColor: '#fff' },
  segText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  segTextActive: { color: '#111827' },

  calendar: {
    borderRadius: 12,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
