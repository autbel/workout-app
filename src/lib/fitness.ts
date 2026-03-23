/**
 * 推定1RM の計算（Epley式 変形版）
 *
 * 式: 1RM = 重量 × (1 + 回数 ÷ 40)
 * 元式（Epley 1985）の ÷30 より保守的な推定値を返す変形版。
 * 回数が1の場合は重量をそのまま返す。
 * 目安として使用し、回数が多いほど誤差が大きくなる。
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 40) * 10) / 10;
}
