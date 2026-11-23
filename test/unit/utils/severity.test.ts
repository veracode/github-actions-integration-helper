import { severityPrefix } from '../../../src/utils/severity';

describe('severityPrefix', () => {
  it('maps 0-5 to labels', () => {
    expect(severityPrefix(0)).toBe('[Informational] ');
    expect(severityPrefix(1)).toBe('[Very Low] ');
    expect(severityPrefix(2)).toBe('[Low] ');
    expect(severityPrefix(3)).toBe('[Medium] ');
    expect(severityPrefix(4)).toBe('[High] ');
    expect(severityPrefix(5)).toBe('[Very High] ');
  });

  it('returns empty for unknown', () => {
    expect(severityPrefix(undefined)).toBe('');
    expect(severityPrefix(null)).toBe('');
    expect(severityPrefix(-1)).toBe('');
    expect(severityPrefix(6)).toBe('');
    expect(severityPrefix(2.5)).toBe('');
    expect(severityPrefix(NaN)).toBe('');
  });
});
