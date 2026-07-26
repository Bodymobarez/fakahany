export type DayOption = {
  key: string;
  label: string;
  date: Date;
};

export type TimeSlot = {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
};

export const TIME_SLOTS: TimeSlot[] = [
  { id: 'morning', label: 'Morning (9 AM - 12 PM)', startHour: 9, endHour: 12 },
  { id: 'afternoon', label: 'Afternoon (12 PM - 3 PM)', startHour: 12, endHour: 15 },
  { id: 'evening', label: 'Evening (3 PM - 6 PM)', startHour: 15, endHour: 18 },
  { id: 'night', label: 'Night (6 PM - 10 PM)', startHour: 18, endHour: 22 },
];

export function buildDayOptions(count = 7): DayOption[] {
  const days: DayOption[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(now.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    let label: string;
    if (i === 0) label = `Today, ${formatShort(d)}`;
    else if (i === 1) label = `Tomorrow, ${formatShort(d)}`;
    else {
      label = d.toLocaleDateString('en-AE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    days.push({ key, label, date: d });
  }
  return days;
}

function formatShort(d: Date) {
  return d.toLocaleDateString('en-AE', { month: 'short', day: 'numeric' });
}

export function slotRange(day: Date, slot: TimeSlot): { start: Date; end: Date } {
  const start = new Date(day);
  start.setHours(slot.startHour, 0, 0, 0);
  const end = new Date(day);
  end.setHours(slot.endHour, 0, 0, 0);
  return { start, end };
}

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** For today, hide slots that have already started (e.g. 4pm → no 9–12 / 12–3 / 3–6). */
export function availableSlotsForDay(day: Date, now = new Date()): TimeSlot[] {
  if (!isSameCalendarDay(day, now)) return TIME_SLOTS;
  return TIME_SLOTS.filter((slot) => {
    const start = new Date(now);
    start.setHours(slot.startHour, 0, 0, 0);
    return now.getTime() < start.getTime();
  });
}

export function formatScheduledLabel(day: Date, slot: TimeSlot) {
  const datePart = day.toLocaleDateString('en-AE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `Scheduled Delivery: ${datePart}, ${slot.label}`;
}
