export function getIncomeTotal(incomes = []) {
  return incomes.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
}

export function getExpenseTotal(expenses = []) {
  return expenses.reduce((sum, exp) => sum + Number(exp.amount || exp.total || 0), 0);
}

export function calculateNetProfit(incomes = [], expenses = []) {
  return getIncomeTotal(incomes) - getExpenseTotal(expenses);
}

// Minimal compatibility helpers for copilot or other unused legacy files
export function getSalesSummary(sales = []) {
  const totalOmzet = sales.reduce((sum, sale) => sum + Number(sale.amount || sale.total || 0), 0);
  return {
    totalOmzet,
    totalTransaksi: sales.length,
    totalCup: 0,
    byMethod: { cash: totalOmzet, qris: 0, transfer: 0, debt: 0 },
    menuTerlaris: [],
  };
}

export function getEstimatedHpp() {
  return 0;
}

export function refreshProductCosts(products = []) {
  return products;
}
