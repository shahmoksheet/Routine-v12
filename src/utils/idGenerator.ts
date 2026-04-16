export function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}
