import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getRecentSessions, getSettings, getTemplates } from '@/src/lib/storage';
import type { AppSettings } from '@/src/lib/storage';
import type { WorkoutSession, WorkoutTemplate } from '@/src/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDuration(startedAt: string, finishedAt: string): string {
  const diffMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}分`;
  return `${Math.floor(mins / 60)}時間${mins % 60}分`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getTemplates(), getSettings()]).then(([tmpl, s]) => {
        if (!active) return;
        setTemplates(tmpl);
        setSettings(s);
        getRecentSessions(s.recentSessionCount).then((sessions) => {
          if (active) setRecentSessions(sessions);
        });
      });
      return () => { active = false; };
    }, []),
  );

  function startFromTemplate(template: WorkoutTemplate) {
    router.push({
      pathname: '/(tabs)/workouts',
      params: { templateId: template.id, templateName: template.name },
    } as never);
  }

  function startBlank() {
    router.push('/(tabs)/workouts' as never);
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* ─── テンプレートから開始 ─── */}
      <Text style={styles.sectionTitle}>テンプレートから開始</Text>

      {templates.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>テンプレートがありません</Text>
          <Text style={styles.emptyHint}>設定タブ → テンプレート管理から作成できます</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSub}>
                  {item.exercises.length} 種目
                  {item.exercises.length > 0 &&
                    '  ·  ' + item.exercises.map((e) => e.name).join(', ')}
                </Text>
              </View>
              <Pressable
                style={styles.startBtn}
                onPress={() => startFromTemplate(item)}
              >
                <Text style={styles.startBtnText}>開始</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      {/* ─── 空白から開始 ─── */}
      <Pressable style={styles.blankBtn} onPress={startBlank}>
        <Text style={styles.blankBtnText}>＋ 空白から開始</Text>
      </Pressable>

      {/* ─── 最近のワークアウト ─── */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>最近のワークアウト</Text>

      {recentSessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>まだ記録がありません</Text>
          <Text style={styles.emptyHint}>ワークアウトを完了すると、ここに表示されます</Text>
        </View>
      ) : (
        recentSessions.map((session) => (
          <View key={session.id} style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {session.templateName ?? 'フリーワークアウト'}
              </Text>
              <Text style={styles.cardSub}>
                {formatDate(session.startedAt)}
                {session.finishedAt
                  ? '  ·  ' + formatDuration(session.startedAt, session.finishedAt)
                  : ''}
              </Text>
              <Text style={styles.cardSub}>
                {session.exercises.map((e) => e.exerciseName).join(', ')}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 3 },
  cardSub: { fontSize: 12, color: '#888', marginTop: 1 },

  startBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 10,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  blankBtn: {
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  blankBtnText: { color: '#007AFF', fontWeight: '600', fontSize: 15 },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555', marginBottom: 4 },
  emptyHint: { fontSize: 12, color: '#aaa', textAlign: 'center' },
});
