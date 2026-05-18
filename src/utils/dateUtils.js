// src/utils/dateUtils.js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const BEIRUT = "Asia/Beirut";

export const bFormat = (date, fmt = "DD/MM/YYYY HH:mm") => {
  if (!date) return "—";
  return dayjs.utc(date).tz(BEIRUT).format(fmt);
};

export const bDayjs = (date) => {
  if (!date) return null;
  return dayjs.utc(date).tz(BEIRUT);
};

export const bNow = () => dayjs().tz(BEIRUT);

export default bDayjs;