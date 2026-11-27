const DAY = 86_400_000;
const MIN = Date.parse("0001-01-01");
const MAX = Date.parse("9999-12-31");

function parse(value) {
  const time = /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(value) : NaN;
  if (!Number.isFinite(time) || time < MIN || time > MAX || new Date(time).toISOString().slice(0, 10) !== value) {
    throw new RangeError("Geçerli bir tarih seç.");
  }
  return time;
}

function weekday(time) {
  const day = new Date(time).getUTCDay();
  return day >= 1 && day <= 5;
}

function moveWeekdays(start, days, direction) {
  if (!days) return start;
  let time = start;
  do time += direction * DAY;
  while (!weekday(time));

  const remaining = days - 1;
  time += Math.floor(remaining / 5) * 7 * direction * DAY;
  for (let found = 0; found < remaining % 5;) {
    time += direction * DAY;
    if (weekday(time)) found++;
  }
  return time;
}

export function shiftBusinessDays(startISO, days, holidays = []) {
  const origin = parse(startISO);
  if (!Number.isSafeInteger(days) || Math.abs(days) > 2_608_614) throw new RangeError("İş günü sayısı geçerli aralığın dışında.");
  const excluded = [...new Set(holidays.map(parse))].filter(weekday);
  if (days === 0) return startISO;

  const direction = Math.sign(days);
  let target = moveWeekdays(origin, Math.abs(days), direction);
  excluded.sort((a, b) => (a - b) * direction);
  for (const date of excluded) {
    if ((date - origin) * direction <= 0) continue;
    if ((target - date) * direction < 0) break;
    target = moveWeekdays(target, 1, direction);
  }
  if (target < MIN || target > MAX) throw new RangeError("Sonuç 0001 ile 9999 yılları arasında olmalı.");
  return new Date(target).toISOString().slice(0, 10);
}
