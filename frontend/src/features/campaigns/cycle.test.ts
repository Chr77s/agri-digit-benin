import { describe, expect, it } from 'vitest';
import { NEXT, addDays, cycleOf, dayOf, tasksFor } from './cycle';

describe('Calendrier cultural (démonstration)', () => {
  it('compte les jours de culture et les dates des stades', () => {
    expect(dayOf('2026-08-12', new Date(2026, 7, 12, 18))).toBe(1);
    expect(dayOf('2026-08-12', new Date(2026, 8, 18))).toBe(38);
    expect(addDays('2026-08-12', cycleOf('mais').recolte).toDateString()).toBe(new Date(2026, 10, 15).toDateString());
    expect(cycleOf('inconnue').recolte).toBe(100);
    expect(NEXT.floraison).toBe('recolte');
    expect(NEXT.recolte).toBeNull();
  });

  it('propose les tâches du stade en cours et des suivants, par échéance', () => {
    expect(tasksFor('mais', 'semis', null)).toEqual([]);
    const all = tasksFor('mais', 'semis', '2026-08-12');
    expect(all[0].key).toBe('emergence');
    expect(all.map((t) => t.due.getTime())).toEqual([...all].map((t) => t.due.getTime()).sort((a, b) => a - b));
    const late = tasksFor('mais', 'floraison', '2026-08-12');
    expect(late.some((t) => t.key === 'weeding1')).toBe(false);
    expect(late.at(-1)?.key).toBe('declareHarvest');
  });
});
