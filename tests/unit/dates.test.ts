import { describe, expect, it } from 'vitest';
import { splitEvents } from '@/lib/content';
import { EventSchema } from '@/lib/content/schema';
import { dayParts, formatDay, todayInAmman } from '@/lib/dates';

describe('dates', () => {
  it('uses the calendar day in Amman (UTC+3), not UTC', () => {
    expect(todayInAmman(new Date('2026-10-19T20:59:00Z'))).toBe('2026-10-19');
    expect(todayInAmman(new Date('2026-10-19T21:01:00Z'))).toBe('2026-10-20');
  });
  it('formats event days without time-zone drift', () => {
    expect(formatDay('2026-10-20')).toBe('Tuesday, 20 Oct 2026');
    expect(dayParts('2026-10-14')).toEqual({ day: 14, month: 'Oct' });
  });
  it('keeps an event upcoming on its own day, past the day after', () => {
    const e = EventSchema.parse({ slug: 'x', titleEn: 'X', date: '2026-10-20' });
    expect(splitEvents([e], '2026-10-20').upcoming).toHaveLength(1);
    expect(splitEvents([e], '2026-10-21').past).toHaveLength(1);
  });
});
