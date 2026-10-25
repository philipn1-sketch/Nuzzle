import { feedFromDraft } from '../feeds';
import { feedsToCsv } from '../csv';
import { clock, span, spanWords } from '../format';

describe('formatting', () => {
  it('shows timers and spans without dashes', () => {
    expect(clock(65_000)).toBe('1:05');
    expect(clock(3_725_000)).toBe('1:02:05');
    expect(span(100 * 60_000)).toBe('1h 40m');
    expect(span(120 * 60_000)).toBe('2h');
    expect(span(30_000)).toBe('just now');
    expect(spanWords(100 * 60_000)).toBe('1 hour 40 minutes');
    expect(spanWords(61 * 60_000)).toBe('1 hour 1 minute');
  });

  it('exports saved feeds oldest first as CSV', () => {
    const t = new Date(2026, 9, 24, 3, 5).getTime();
    const csv = feedsToCsv([feedFromDraft({ start: t, leftMin: 10, rightMin: 5, endedOn: 'R' }, 'a')], t);
    expect(csv).toBe('baby,date,start,end,type,left minutes,right minutes,total minutes,ended on,bottle ml,milk,note\nBaby,2026/10/24,03:05,03:20,breast,10.0,5.0,15.0,right,,,\n');
  });
});
