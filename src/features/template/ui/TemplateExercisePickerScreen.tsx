import { useEffect, useState } from 'react';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_CATEGORY_ORDER, getExercises, getSettings } from '@/src/lib/storage';
import { useWorkoutStore } from '@/src/store/workoutStore';
import type { Exercise } from '@/src/types';

interface Section {
  title: string;
  data: Exercise[];
}

function buildSections(exercises: Exercise[], categoryOrder: string[]): Section[] {
  const map = new Map<string, Exercise[]>();
  for (const cat of categoryOrder) map.set(cat, []);
  for (const ex of exercises) {
    const cat = ex.category ?? 'その他';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(ex);
  }
  return Array.from(map.entries())
    .filter(([, items]) => items.length > 0)
    .map(([title, data]) => ({ title, data }));
}

export default function TemplateExercisePickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPickedTemplateExercise } = useWorkoutStore();

  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    Promise.all([getExercises(), getSettings()]).then(([all, settings]) => {
      const order = settings.categoryOrder ?? DEFAULT_CATEGORY_ORDER;
      setSections(buildSections(all, order));
    });
  }, []);

  const handleSelect = (ex: Exercise) => {
    setPickedTemplateExercise({ id: ex.id, name: ex.name });
    router.back();
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => handleSelect(item)}>
            <Text style={styles.rowText}>{item.name}</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  sectionHeader: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase' },

  row: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowText: { fontSize: 16 },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#f0f0f0',
    marginLeft: 20,
  },
});
