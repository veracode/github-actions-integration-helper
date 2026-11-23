export const LABELS = ['Informational', 'Very Low', 'Low', 'Medium', 'High', 'Very High'];

export function severityPrefix(s: number | undefined | null): string {
  if (typeof s !== 'number' || !Number.isInteger(s) || s < 0 || s > 5) {
    return '';
  }
  return `[${LABELS[s]}] `;
}
