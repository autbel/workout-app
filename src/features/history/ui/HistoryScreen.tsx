import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { getExercises, getSessions, getSettings, DEFAULT_CATEGORY_ORDER } from '@/src/lib/storage';
import HistoryGraphView from './HistoryGraphView';
import type { Exercise, WorkoutSession } from '@/src/types';

const BIG3 = 'Big3';
const BIG3_EXERCISES = ['ベンチプレス', 'スクワット', 'デッドリフト'];

/** 種目マスターからカテゴリ → 種目名[] のマップを構築（Big3を先頭に固定） */
function buildCategoryExerciseMap(exercises: Exercise[], categoryOrder: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>([[BIG3, BIG3_EXERCISES]]);
  for (const cat of categoryOrder) {
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

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(BIG3);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[]>(DEFAULT_CATEGORY_ORDER);
  const exerciseScrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      setSelectedCategory(BIG3);
      setSelectedExercise(null);
      exerciseScrollRef.current?.scrollTo({ x: 0, animated: false });
      getSessions().then(setSessions);
      getExercises().then(setExercises);
      getSettings().then((s) => setCategoryOrder(s.categoryOrder ?? DEFAULT_CATEGORY_ORDER));
    }, []),
  );

  const categoryExerciseMap = useMemo(
    () => buildCategoryExerciseMap(exercises, categoryOrder),
    [exercises, categoryOrder],
  );
  const categories = useMemo(() => Array.from(categoryExerciseMap.keys()), [categoryExerciseMap]);

  const exercisesInCategory = useMemo(
    () => categoryExerciseMap.get(selectedCategory) ?? [],
    [selectedCategory, categoryExerciseMap],
  );

  const handleCategoryPress = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedExercise(null);
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
          ref={exerciseScrollRef}
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

      <HistoryGraphView
        sessions={sessions}
        selectedExercise={selectedExercise}
        exercisesInCategory={exercisesInCategory}
      />
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
});
