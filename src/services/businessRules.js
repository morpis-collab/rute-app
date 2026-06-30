import { APPROVAL_THRESHOLDS } from '../utils/constants.js';

export function calculateApprovalStatus(total) {
  const value = Number(total || 0);
  if (value < APPROVAL_THRESHOLDS.auto) return 'auto_approved';
  if (value <= APPROVAL_THRESHOLDS.notify) return 'approved';
  return 'pending';
}

export function getIngredientStatus(stock, minStock) {
  return Number(stock) <= Number(minStock) ? 'kritis' : 'aman';
}

const normalizeUnit = (unit) => String(unit || '').trim().toLowerCase();
const BUSINESS_TIME_ZONE = 'Asia/Makassar';

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

function toBusinessDate(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: BUSINESS_TIME_ZONE });
}

function buildBusinessDateWindow(days = 7, asOfDate = new Date()) {
  const safeDays = Math.max(1, Number(days || 7));
  const anchor = typeof asOfDate === 'string'
    ? new Date(`${asOfDate}T12:00:00+08:00`)
    : new Date(asOfDate);

  return Array.from({ length: safeDays }, (_, index) => {
    const date = new Date(anchor);
    date.setDate(date.getDate() - (safeDays - 1 - index));
    return toBusinessDate(date);
  });
}

function roundStockQuantity(value, unit) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const normalizedUnit = normalizeUnit(unit);
  if (['pcs', 'pc', 'cup', 'porsi', 'botol', 'pack', 'box'].includes(normalizedUnit)) {
    return Math.ceil(amount);
  }
  return Number(amount.toFixed(3));
}

export function buildRestockRecommendations({
  sales = [],
  products = [],
  ingredients = [],
  days = 7,
  asOfDate = new Date(),
} = {}) {
  const periodDates = buildBusinessDateWindow(days, asOfDate);
  const periodSet = new Set(periodDates);
  const safeDays = periodDates.length || 1;
  const usageByIngredient = new Map();
  const recipeWarnings = [];

  (sales || [])
    .filter((sale) => periodSet.has(String(sale.date || '').slice(0, 10)))
    .forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const qtySold = Number(item.qty || 0);
        if (!Number.isFinite(qtySold) || qtySold <= 0) return;

        const product = (products || []).find((candidate) => (
          String(candidate.id) === String(item.productId)
          || (item.name && String(candidate.name).toLowerCase() === String(item.name).toLowerCase())
        ));

        if (!product?.recipe?.length) {
          recipeWarnings.push({
            productId: item.productId || product?.id || null,
            productName: item.name || product?.name || 'Menu tanpa nama',
            qty: qtySold,
            date: sale.date,
            reason: 'Resep menu belum lengkap',
          });
          return;
        }

        product.recipe.forEach((recipe) => {
          const ingredient = (ingredients || []).find((candidate) => String(candidate.id) === String(recipe.ingredientId));
          if (!ingredient) {
            recipeWarnings.push({
              productId: product.id,
              productName: product.name || item.name || 'Menu tanpa nama',
              qty: qtySold,
              date: sale.date,
              reason: 'Bahan resep tidak ditemukan',
            });
            return;
          }

          const recipeQty = Number(recipe.qty || 0);
          if (!Number.isFinite(recipeQty) || recipeQty <= 0) return;

          const convertedQty = convertQuantityToIngredientUnit(recipeQty * qtySold, recipe.unit, ingredient);
          const key = String(ingredient.id);
          usageByIngredient.set(key, Number(usageByIngredient.get(key) || 0) + Number(convertedQty || 0));
        });
      });
    });

  const recommendations = (ingredients || []).map((ingredient) => {
    const ingredientId = ingredient.id;
    const currentQty = Number(ingredient.stock || 0);
    const minQty = Number(ingredient.minStock || 0);
    const totalUsage = Number(usageByIngredient.get(String(ingredientId)) || 0);
    const avgDailyUsage = totalUsage / safeDays;
    const projectedUsage7d = avgDailyUsage * 7;
    const targetQty = projectedUsage7d + minQty;
    const minGap = Math.max(0, minQty - currentQty);
    const forecastGap = Math.max(0, targetQty - currentQty);
    const recommendedQty = roundStockQuantity(Math.max(minGap, forecastGap), ingredient.unit);
    const daysCoverage = avgDailyUsage > 0 ? currentQty / avgDailyUsage : null;
    const estimatedCost = recommendedQty * Number(ingredient.costPerUnit || 0);

    let priority = 'aman';
    let reason = 'Stok aman untuk 7 hari ke depan';
    if (currentQty <= minQty || (daysCoverage != null && daysCoverage <= 2)) {
      priority = 'kritis';
      reason = 'Stok sudah kritis atau berisiko habis dalam 2 hari';
    } else if (recommendedQty > 0 || (daysCoverage != null && daysCoverage <= 7)) {
      priority = 'rendah';
      reason = 'Perlu belanja agar stok cukup untuk 7 hari';
    }

    return {
      ingredientId,
      ingredientName: ingredient.name || 'Bahan Baku',
      unit: ingredient.unit || 'unit',
      currentQty: Number(currentQty.toFixed(3)),
      minQty: Number(minQty.toFixed(3)),
      avgDailyUsage: Number(avgDailyUsage.toFixed(3)),
      projectedUsage7d: Number(projectedUsage7d.toFixed(3)),
      recommendedQty,
      estimatedCost: Math.round(estimatedCost),
      daysCoverage: daysCoverage == null ? null : Number(daysCoverage.toFixed(1)),
      priority,
      reason,
    };
  });

  recommendations.sort((a, b) => {
    const priorityRank = { kritis: 0, rendah: 1, aman: 2 };
    const rankDiff = (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3);
    if (rankDiff !== 0) return rankDiff;
    return Number(b.estimatedCost || 0) - Number(a.estimatedCost || 0);
  });

  return {
    recommendations,
    recipeWarnings,
    periodDates,
    windowDays: safeDays,
  };
}

export function getSalesSummary(salesData = []) {
  const totalOmzet = salesData.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totalTransaksi = salesData.length;
  const totalCup = salesData.reduce(
    (sum, sale) => sum + (sale.items || []).reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0),
    0,
  );

  const byMethod = { cash: 0, qris: 0, transfer: 0, debt: 0 };
  salesData.forEach((sale) => {
    const breakdown = sale.paymentBreakdown;
    if (breakdown && typeof breakdown === 'object') {
      byMethod.cash += Number(breakdown.cash || 0);
      byMethod.qris += Number(breakdown.qris || 0);
      byMethod.transfer += Number(breakdown.transfer || 0);
      byMethod.debt += Number(breakdown.debt || 0);
      return;
    }
    const method = sale.paymentMethod || 'cash';
    byMethod[method] = (byMethod[method] || 0) + Number(sale.total || 0);
  });

  const menuCount = {};
  salesData.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      if (item.name) {
        menuCount[item.name] = (menuCount[item.name] || 0) + Number(item.qty || 0);
      }
    });
  });

  const menuTerlaris = Object.entries(menuCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, qty]) => ({ name, qty }));

  return { totalOmzet, totalTransaksi, totalCup, byMethod, menuTerlaris };
}

export function getExpenseTotal(expenses = []) {
  return expenses.reduce((sum, expense) => sum + Number(expense.total || 0), 0);
}

export function getEstimatedHpp(salesData = [], products = []) {
  return salesData.reduce((saleSum, sale) => {
    const saleHpp = (sale.items || []).reduce((itemSum, item) => {
      const product = products.find((p) => String(p.id) === String(item.productId));
      return itemSum + (product?.hpp || 0) * Number(item.qty || 0);
    }, 0);
    return saleSum + saleHpp;
  }, 0);
}

export function buildSaleStockMovements(transaction, products = []) {
  return (transaction.items || []).flatMap((item) => {
    const product = products.find((p) => String(p.id) === String(item.productId));
    if (!product?.recipe) return [];

    return product.recipe.map((recipe) => ({
      ingredientId: recipe.ingredientId,
      type: 'keluar',
      movementType: 'out',
      qty: recipe.qty * Number(item.qty || 0),
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
  return (expense.items || [])
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
      .filter((movement) => String(movement.ingredientId) === String(ingredient.id))
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
    .filter((sale) => sale.date?.startsWith(date))
    .reduce((sum, sale) => {
      if (sale.paymentBreakdown && typeof sale.paymentBreakdown === 'object') {
        return sum + Number(sale.paymentBreakdown.cash || 0);
      }
      return sum + (sale.paymentMethod === 'cash' ? Number(sale.total || 0) : 0);
    }, 0);
  const cashExpenses = expenses
    .filter((expense) => expense.date?.startsWith(date))
    .reduce((sum, expense) => sum + Number(expense.total || 0), 0);

  return openingCash + cashSales - cashExpenses;
}
