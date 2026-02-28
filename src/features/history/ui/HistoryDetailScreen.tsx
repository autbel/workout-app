import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSessions } from '@/src/lib/storage';
import type { WorkoutSession } from '@/src/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(startedAt: string, finishedAt?: string): string {
  if (!finishedAt) return '-';
  const mins = Math.floor(
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000,
  );
  if (mins < 60) return `${mins}分`;
  return `${Math.floor(mins / 60)}時間${mins % 60}分`;
}

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const [session, setSession] = useState<WorkoutSession | null>(null);

  useEffect(() => {
    getSessions().then((all) => {
      const found = all.find((s) => s.id === id);
      if (found) {
        setSession(found);
        navigation.setOptions({
          title: found.templateName ?? 'フリーワークアウト',
        });
      }
    });
  }, [id, navigation]);

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  function handleCopyAndStart() {
    if (!session) return;
    Alert.alert(
      'コピーして開始',
      `「${session.templateName ?? 'フリーワークアウト'}」の種目をコピーして新しいワークアウトを開始しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '開始する',
          onPress: () =>
            router.replace({
              pathname: '/(tabs)/workouts',
              params: {
                copyFromSessionId: session!.id,
                templateName: session!.templateName ?? 'コピー',
              },
            } as never),
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* ─── ヘッダー情報 ─── */}
      <View style={styles.infoCard}>
        <Row label="日時" value={formatDate(session.startedAt)} />
        <Row label="時間" value={formatDuration(session.startedAt, session.finishedAt)} />
        <Row label="種目数" value={`${session.exercises.length} 種目`} />
        <Row
          label="合計セット"
          value={`${session.exercises.reduce((s, e) => s + e.sets.length, 0)} セット`}
        />
      </View>

      {/* ─── 種目ごとの詳細 ─── */}
      {session.exercises.map((ex) => (
        <View key={ex.exerciseId} style={styles.exCard}>
          <Text style={styles.exName}>{ex.exerciseName}</Text>
          <View style={styles.setHeader}>
            <Text style={styles.setCol}>#</Text>
            <Text style={[styles.setCol, { flex: 1 }]}>回数</Text>
            <Text style={[styles.setCol, { flex: 1 }]}>重量 (kg)</Text>
          </View>
          {ex.sets.map((s, i) => (
            <View key={i} style={styles.setRow}>
              <Text style={styles.setCol}>{i + 1}</Text>
              <Text style={[styles.setCol, { flex: 1 }]}>{s.reps} 回</Text>
              <Text style={[styles.setCol, { flex: 1 }]}>{s.weightKg} kg</Text>
            </View>
          ))}
        </View>
      ))}

      {/* ─── コピーして開始 ─── */}
      <Pressable style={styles.copyBtn} onPress={handleCopyAndStart}>
        <Text style={styles.copyBtnText}>このメニューをコピーして開始</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 48 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#aaa', fontSize: 14 },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontSize: 14, color: '#888' },
  infoValue: { fontSize: 14, fontWeight: '600' },

  exCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  exName: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  setHeader: { flexDirection: 'row', marginBottom: 4 },
  setCol: { width: 40, fontSize: 13, color: '#aaa' },
  setRow: { flexDirection: 'row', paddingVertical: 4 },

  copyBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  copyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
