import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { deleteExercise, getExercises, getSettings, saveExercises, DEFAULT_CATEGORY_ORDER } from '@/src/lib/storage';
import type { Exercise } from '@/src/types';
import DraggableList from '@/src/components/DraggableList';

interface Section {
  title: string;
  data: Exercise[];
}

function buildSections(exercises: Exercise[], categoryOrder: string[]): Section[] {
  const order = categoryOrder.length > 0 ? categoryOrder : DEFAULT_CATEGORY_ORDER;
  const map = new Map<string, Exercise[]>();
  for (const cat of order) map.set(cat, []);

  for (const ex of exercises) {
    const cat = ex.category ?? 'その他';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(ex);
  }

  const sections: Section[] = [];
  for (const cat of order) {
    const data = map.get(cat) ?? [];
    if (data.length > 0) sections.push({ title: cat, data });
  }
  // その他カテゴリ（orderに含まれない）
  const other = exercises.filter((ex) => {
    const cat = ex.category ?? 'その他';
    return !order.includes(cat);
  });
  if (other.length > 0) sections.push({ title: 'その他', data: other });

  return sections;
}

export default function ExerciseListScreen() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);

  const load = useCallback(async () => {
    const [exercises, settings] = await Promise.all([getExercises(), getSettings()]);
    setSections(buildSections(exercises, settings?.categoryOrder ?? []));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = async (id: string) => {
    await deleteExercise(id);
    await load();
  };

  const handleReorder = async (sectionTitle: string, reorderedItems: Exercise[]) => {
    const allExercises = await getExercises();
    const others = allExercises.filter((e) => (e.category ?? 'その他') !== sectionTitle);
    await saveExercises([...others, ...reorderedItems]);
    await load();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list} contentContainerStyle={styles.content}>
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            <View style={styles.card}>
              <DraggableList
                data={section.data}
                keyExtractor={(item) => item.id}
                itemHeight={52}
                onReorder={(reordered) => handleReorder(section.title, reordered)}
                renderItem={(item, index, isDragging) => (
                  <View style={[styles.cardRow, index < section.data.length - 1 && styles.cardBorder, isDragging && styles.cardRowDragging]}>
                    <FontAwesome name="bars" size={15} color="#ccc" style={styles.dragHandle} />
                    <Pressable
                      style={styles.row}
                      onPress={() => router.push(`/exercise/${item.id}` as never)}
                    >
                      <Text style={styles.name}>{item.name}</Text>
                    </Pressable>
                    <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id)} hitSlop={8}>
                      <FontAwesome name="trash-o" size={17} color="#ef4444" />
                    </Pressable>
                  </View>
                )}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => router.push('/exercise/new' as never)}>
        <FontAwesome name="plus" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardRow: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
  },
  cardBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  cardRowDragging: {
    backgroundColor: '#f0f5ff',
  },

  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  name: { flex: 1, fontSize: 15 },

  deleteBtn: {
    padding: 10,
  },
  dragHandle: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
