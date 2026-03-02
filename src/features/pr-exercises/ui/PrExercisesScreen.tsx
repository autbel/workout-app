import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { getExercises, getSettings, patchSettings } from '@/src/lib/storage';
import type { Exercise } from '@/src/types';
import DraggableList from '@/src/components/DraggableList';

const DEFAULT_PR = ['ベンチプレス', 'スクワット', 'デッドリフト'];

export default function PrExercisesScreen() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_PR);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSettings().then((s) => setSelected(s.prExercises ?? DEFAULT_PR));
      getExercises().then(setAllExercises);
    }, []),
  );

  const add = async (name: string) => {
    if (selected.length >= 3) return;
    const next = [...selected, name];
    setSelected(next);
    await patchSettings({ prExercises: next });
  };

  const remove = async (name: string) => {
    const next = selected.filter((n) => n !== name);
    setSelected(next);
    await patchSettings({ prExercises: next });
  };

  const handleReorder = async (newOrder: string[]) => {
    setSelected(newOrder);
    await patchSettings({ prExercises: newOrder });
  };

  const available = allExercises.filter((e) => !selected.includes(e.name));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 選択中 */}
      <Text style={styles.sectionTitle}>選択中 ({selected.length}/3)</Text>
      <View style={styles.card}>
        {selected.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.empty}>選択中の種目がありません</Text>
          </View>
        ) : (
          <DraggableList
            data={selected}
            keyExtractor={(name) => name}
            itemHeight={52}
            onReorder={handleReorder}
            renderItem={(name, index, isDragging) => (
              <View style={[styles.row, index < selected.length - 1 && styles.rowBorder, isDragging && styles.rowDragging]}>
                <FontAwesome name="bars" size={15} color="#ccc" style={styles.dragHandle} />
                <Text style={styles.rowLabel}>{name}</Text>
                <Pressable onPress={() => remove(name)} hitSlop={12}>
                  <FontAwesome name="times-circle" size={20} color="#c0392b" />
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      {/* 追加できる種目 */}
      {selected.length < 3 && (
        <>
          <Text style={styles.sectionTitle}>種目を追加</Text>
          <View style={styles.card}>
            {available.length === 0 ? (
              <View style={styles.row}>
                <Text style={styles.empty}>追加できる種目がありません</Text>
              </View>
            ) : (
              available.map((ex, index) => (
                <Pressable
                  key={ex.id}
                  style={[styles.row, index < available.length - 1 && styles.rowBorder]}
                  onPress={() => add(ex.name)}
                >
                  <FontAwesome name="plus-circle" size={16} color="#2563eb" style={styles.icon} />
                  <Text style={styles.rowLabel}>{ex.name}</Text>
                </Pressable>
              ))
            )}
          </View>
        </>
      )}

      {selected.length >= 3 && (
        <Text style={styles.hint}>最大3種目まで選択できます。× で削除してから追加してください。</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  rowDragging: { backgroundColor: '#f0f5ff' },
  rowLabel: { flex: 1, fontSize: 15 },
  dragHandle: { marginRight: 12 },
  empty: { fontSize: 14, color: '#aaa' },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
