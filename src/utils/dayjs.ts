import dayjs from 'dayjs';

export function formatDate(date: Date, format = 'YYYY-MM-DD') {
  return dayjs(date).format(format);
}
