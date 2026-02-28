/** タイムスタンプ + ランダム文字列による簡易 ID 生成 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
