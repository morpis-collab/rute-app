import fs from 'fs';

const db = JSON.parse(fs.readFileSync('scratch/vps-db-clone.json', 'utf8'));

// Filter helper
function getExpensesInPeriod(startDateStr, endDateStr) {
  const start = new Date(startDateStr + 'T00:00:00.000Z');
  const end = new Date(endDateStr + 'T23:59:59.999Z');
  
  return db.expenses.filter(e => {
    // Some expenses have dates as "2026-06-02T12:00:00.000Z"
    const expDate = new Date(e.date);
    const inDateRange = expDate >= start && expDate <= end;
    const isApprovedOrActive = e.status !== 'rejected';
    return inDateRange && isApprovedOrActive;
  });
}

console.log('=== Period: 31 May to 1 June ===');
const period1 = getExpensesInPeriod('2026-05-31', '2026-06-01');
let total1 = 0;
period1.forEach(e => {
  total1 += e.total;
  console.log(`- Date: ${e.date.substring(0, 10)}, Desc: ${e.description}, Total: ${e.total}, Account: ${e.cashAccountId}`);
});
console.log('Total Period 1:', total1);

console.log('\n=== Period: 31 May to 3 June ===');
const period2 = getExpensesInPeriod('2026-05-31', '2026-06-03');
let total2 = 0;
period2.forEach(e => {
  total2 += e.total;
  console.log(`- Date: ${e.date.substring(0, 10)}, Desc: ${e.description}, Total: ${e.total}, Account: ${e.cashAccountId}`);
});
console.log('Total Period 2:', total2);
