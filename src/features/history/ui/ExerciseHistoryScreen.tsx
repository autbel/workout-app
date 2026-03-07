import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { getSessions, getSettings } from '@/src/lib/storage';
import { useWorkoutStore } from '@/src/store/workoutStore';
import type { WorkoutSession } from '@/src/types';

interface SessionRecord {
  session: WorkoutSession;
  sets: { reps: number; weightKg: number }[];
  dateLabel: string;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function ExerciseHistoryScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setCopiedSets } = useWorkoutStore();

  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');

  useFocusEffect(
    useCallback(() => {
      Promise.all([getSessions(), getSettings()]).then(([sessions, settings]) => {
        setUnit(settings.unit);
        const filtered = sessions
          .filter((s) => s.finishedAt && s.exercises.some((e) => e.exerciseName === name))
          .sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1));

        setRecords(
          filtered.map((s) => {
            const entry = s.exercises.find((e) => e.exerciseName === name)!;
            return {
              session: s,
              sets: entry.sets.filter((set) => set.reps > 0 || set.weightKg > 0),
              dateLabel: formatDate(s.startedAt),
            };
          }),
        );
      });
    }, [name]),
  );

  const handleCopy = (rec: SessionRecord) => {
    setCopiedSets({
      exerciseName: name!,
      sets: rec.sets.map((s) => ({
        reps: s.reps > 0 ? String(s.reps) : '',
        weightKg: s.weightKg > 0 ? String(s.weightKg) : '',
      })),
    });
    router.back();
  };

  const formatWeight = (kg: number): string => {
    if (unit === 'lb') {
      return `${Math.round(kg * 2.20462 * 10) / 10} lb`;
    }
    return `${kg} kg`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {records.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>記録がありません</Text>
          </View>
        ) : (
          records.map((rec) => (
            <View key={rec.session.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.dateLabel}>{rec.dateLabel}</Text>
                <Pressable style={styles.copyBtn} onPress={() => handleCopy(rec)}>
                  <FontAwesome name="copy" size={12} color="#2563eb" />
                  <Text style={styles.copyBtnText}>コピー</Text>
                </Pressable>
              </View>

              <View style={styles.setHeader}>
                <Text style={[styles.colLabel, { width: 40 }]}>セット</Text>
                <Text style={[styles.colLabel, { width: 90 }]}>重量</Text>
                <Text style={styles.colLabel}>回数</Text>
              </View>

              {rec.sets.length === 0 ? (
                <Text style={styles.noSets}>記録なし</Text>
              ) : (
                rec.sets.map((s, i) => (
                  <View key={i} style={styles.setRow}>
                    <Text style={styles.setIndex}>{i + 1}</Text>
                    <Text style={styles.setValue}>{formatWeight(s.weightKg)}</Text>
                    <Text style={styles.setValue}>{s.reps} 回</Text>
                  </View>
                ))
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#aaa', fontSize: 14 },

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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  copyBtnText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },

  setHeader: { flexDirection: 'row', marginBottom: 4 },
  colLabel: { fontSize: 11, color: '#aaa', fontWeight: '600' },

  setRow: { flexDirection: 'row', paddingVertical: 4 },
  setIndex: { width: 40, fontSize: 13, color: '#aaa' },
  setValue: { width: 90, fontSize: 14, color: '#1e293b' },

  noSets: { fontSize: 13, color: '#aaa', paddingVertical: 4 },
});
