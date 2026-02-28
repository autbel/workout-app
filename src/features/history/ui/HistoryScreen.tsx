import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getSessions } from '@/src/lib/storage';
import type { WorkoutSession } from '@/src/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(startedAt: string, finishedAt?: string): string {
  if (!finishedAt) return '';
  const mins = Math.floor((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000);
  if (mins < 60) return `${mins}分`;
  return `${Math.floor(mins / 60)}時間${mins % 60}分`;
}

function totalSets(session: WorkoutSession): number {
  return session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
}

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSessions().then((all) => {
        if (!active) return;
        const sorted = [...all]
          .filter((s) => s.finishedAt != null)
          .sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1));
        setSessions(sorted);
      });
      return () => { active = false; };
    }, []),
  );

  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>まだ記録がありません</Text>
        <Text style={styles.emptyHint}>ワークアウトを完了すると、ここに表示されます</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } } as never)}
        >
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>{item.templateName ?? 'フリーワークアウト'}</Text>
            <Text style={styles.cardDuration}>{formatDuration(item.startedAt, item.finishedAt)}</Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(item.startedAt)}</Text>
          <Text style={styles.cardExercises} numberOfLines={1}>
            {item.exercises.map((e) => e.exerciseName).join(' · ')}
          </Text>
          <Text style={styles.cardSets}>{totalSets(item)} セット</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 8 },
  emptyHint: { fontSize: 13, color: '#aaa', textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  cardDuration: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  cardDate: { fontSize: 12, color: '#aaa', marginTop: 3 },
  cardExercises: { fontSize: 13, color: '#666', marginTop: 6 },
  cardSets: { fontSize: 12, color: '#aaa', marginTop: 4 },
});
