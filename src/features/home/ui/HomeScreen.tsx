import { useCallback, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarList, LocaleConfig } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { getSettings, getSessions } from '@/src/lib/storage';

LocaleConfig.locales['ja'] = {
  monthNames: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  monthNamesShort: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  dayNames: ['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'],
  dayNamesShort: ['日','月','火','水','木','金','土'],
  today: '今日',
};
LocaleConfig.defaultLocale = 'ja';

const CALENDAR_WIDTH = Dimensions.get('window').width;

type MarkedDates = Record<string, {
  selected?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
}>;

const DEFAULT_PR = ['ベンチプレス', 'スクワット', 'デッドリフト'];

function formatPrDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

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
  const calendarListRef = useRef<any>(null);
  const [maxWeights, setMaxWeights] = useState<Record<string, number>>({});
  const [maxDates, setMaxDates] = useState<Record<string, string>>({});
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [prExercises, setPrExercises] = useState<string[]>(DEFAULT_PR);
  const today = todayString();
  const navigatingToWorkoutRef = useRef(false);
  const [currentMonth, setCurrentMonth] = useState<string>(today.substring(0, 7));

  useFocusEffect(
    useCallback(() => {
      const fromWorkout = navigatingToWorkoutRef.current;
      navigatingToWorkoutRef.current = false;
      if (!fromWorkout) {
        calendarListRef.current?.scrollToMonth?.(today);
      }
      Promise.all([getSettings(), getSessions()]).then(([s, sessions]) => {
        const prEx = s.prExercises ?? DEFAULT_PR;
        setUnit(s.unit);
        setPrExercises(prEx);

        const marks: MarkedDates = {};
        const maxW: Record<string, number> = {};
        const maxD: Record<string, string> = {};

        for (const session of sessions) {
          if (!session.finishedAt) continue;
          for (const e of session.exercises) {
            if (prEx.includes(e.exerciseName)) {
              for (const set of e.sets) {
                if (set.weightKg > (maxW[e.exerciseName] ?? 0)) {
                  maxW[e.exerciseName] = set.weightKg;
                  maxD[e.exerciseName] = session.startedAt;
                }
              }
            }
          }
          if (session.exercises.length > 0) {
            const d = new Date(session.startedAt);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (dateStr === today) {
              marks[dateStr] = { selected: true, selectedColor: '#2563eb', selectedTextColor: '#fff' };
            } else {
              marks[dateStr] = { selected: true, selectedColor: '#dcfce7', selectedTextColor: '#15803d' };
            }
          }
        }

        setMarkedDates(marks);
        setMaxWeights(maxW);
        setMaxDates(maxD);
      });
    }, []),
  );

  const handleDayPress = (day: DateData) => {
    navigatingToWorkoutRef.current = true;
    router.push(`/workout/${day.dateString}` as never);
  };

  const renderDay = useCallback(({ date, state, marking }: any) => {
    const isToday = date?.dateString === today;
    const isDisabled = state === 'disabled';

    let bgColor = 'transparent';
    let borderColor = '#d1d5db';
    let textColor = isDisabled ? '#d1d5db' : '#1e293b';

    if (isToday) {
      bgColor = '#2563eb';
      borderColor = '#2563eb';
      textColor = '#fff';
    } else if (marking?.selected) {
      bgColor = marking.selectedColor ?? '#dcfce7';
      borderColor = marking.selectedColor ?? '#dcfce7';
      textColor = marking.selectedTextColor ?? '#15803d';
    }

    return (
      <Pressable
        onPress={() => !isDisabled && date && handleDayPress(date as DateData)}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      >
        <View style={{
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: bgColor,
          borderWidth: 1, borderColor,
          alignItems: 'center', justifyContent: 'center',
          marginVertical: 2,
        }}>
          <Text style={{ color: textColor, fontSize: 12, fontWeight: isToday ? '700' : '400' }}>
            {date?.day}
          </Text>
        </View>
      </Pressable>
    );
  }, [today, handleDayPress]);

  const handlePrevMonth = useCallback(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = m === 1
      ? `${y - 1}-12-01`
      : `${y}-${String(m - 1).padStart(2, '0')}-01`;
    calendarListRef.current?.scrollToMonth?.(date);
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    calendarListRef.current?.scrollToMonth?.(date);
  }, [currentMonth]);

  const handleStartToday = () => {
    navigatingToWorkoutRef.current = true;
    router.push(`/workout/${today}` as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.calendarWrapper}>
        <CalendarList
          ref={calendarListRef}
          horizontal
          pagingEnabled
          calendarWidth={CALENDAR_WIDTH}
          calendarStyle={styles.calendarStyle}
          style={styles.calendarList}
          current={today}
          markedDates={markedDates}
          onDayPress={handleDayPress}
          dayComponent={renderDay}
          hideArrows
          customHeaderTitle={
            <View style={styles.headerTitleWrapper}>
              <Text style={styles.headerTitle}>
                {`${currentMonth.substring(0, 4)}年${parseInt(currentMonth.substring(5, 7))}月`}
              </Text>
            </View>
          }
          onVisibleMonthsChange={(months) => {
            if (months[0]) {
              setCurrentMonth(months[0].dateString.substring(0, 7));
            }
          }}
          theme={{
            arrowColor: '#2563eb',
            monthTextColor: '#1e293b',
            textMonthFontWeight: '700',
            textDayFontSize: 12,
            textMonthFontSize: 14,
          }}
        />

        <Pressable
          style={({ pressed }) => [styles.navArrow, styles.navArrowLeft, { opacity: pressed ? 0.4 : 1 }]}
          onPress={handlePrevMonth}
          hitSlop={12}
        >
          <FontAwesome name="chevron-left" size={16} color="#2563eb" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.navArrow, styles.navArrowRight, { opacity: pressed ? 0.4 : 1 }]}
          onPress={handleNextMonth}
          hitSlop={12}
        >
          <FontAwesome name="chevron-right" size={16} color="#2563eb" />
        </Pressable>
      </View>

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
            const dateStr = maxDates[name] ? formatPrDate(maxDates[name]) : null;
            return (
              <View key={name} style={styles.big3Card}>
                <Text style={styles.big3Name}>{name}</Text>
                <Text style={styles.big3Value}>{display}</Text>
                {dateStr && <Text style={styles.big3Date}>{dateStr}</Text>}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.startBtn} onPress={handleStartToday}>
          <Text style={styles.startBtnText}>今日のトレーニングを開始</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  calendarWrapper: { position: 'relative' },
  calendarList: { height: 350, flexGrow: 0 },
  calendarStyle: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  headerTitleWrapper: {
    paddingVertical: 13,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },

  navArrow: {
    position: 'absolute',
    top: 7,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowLeft: { left: 8 },
  navArrowRight: { right: 8 },

  big3Section: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginTop: 16,
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
  big3Date: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
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
