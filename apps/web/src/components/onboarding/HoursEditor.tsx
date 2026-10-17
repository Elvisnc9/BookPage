import { formatMinutes, WEEKDAY_SHORT } from '@bookpage/shared';
import type { DayDraft, ListEdit } from './model';

/** 6:00 AM … midnight, every 30 minutes. */
const TIMES = Array.from({ length: 37 }, (_, i) => 360 + i * 30);

/** One opening range per day, with an open/closed switch. Used in onboarding and on My page. */
export function HoursEditor(props: { days: DayDraft[]; onDays: ListEdit<DayDraft>; legend?: string }) {
  const { days, onDays } = props;
  const setDay = (weekday: number, patch: Partial<DayDraft>) =>
    onDays((cur) => cur.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));

  return (
    <fieldset class="ob-hours">
      <legend class="lab">{props.legend ?? 'Opening hours'}</legend>
      {days.map((day) => {
        const name = WEEKDAY_SHORT[day.weekday - 1]!;
        return (
          <div class="ob-day" data-open={day.open}>
            <label class="ob-day-toggle">
              <input type="checkbox" role="switch" class="ob-switch" checked={day.open}
                onChange={(e) => setDay(day.weekday, { open: e.currentTarget.checked })} />
              <span class="mono">{name}</span>
            </label>
            {day.open ? (
              <div class="ob-day-times">
                <select class="ob-input ob-time" aria-label={`${name} opens`} value={day.opensAt}
                  onChange={(e) => setDay(day.weekday, { opensAt: Number(e.currentTarget.value) })}>
                  {TIMES.filter((t) => t < 1440).map((t) => <option value={t}>{formatMinutes(t)}</option>)}
                </select>
                <span aria-hidden="true">–</span>
                <select class="ob-input ob-time" aria-label={`${name} closes`} value={day.closesAt}
                  onChange={(e) => setDay(day.weekday, { closesAt: Number(e.currentTarget.value) })}>
                  {TIMES.filter((t) => t > day.opensAt).map((t) => <option value={t}>{t === 1440 ? 'Midnight' : formatMinutes(t)}</option>)}
                </select>
              </div>
            ) : (
              <span class="ob-closed mono">Closed</span>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
