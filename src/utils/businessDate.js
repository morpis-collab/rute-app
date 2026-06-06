export function getBusinessDate(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
}

export function isSameBusinessDate(dateValue, businessDate = getBusinessDate()) {
  return Boolean(dateValue && String(dateValue).startsWith(businessDate));
}
