import { Fragment, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

// ─── 公開型 ──────────────────────────────────────────────────────────────────

export interface WorkoutProgressDataPoint {
  date: Date;
  oneRM: number | null;
  maxWeight: number | null;
}

// ─── 定数 ────────────────────────────────────────────────────────────────────

const MARGIN_LEFT   = 40;
const MARGIN_RIGHT  = 12;
const MARGIN_TOP    = 14;
const MARGIN_BOTTOM = 28;
const WEEK_PX       = 80;
const DAY_PX        = WEEK_PX / 7;

export const COLOR_RM     = '#2563eb';
export const COLOR_WEIGHT = '#f97316';

// ─── 純関数 ──────────────────────────────────────────────────────────────────

function niceStep(x: number): number {
  const exp  = Math.floor(Math.log10(Math.max(x, 0.001)));
  const mag  = Math.pow(10, exp);
  const norm = x / mag;
  if (norm <= 1)   return 1   * mag;
  if (norm <= 2)   return 2   * mag;
  if (norm <= 2.5) return 2.5 * mag;
  if (norm <= 5)   return 5   * mag;
  return 10 * mag;
}

export function computeYAxisTicks(values: number[]): {
  ticks: number[]; yMin: number; yMax: number; step: number;
} {
  const valid = values.filter((v) => v != null && Number.isFinite(v)) as number[];
  if (valid.length === 0) {
    return { ticks: [0, 25, 50, 75, 100, 125], yMin: 0, yMax: 125, step: 25 };
  }

  const maxVal = Math.max(...valid);

  // Y軸は0始まり固定。0〜maxVal を5等分するnice step を選択
  const step = niceStep(Math.max(maxVal / 5, 1));

  // X軸(0)を除いて5本の水平グリッド線 = ticks: [0, step, 2*step, 3*step, 4*step, 5*step]
  const ticks = Array.from({ length: 6 }, (_, i) => i * step);

  return { ticks, yMin: 0, yMax: ticks[5], step };
}

export function computeWeeklySundays(start: Date, end: Date): Date[] {
  // 最初の日付の週の日曜（0=日, 1=月, ..., 6=土）
  const dow          = start.getDay();
  const cur          = new Date(start);
  cur.setDate(cur.getDate() - dow); // 日曜に戻す
  cur.setHours(0, 0, 0, 0);

  const sundays: Date[] = [];
  while (cur <= end) {
    sundays.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  sundays.push(new Date(cur)); // trailing: end の翌週日曜
  return sundays;
}

function formatTickLabel(value: number, step: number): string {
  // step が 2.5 のような小数なら1桁、整数なら0桁
  const decimals = Math.round(step * 10) % 10 !== 0 ? 1 : 0;
  return value.toFixed(decimals);
}

function formatDateLabel(date: Date, showYear: boolean): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return showYear ? `${date.getFullYear()}.${mm}.${dd}` : `${mm}.${dd}`;
}

/** null を線のギャップとして扱いながら SVG Path を生成 */
function buildPath(
  data: WorkoutProgressDataPoint[],
  key: 'oneRM' | 'maxWeight',
  toX: (d: Date) => number,
  toY: (v: number) => number,
): string {
  let d        = '';
  let penDown  = false;
  for (const pt of data) {
    const v = pt[key];
    if (v == null) { penDown = false; continue; }
    const x = toX(pt.date);
    const y = toY(v);
    d += penDown ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
    penDown = true;
  }
  return d;
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

interface Props {
  data: WorkoutProgressDataPoint[];
  chartHeight?: number; // 200: 単一種目, 100: コンパクト（ALL一覧）
  xStart?: Date;        // X軸左端基準日（全種目共通の最古日付）
  xEnd?: Date;          // X軸右端基準日（今日）
}

export default function WorkoutProgressChart({ data, chartHeight = 200, xStart, xEnd }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  if (data.length < 2) {
    return (
      <View style={[styles.noData, { height: chartHeight }]}>
        <Text style={styles.noDataText}>データが2件以上必要です</Text>
      </View>
    );
  }

  // Y軸
  const allValues = data
    .flatMap((d) => [d.oneRM, d.maxWeight])
    .filter((v): v is number => v != null);
  const { ticks, yMin, yMax, step } = computeYAxisTicks(allValues);

  // X軸（日曜グリッド）― xStart/xEnd が指定された場合はそれを優先
  const dateDates   = data.map((d) => d.date);
  const rangeStart  = xStart ?? new Date(Math.min(...dateDates.map((d) => d.getTime())));
  const rangeEnd    = xEnd   ?? new Date(Math.max(...dateDates.map((d) => d.getTime())));
  const sundays     = computeWeeklySundays(rangeStart, rangeEnd);
  const firstSunday = sundays[0];

  // 右端 = 今日（rangeEnd）をプロット右端に固定
  const totalDays = Math.max(14, Math.round((rangeEnd.getTime() - firstSunday.getTime()) / 86400000));
  const plotWidth = totalDays * DAY_PX;
  const svgHeight = MARGIN_TOP + chartHeight + MARGIN_BOTTOM;

  // 座標変換（スクロール領域内: MARGIN_LEFT は含まない）
  const toX = (date: Date): number =>
    ((date.getTime() - firstSunday.getTime()) / 86400000) * DAY_PX;

  const toY = (value: number): number =>
    MARGIN_TOP + chartHeight * (1 - (value - yMin) / (yMax - yMin));

  const todayX  = toX(rangeEnd);
  const rmPath  = buildPath(data, 'oneRM',     toX, toY);
  const wPath   = buildPath(data, 'maxWeight', toX, toY);
  const fontSize = 7;

  return (
    <View style={styles.chartRow}>
      {/* 固定Y軸 */}
      <Svg width={MARGIN_LEFT} height={svgHeight}>
        {ticks.map((tick) => {
          const py = toY(tick);
          return (
            <SvgText
              key={`yl-${tick}`}
              x={MARGIN_LEFT - 4} y={py + 4}
              textAnchor="end" fontSize={10} fill="#888"
            >
              {formatTickLabel(tick, step)}
            </SvgText>
          );
        })}
      </Svg>

      {/* スクロール可能なプロット領域（初期表示: 右端=今日）*/}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <Svg width={plotWidth + MARGIN_RIGHT} height={svgHeight}>

          {/* ① 水平グリッド線 */}
          {ticks.map((tick) => {
            const py = toY(tick);
            return (
              <Line
                key={`h-${tick}`}
                x1={0} y1={py} x2={plotWidth} y2={py}
                stroke="#e5e7eb" strokeWidth={1}
              />
            );
          })}

          {/* ② 縦グリッド線（日曜）+ X軸ラベル */}
          {sundays.slice(0, -1).map((sunday, idx) => {
            const px = toX(sunday);
            if (px > plotWidth) return null;
            const prev     = idx > 0 ? sundays[idx - 1] : null;
            const showYear = prev === null || sunday.getFullYear() !== prev.getFullYear();
            return (
              <Fragment key={`v-${sunday.getTime()}`}>
                <Line
                  x1={px} y1={MARGIN_TOP}
                  x2={px} y2={MARGIN_TOP + chartHeight}
                  stroke="#e5e7eb" strokeWidth={1}
                />
                <SvgText
                  x={px} y={MARGIN_TOP + chartHeight + 19}
                  textAnchor="middle" fontSize={9} fill="#888"
                >
                  {formatDateLabel(sunday, showYear)}
                </SvgText>
              </Fragment>
            );
          })}

          {/* ③ 今日ライン（右端・ラベルなし）*/}
          <Line
            x1={todayX} y1={MARGIN_TOP}
            x2={todayX} y2={MARGIN_TOP + chartHeight}
            stroke="#e5e7eb" strokeWidth={1}
          />

          {/* ④ 折れ線（欠損でギャップ） */}
          {rmPath ? <Path d={rmPath} stroke={COLOR_RM} strokeWidth={2} fill="none" /> : null}
          {wPath  ? <Path d={wPath}  stroke={COLOR_WEIGHT} strokeWidth={2} fill="none" /> : null}

          {/* ⑤ データ点 + ラベル */}
          {data.map((pt, i) => {
            const x = toX(pt.date);
            return (
              <Fragment key={`pt-${i}`}>
                {/* 推定1RM：ドット + 上ラベル */}
                {pt.oneRM != null && (() => {
                  const cy = toY(pt.oneRM);
                  return (
                    <>
                      <Circle cx={x} cy={cy} r={2} fill="white" stroke={COLOR_RM} strokeWidth={1.5} />
                      <SvgText
                        x={x} y={cy - 7}
                        textAnchor="middle" fontSize={fontSize} fill="#333"
                      >
                        {String(Math.round(pt.oneRM))}
                      </SvgText>
                    </>
                  );
                })()}

                {/* 最大重量：ドット + 下ラベル */}
                {pt.maxWeight != null && (() => {
                  const cy = toY(pt.maxWeight);
                  return (
                    <>
                      <Circle cx={x} cy={cy} r={2} fill="white" stroke={COLOR_WEIGHT} strokeWidth={1.5} />
                      <SvgText
                        x={x} y={cy + 17}
                        textAnchor="middle" fontSize={fontSize} fill="#333"
                      >
                        {String(pt.maxWeight)}
                      </SvgText>
                    </>
                  );
                })()}
              </Fragment>
            );
          })}
        </Svg>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  noData:     { alignItems: 'center', justifyContent: 'center' },
  noDataText: { color: '#aaa', fontSize: 14 },
  chartRow:   { flexDirection: 'row' },
});
