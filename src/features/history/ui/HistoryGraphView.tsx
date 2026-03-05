import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { WorkoutSession } from '@/src/types';
import WorkoutProgressChart, {
  COLOR_RM,
  COLOR_WEIGHT,
  type WorkoutProgressDataPoint,
} from './WorkoutProgressChart';

interface Props {
  sessions: WorkoutSession[];
  selectedExercise?: string | null;
  exercisesInCategory?: string[];
}

/** Epley 式による推定1RM */
function epley1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** 日付からその週の日曜日を YYYY-MM-DD 文字列で返す */
function getSundayKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=日, 1=月, ..., 6=土
  d.setDate(d.getDate() - dow); // 日曜日に戻す
  return d.toISOString().slice(0, 10);
}

/** 種目名でフィルタして週単位の最大1RM・最大重量を返す */
function buildChartData(
  sessions: WorkoutSession[],
  exerciseName: string,
): WorkoutProgressDataPoint[] {
  const sorted = [...sessions].sort((a, b) =>
    a.startedAt < b.startedAt ? -1 : 1,
  );

  const relevant = sorted.filter(
    (s) => s.finishedAt && s.exercises.some((e) => e.exerciseName === exerciseName),
  );
  if (relevant.length === 0) return [];

  const byWeek = new Map<string, { rm: number | null; weight: number | null; date: Date }>();

  for (const session of sorted) {
    if (!session.finishedAt) continue;
    const entry = session.exercises.find((e) => e.exerciseName === exerciseName);
    if (!entry) continue;

    const sessionDate = new Date(session.startedAt);
    const weekKey     = getSundayKey(sessionDate);
    const current     = byWeek.get(weekKey) ?? { rm: null, weight: null, date: sessionDate };

    for (const s of entry.sets) {
      if (s.weightKg > 0 && s.reps > 0) {
        const rm = epley1RM(s.weightKg, s.reps);
        if (current.rm === null || rm > current.rm) {
          current.rm   = rm;
          current.date = sessionDate;
        }
        if (current.weight === null || s.weightKg > current.weight) {
          current.weight = s.weightKg;
        }
      }
    }
    byWeek.set(weekKey, current);
  }

  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      date:      v.date,
      oneRM:     v.rm !== null ? Math.round(v.rm * 10) / 10 : null,
      maxWeight: v.weight,
    }));
}

function ChartHeader({ title, showLegend }: { title: string; showLegend: boolean }) {
  return (
    <View style={styles.chartHeader}>
      <Text style={styles.exerciseName}>{title}</Text>
      {showLegend && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { borderColor: COLOR_RM }]} />
            <Text style={styles.legendText}>推定1RM</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { borderColor: COLOR_WEIGHT }]} />
            <Text style={styles.legendText}>最大重量</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/** 単一種目チャートカード（ALL一覧用コンパクト版） */
function ExerciseChart({
  sessions,
  exerciseName,
  xStart,
  xEnd,
}: {
  sessions: WorkoutSession[];
  exerciseName: string;
  xStart: Date;
  xEnd: Date;
}) {
  const chartData = useMemo(
    () => buildChartData(sessions, exerciseName),
    [sessions, exerciseName],
  );

  return (
    <View style={styles.compactChartContainer}>
      <ChartHeader title={exerciseName} showLegend={chartData.length >= 2} />
      <WorkoutProgressChart data={chartData} chartHeight={110} xStart={xStart} xEnd={xEnd} />
    </View>
  );
}

export default function HistoryGraphView({
  sessions,
  selectedExercise,
  exercisesInCategory = [],
}: Props) {
  const singleData = useMemo(
    () => (selectedExercise ? buildChartData(sessions, selectedExercise) : null),
    [sessions, selectedExercise],
  );

  // 全セッションの最古日付（X軸左端の共通基準）
  const globalMinDate = useMemo(() => {
    const dates = sessions
      .filter((s) => s.finishedAt)
      .map((s) => new Date(s.startedAt).getTime());
    return dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
  }, [sessions]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // 種目指定あり → 単一グラフ
  if (selectedExercise && singleData) {
    return (
      <View style={styles.container}>
        <View style={styles.chartContainer}>
          <ChartHeader title={selectedExercise} showLegend={singleData.length >= 2} />
          <WorkoutProgressChart data={singleData} chartHeight={260} xStart={globalMinDate} xEnd={today} />
        </View>
      </View>
    );
  }

  // ALL選択 → カテゴリ内全種目を縦積み表示
  if (exercisesInCategory.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>ワークアウトを記録するとグラフが表示されます</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.allContent}>
      {exercisesInCategory.map((name) => (
        <ExerciseChart key={name} sessions={sessions} exerciseName={name} xStart={globalMinDate} xEnd={today} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  allContent:  { paddingBottom: 24 },

  chartContainer: {
    backgroundColor:  '#fff',
    margin:           12,
    marginBottom:     0,
    borderRadius:     12,
    paddingHorizontal: 12,
    paddingTop:       8,
    paddingBottom:    4,
    shadowColor:      '#000',
    shadowOpacity:    0.06,
    shadowRadius:     4,
    shadowOffset:     { width: 0, height: 2 },
    elevation:        2,
  },
  compactChartContainer: {
    backgroundColor:  '#fff',
    marginHorizontal: 12,
    marginTop:        6,
    borderRadius:     12,
    paddingHorizontal: 10,
    paddingTop:       6,
    paddingBottom:    4,
    shadowColor:      '#000',
    shadowOpacity:    0.06,
    shadowRadius:     4,
    shadowOffset:     { width: 0, height: 2 },
    elevation:        2,
  },
  chartHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  exerciseName: { fontSize: 13, fontWeight: '700', color: '#1e293b' },

  legend:     { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.5, backgroundColor: 'white' },
  legendText: { fontSize: 10, color: '#6b7280' },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText:  { color: '#aaa', fontSize: 14, textAlign: 'center' },
});
