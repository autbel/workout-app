import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { getExercises, getSettings, getTemplates, DEFAULT_CATEGORY_ORDER } from '@/src/lib/storage';
import { useWorkoutStore } from '@/src/store/workoutStore';
import type { Exercise, WorkoutTemplate } from '@/src/types';

interface Section {
  title: string;
  data: Exercise[];
}

function buildSections(exercises: Exercise[], categoryOrder: string[]): Section[] {
  const map = new Map<string, Exercise[]>();

  for (const cat of categoryOrder) {
    map.set(cat, []);
  }
  for (const ex of exercises) {
    const cat = ex.category ?? 'その他';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(ex);
  }

  return Array.from(map.entries())
    .filter(([, items]) => items.length > 0)
    .map(([title, data]) => ({ title, data }));
}

export default function AddExerciseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addPending } = useWorkoutStore();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    Promise.all([getTemplates(), getExercises(), getSettings()]).then(
      ([tmpls, exs, settings]) => {
        setTemplates(tmpls);
        const order = settings.categoryOrder ?? DEFAULT_CATEGORY_ORDER;
        setSections(buildSections(exs, order));
      },
    );
  }, []);

  const handleTemplateSelect = (tmpl: WorkoutTemplate) => {
    addPending(tmpl.exercises, tmpl.id, tmpl.name);
    router.back();
  };

  const handleExerciseSelect = (ex: Exercise) => {
    addPending([ex]);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
    <SectionList
      style={styles.list}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled
      ListHeaderComponent={
        /* テンプレートセクション */
        <View style={styles.templateSection}>
          <Text style={styles.templateSectionLabel}>メニュー</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {templates.map((t) => (
              <Pressable
                key={t.id}
                style={styles.chip}
                onPress={() => handleTemplateSelect(t)}
              >
                <Text style={styles.chipText}>{t.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => handleExerciseSelect(item)}>
          <Text style={styles.rowText}>{item.name}</Text>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { flex: 1 },

  templateSection: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  templateSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chipRow: { paddingHorizontal: 12 },
  chip: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  chipText: { color: '#1d4ed8', fontWeight: '600', fontSize: 14 },

  sectionHeader: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
  },

  row: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  rowText: { fontSize: 15 },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#f0f0f0',
    marginLeft: 20,
  },
});
