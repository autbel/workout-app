import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';

import { getSettings, getSessions } from '@/src/lib/storage';

type MarkedDates = Record<string, { marked: boolean; dotColor: string }>;

const DEFAULT_PR = ['ベンチプレス', 'スクワット', 'デッドリフト'];

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [calendarKey, setCalendarKey] = useState(0);
  const [maxWeights, setMaxWeights] = useState<Record<string, number>>({});
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [prExercises, setPrExercises] = useState<string[]>(DEFAULT_PR);
  const today = todayString();

  useFocusEffect(
    useCallback(() => {
      setCalendarKey((k) => k + 1);
      Promise.all([getSettings(), getSessions()]).then(([s, sessions]) => {
        const prEx = s.prExercises ?? DEFAULT_PR;
        setUnit(s.unit);
        setPrExercises(prEx);

        const marks: MarkedDates = {};
        const maxW: Record<string, number> = {};

        for (const session of sessions) {
          if (!session.finishedAt) continue;
          for (const e of session.exercises) {
            if (prEx.includes(e.exerciseName)) {
              for (const set of e.sets) {
                if (set.weightKg > (maxW[e.exerciseName] ?? 0)) {
                  maxW[e.exerciseName] = set.weightKg;
                }
              }
            }
          }
          if (session.exercises.length > 0) {
            const d = new Date(session.startedAt);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            marks[dateStr] = { marked: true, dotColor: '#2563eb' };
          }
        }

        setMarkedDates(marks);
        setMaxWeights(maxW);
      });
    }, []),
  );

  const handleStartToday = () => {
    router.push(`/workout/${today}` as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.navigate('/(tabs)/history' as never)}>
        <Calendar
          key={calendarKey}
          style={styles.calendar}
          markedDates={markedDates}
          theme={{
            todayTextColor: '#2563eb',
            arrowColor: '#2563eb',
            dotColor: '#2563eb',
            monthTextColor: '#1e293b',
            textMonthFontWeight: '700',
            textDayFontSize: 12,
            textMonthFontSize: 14,
          }}
        />
      </Pressable>

      {/* Big3 最大重量 */}
      <View style={styles.big3Section}>
        <Text style={styles.sectionTitle}>自己記録（最大重量）</Text>
        <View style={styles.big3Row}>
          {prExercises.map((name) => {
            const kg = maxWeights[name];
            const display =
              kg == null
                ? '–'
                : unit === 'lb'
                  ? `${Math.round(kg * 2.20462 * 10) / 10} lb`
                  : `${kg} kg`;
            return (
              <View key={name} style={styles.big3Card}>
                <Text style={styles.big3Name}>{name}</Text>
                <Text style={styles.big3Value}>{display}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.startBtn} onPress={handleStartToday}>
          <Text style={styles.startBtnText}>今日の筋トレを開始</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  calendar: {
    borderRadius: 12,
    margin: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  big3Section: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  big3Row: {
    flexDirection: 'row',
    gap: 8,
  },
  big3Card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  big3Name: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textAlign: 'center',
  },
  big3Value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  startBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
