import dayjs from "dayjs";

export function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return dayjs(d).format("YYYY-MM-DD");
}

export function defaultTo() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return dayjs(d).format("YYYY-MM-DD");
}
