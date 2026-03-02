import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import type { WorkoutSession } from '@/src/types';

interface Props {
  sessions: WorkoutSession[];
  selectedExercise?: string | null;
  exercisesInCategory?: string[];
}

interface DataPoint {
  value: number;
  label: string;
  dataPointText: string;
}

interface ChartPair {
  rm: DataPoint[];
  weight: DataPoint[];
}

/** Epley 式による推定1RM */
function epley1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** 種目名でフィルタして日付別の最大1RM・最大重量を返す */
function buildChartData(sessions: WorkoutSession[], exerciseName: string): ChartPair {
  const byDate = new Map<string, { rm: number; weight: number }>();

  const sorted = [...sessions].sort((a, b) =>
    a.startedAt < b.startedAt ? -1 : 1,
  );

  for (const session of sorted) {
    if (!session.finishedAt) continue;
    const entry = session.exercises.find((e) => e.exerciseName === exerciseName);
    if (!entry) continue;
    const d = new Date(session.startedAt);
    const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const current = byDate.get(dateStr) ?? { rm: 0, weight: 0 };
    for (const s of entry.sets) {
      const rm = epley1RM(s.weightKg, s.reps);
      if (rm > current.rm) current.rm = rm;
      if (s.weightKg > current.weight) current.weight = s.weightKg;
    }
    byDate.set(dateStr, current);
  }

  const entries = Array.from(byDate.entries());
  return {
    rm: entries.map(([label, v]) => ({
      value: Math.round(v.rm * 10) / 10,
      label,
      dataPointText: String(Math.round(v.rm)),
    })),
    weight: entries.map(([label, v]) => ({
      value: Math.round(v.weight * 10) / 10,
      label,
      dataPointText: String(Math.round(v.weight)),
    })),
  };
}

const COLOR_RM = '#2563eb';
const COLOR_WEIGHT = '#16a34a';

function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: COLOR_RM }]} />
        <Text style={styles.legendText}>推定1RM</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: COLOR_WEIGHT }]} />
        <Text style={styles.legendText}>最大重量</Text>
      </View>
    </View>
  );
}

/** 単一種目チャートカード */
function ExerciseChart({
  sessions,
  exerciseName,
}: {
  sessions: WorkoutSession[];
  exerciseName: string;
}) {
  const { rm, weight } = useMemo(
    () => buildChartData(sessions, exerciseName),
    [sessions, exerciseName],
  );

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.exerciseName}>{exerciseName}</Text>
      {rm.length < 2 ? (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>データが2件以上必要です</Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={rm}
              data2={weight}
              width={Math.max(280, rm.length * 60)}
              height={160}
              color={COLOR_RM}
              color2={COLOR_WEIGHT}
              thickness={2}
              thickness2={2}
              dataPointsColor={COLOR_RM}
              dataPointsColor2={COLOR_WEIGHT}
              dataPointsRadius={4}
              dataPointsRadius2={4}
              showTextOnFocus
              textColor="#333"
              textFontSize={11}
              xAxisLabelTextStyle={{ fontSize: 10, color: '#888' }}
              yAxisTextStyle={{ fontSize: 10, color: '#888' }}
              curved
              isAnimated
            />
          </ScrollView>
          <Legend />
        </>
      )}
    </View>
  );
}

export default function HistoryGraphView({
  sessions,
  selectedExercise,
  exercisesInCategory = [],
}: Props) {
  const singlePair = useMemo(
    () => (selectedExercise ? buildChartData(sessions, selectedExercise) : null),
    [sessions, selectedExercise],
  );

  // 種目指定あり → 単一グラフ（2本線）
  if (selectedExercise && singlePair) {
    const { rm, weight } = singlePair;
    return (
      <View style={styles.container}>
        <View style={styles.chartContainer}>
          <Text style={styles.exerciseName}>{selectedExercise}</Text>
          {rm.length < 2 ? (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>データが2件以上必要です</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={rm}
                  data2={weight}
                  width={Math.max(300, rm.length * 60)}
                  height={200}
                  color={COLOR_RM}
                  color2={COLOR_WEIGHT}
                  thickness={2}
                  thickness2={2}
                  dataPointsColor={COLOR_RM}
                  dataPointsColor2={COLOR_WEIGHT}
                  dataPointsRadius={4}
                  dataPointsRadius2={4}
                  showTextOnFocus
                  textColor="#333"
                  textFontSize={11}
                  xAxisLabelTextStyle={{ fontSize: 10, color: '#888' }}
                  yAxisTextStyle={{ fontSize: 10, color: '#888' }}
                  curved
                  isAnimated
                />
              </ScrollView>
              <Legend />
            </>
          )}
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
        <ExerciseChart key={name} sessions={sessions} exerciseName={name} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  allContent: { paddingBottom: 24 },

  chartContainer: {
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  exerciseName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 10 },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6b7280' },

  noData: { height: 120, alignItems: 'center', justifyContent: 'center' },
  noDataText: { color: '#aaa', fontSize: 14 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#aaa', fontSize: 14, textAlign: 'center' },
});
