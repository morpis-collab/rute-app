import { APPROVAL_THRESHOLDS } from '../utils/constants';

export function calculateApprovalStatus(total) {
  if (total < APPROVAL_THRESHOLDS.auto) return 'auto_approved';
  if (total <= APPROVAL_THRESHOLDS.notify) return 'approved';
  return 'pending';
}

export function getIngredientStatus(stock, minStock) {
  return Number(stock) <= Number(minStock) ? 'kritis' : 'aman';
}

const normalizeUnit = (unit) => String(unit || '').trim().toLowerCase();

export function convertQuantityToIngredientUnit(quantity, movementUnit, ingredient) {
  const value = Number(quantity || 0);
  const fromUnit = normalizeUnit(movementUnit || ingredient?.unit);
  const baseUnit = normalizeUnit(ingredient?.unit);

  if (!ingredient || !fromUnit || fromUnit === baseUnit) return value;

  const conversion = ingredient.unitConversions?.[fromUnit];
  if (conversion != null) return value * Number(conversion);

  if (baseUnit === 'gram' && fromUnit === 'kg') return value * 1000;
  if (baseUnit === 'ml' && ['l', 'liter'].includes(fromUnit)) return value * 1000;

  console.warn(
    `Konversi unit stok belum tersedia: ${ingredient.name} dari ${movementUnit} ke ${ingredient.unit}.`,
  );
  return value;
}

export function getSalesSummary(salesData = []) {
  const totalOmzet = salesData.reduce((sum, sale) => sum + sale.total, 0);
  const totalTransaksi = salesData.length;
  const totalCup = salesData.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.qty, 0),
    0,
  );

  const byMethod = { cash: 0, qris: 0, transfer: 0 };
  salesData.forEach((sale) => {
    byMethod[sale.paymentMethod] = (byMethod[sale.paymentMethod] || 0) + sale.total;
  });

  const menuCount = {};
  salesData.forEach((sale) => {
    sale.items.forEach((item) => {
      menuCount[item.name] = (menuCount[item.name] || 0) + item.qty;
    });
  });

  const menuTerlaris = Object.entries(menuCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, qty]) => ({ name, qty }));

  return { totalOmzet, totalTransaksi, totalCup, byMethod, menuTerlaris };
}

export function getExpenseTotal(expenses = []) {
  return expenses.reduce((sum, expense) => sum + expense.total, 0);
}

export function getEstimatedHpp(salesData = [], products = []) {
  return salesData.reduce((saleSum, sale) => {
    const saleHpp = sale.items.reduce((itemSum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return itemSum + (product?.hpp || 0) * item.qty;
    }, 0);
    return saleSum + saleHpp;
  }, 0);
}

export function buildSaleStockMovements(transaction, products = []) {
  return transaction.items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product?.recipe) return [];

    return product.recipe.map((recipe) => ({
      ingredientId: recipe.ingredientId,
      type: 'keluar',
      movementType: 'out',
      qty: recipe.qty * item.qty,
      unit: recipe.unit,
      source: `Penjualan (${item.qty}x ${item.name})`,
      sourceType: 'sale',
      sourceId: transaction.id,
      date: transaction.date,
      user: 'Sistem',
    }));
  });
}

export function buildExpenseStockMovements(expense) {
  return expense.items
    .filter((item) => item.addsStock && item.ingredientId && item.stockQty)
    .map((item) => ({
      ingredientId: item.ingredientId,
      type: 'masuk',
      movementType: 'in',
      qty: item.stockQty,
      unit: item.stockUnit || item.unit,
      source: `Pembelian (${expense.id})`,
      sourceType: 'expense',
      sourceId: expense.id,
      date: expense.date,
      user: expense.user,
    }));
}

export function applyStockMovements(ingredients, movements) {
  return ingredients.map((ingredient) => {
    const totalDelta = movements
      .filter((movement) => movement.ingredientId === ingredient.id)
      .reduce((sum, movement) => {
        const convertedQty = convertQuantityToIngredientUnit(movement.qty, movement.unit, ingredient);
        if (movement.type === 'masuk') return sum + convertedQty;
        if (movement.type === 'keluar') return sum - convertedQty;
        if (movement.type === 'koreksi') return sum + convertedQty;
        return sum;
      }, 0);

    if (!totalDelta) return ingredient;

    const nextStock = Math.max(0, Number((ingredient.stock + totalDelta).toFixed(3)));
    return {
      ...ingredient,
      stock: nextStock,
      status: getIngredientStatus(nextStock, ingredient.minStock),
    };
  });
}

export function getCashExpected({ sales = [], expenses = [], openingCash = 0, businessDate }) {
  const date = businessDate || new Date().toLocaleDateString('en-CA');
  const cashSales = sales
    .filter((sale) => sale.date?.startsWith(date) && sale.paymentMethod === 'cash')
    .reduce((sum, sale) => sum + sale.total, 0);
  const cashExpenses = expenses
    .filter((expense) => expense.date?.startsWith(date))
    .reduce((sum, expense) => sum + expense.total, 0);

  return openingCash + cashSales - cashExpenses;
}
