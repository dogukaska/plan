import ICAL from "./vendor/ical.min.js";
import { $, addDays, dateLabel, download, element, read, save, today } from "/gunluk/common.js?v=1";

const kinds = { G: "Gündüz", N: "Gece", "İ": "İzin" };
const storageKey = "dijital-caki-vardiya-1";
const saved = read(storageKey, {});
const scheduleId = saved.scheduleId ?? crypto.randomUUID();
const overrides = new Map(saved.overrides ?? []);
const ids = ["start", "days", "cycle", "day-start", "day-end", "night-start", "night-end"];
const status = $("status");
const pageSize = 7;
const weekday = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" });
let plan = [];
let pageStart = 0;
$("start").value = today();
for (const id of ids) if (saved.fields?.[id]) $(id).value = saved.fields[id];
save(storageKey, { ...saved, scheduleId });

function type(value) {
  return value === "I" ? "İ" : value;
}

function shiftTimes(kind) {
  const prefix = kind === "G" ? "day" : "night";
  return [$(prefix + "-start").value, $(prefix + "-end").value];
}

function schedule() {
  const start = $("start").value;
  const days = $("days").valueAsNumber;
  const cycle = $("cycle").value.toLocaleUpperCase("tr").trim().split(/[\s,;]+/).map(type);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(start) && Number.isInteger(days) && days >= 1 && days <= 366 &&
    cycle.every((kind) => Object.hasOwn(kinds, kind)) &&
    ["G", "N"].every((kind) => {
      const [from, to] = shiftTimes(kind);
      return from && to && from !== to;
    });
  plan = [];
  if (valid) {
    plan = Array.from({ length: days }, (_, index) => {
      const date = addDays(start, index);
      return { date, kind: overrides.get(date) ?? cycle[index % cycle.length] };
    });
  }
  pageStart = Math.min(pageStart, Math.max(0, Math.floor((plan.length - 1) / pageSize) * pageSize));
  renderPreview();
  $("export").disabled = !valid || !plan.some(({ kind }) => kind !== "İ");
  status.textContent = valid ? "" : "Başlangıcı, döngüyü ve vardiya saatlerini kontrol et.";
}

function renderPreview() {
  const pageEnd = Math.min(pageStart + pageSize, plan.length);
  $("shift-navigation").hidden = plan.length <= pageSize;
  $("previous-days").disabled = pageStart === 0;
  $("next-days").disabled = pageEnd >= plan.length;
  $("day-range").textContent = `${pageStart + 1}–${pageEnd} / ${plan.length} gün`;
  $("preview").replaceChildren(...plan.slice(pageStart, pageEnd).map(({ date, kind }) => {
    const [from, to] = shiftTimes(kind);
    const label = dateLabel(date);
    const day = weekday.format(new Date(date + "T00:00:00Z"));
    const dateInfo = element("div", undefined, { class: "shift-date" });
    dateInfo.append(element("time", `${label} · ${day}`, { datetime: date }));
    if (kind !== "İ") dateInfo.append(element("span", `${from}–${to}`, { class: "muted shift-time" }));
    const select = element("select", undefined, { id: "s-" + date, "aria-label": label + " vardiyası" });
    for (const [key, name] of Object.entries(kinds)) select.append(element("option", name, { value: key }));
    select.value = kind;
    select.addEventListener("change", () => {
      overrides.set(date, select.value);
      updateSchedule();
      document.getElementById(select.id)?.focus({ preventScroll: true });
    });
    const row = element("li");
    row.append(dateInfo, select);
    return row;
  }));
}

function calendarTime(date, time) {
  return ICAL.Time.fromJSDate(new Date(date + "T" + time + ":00+03:00"), true);
}

function updateSchedule() {
  schedule();
  if (!plan.length) return;
  const fields = Object.fromEntries(ids.map((id) => [id, $(id).value]));
  save(storageKey, { fields, scheduleId, overrides: [...overrides] });
}

for (const id of ids) $(id).addEventListener("input", () => {
  if (id === "start") pageStart = 0;
  updateSchedule();
});
$("previous-days").addEventListener("click", () => {
  pageStart -= pageSize;
  renderPreview();
});
$("next-days").addEventListener("click", () => {
  pageStart += pageSize;
  renderPreview();
});
$("export").addEventListener("click", () => {
  const calendar = new ICAL.Component("vcalendar");
  calendar.addPropertyWithValue("version", "2.0");
  calendar.addPropertyWithValue("prodid", "-//Dijital Çakı//Vardiya Takvimi//TR");
  calendar.addPropertyWithValue("calscale", "GREGORIAN");
  const timestamp = ICAL.Time.fromJSDate(new Date(), true);
  for (const { date, kind } of plan) {
    if (kind === "İ") continue;
    const [from, to] = shiftTimes(kind);
    const event = new ICAL.Component("vevent");
    event.addPropertyWithValue("uid", date + "-" + scheduleId + "@dogukaska.github.io");
    event.addPropertyWithValue("dtstamp", timestamp);
    event.addPropertyWithValue("dtstart", calendarTime(date, from));
    event.addPropertyWithValue("dtend", calendarTime(from > to ? addDays(date, 1) : date, to));
    event.addPropertyWithValue("summary", kinds[kind] + " vardiyası");
    calendar.addSubcomponent(event);
  }
  download(new Blob([calendar.toString() + "\r\n"], { type: "text/calendar;charset=utf-8" }), "vardiyalar.ics");
  status.textContent = "Takvim dosyası hazır.";
});
schedule();
