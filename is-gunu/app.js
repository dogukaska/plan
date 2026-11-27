import { $, element, today } from "/gunluk/common.js?v=1";
import { shiftBusinessDays } from "./calendar.js?v=1";

const holidays = new Set();
const start = $("start");
const holiday = $("holiday");
const add = $("add-holiday");
const status = $("status");
const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeZone: "UTC" });
const format = value => dateFormat.format(new Date(value + "T00:00:00Z"));
start.value = today();

function renderHolidays() {
  const items = [...holidays].sort().map(value => {
    const label = format(value);
    const item = element("li", undefined, { class: "line" });
    const remove = element("button", "Kaldır", { type: "button", "aria-label": label + " tatilini kaldır" });
    remove.addEventListener("click", () => {
      holidays.delete(value);
      status.textContent = "";
      renderHolidays();
      holiday.focus();
    });
    item.append(element("span", label), remove);
    return item;
  });
  $("holidays").replaceChildren(...items);
}

holiday.addEventListener("input", () => { add.disabled = !holiday.value || !holiday.validity.valid; });
add.addEventListener("click", () => {
  if (!holiday.value || !holiday.validity.valid) return;
  holidays.add(holiday.value);
  holiday.value = "";
  add.disabled = true;
  status.textContent = "";
  renderHolidays();
  holiday.focus();
});
$("work-form").addEventListener("input", () => { status.textContent = ""; });
$("work-form").addEventListener("submit", event => {
  event.preventDefault();
  try {
    const days = $("days").valueAsNumber * Number($("direction").value);
    const excluded = holiday.value ? [...holidays, holiday.value] : [...holidays];
    const target = shiftBusinessDays(start.value, days, excluded);
    status.textContent = "Sonuç " + format(target);
  } catch (error) {
    status.textContent = error.message;
  }
});
