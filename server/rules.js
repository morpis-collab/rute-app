export const APPROVAL_THRESHOLDS = {
  auto: 100000,
  notify: 300000,
};

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

export function getSalesSummary(sales = []) {
  const totalOmzet = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totalTransaksi = sales.length;
  const totalCup = sales.reduce(
    (sum, sale) => sum + (sale.items || []).reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0),
    0,
  );
  const byMethod = { cash: 0, qris: 0, transfer: 0 };
  const menuCount = {};

  sales.forEach((sale) => {
    if (sale.paymentBreakdown && typeof sale.paymentBreakdown === 'object') {
      byMethod.cash += Number(sale.paymentBreakdown.cash || 0);
      byMethod.qris += Number(sale.paymentBreakdown.qris || 0);
      byMethod.transfer += Number(sale.paymentBreakdown.transfer || 0);
    } else {
      const method = sale.paymentMethod || 'cash';
      byMethod[method] = (byMethod[method] || 0) + Number(sale.total || 0);
    }
    (sale.items || []).forEach((item) => {
      menuCount[item.name] = (menuCount[item.name] || 0) + Number(item.qty || 0);
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

export function getEstimatedHpp(sales = [], products = []) {
  return sales.reduce((saleSum, sale) => {
    const saleHpp = (sale.items || []).reduce((itemSum, item) => {
      if (item.estimatedHpp != null) return itemSum + Number(item.estimatedHpp || 0);
      const product = products.find((candidate) => String(candidate.id) === String(item.productId));
      return itemSum + Number(product?.hpp || 0) * Number(item.qty || 0);
    }, 0);
    return saleSum + saleHpp;
  }, 0);
}

export function calculateProductHpp(product, ingredients = []) {
  if (!product?.recipe?.length) return Number(product?.hpp || 0);

  return product.recipe.reduce((sum, recipe) => {
    const ingredient = ingredients.find(
      (candidate) => String(candidate.id) === String(recipe.ingredientId),
    );
    if (!ingredient) return sum + Number(recipe.cost || 0);

    const baseQty = convertQuantityToIngredientUnit(recipe.qty, recipe.unit, ingredient);
    return sum + baseQty * Number(ingredient.costPerUnit || recipe.costPerUnit || 0);
  }, 0);
}

export function refreshProductCosts(products = [], ingredients = []) {
  return products.map((product) => {
    const hpp = Math.round(calculateProductHpp(product, ingredients));
    const sellingPrice = Number(product.sellingPrice ?? product.price ?? 0);
    const margin = sellingPrice > 0 ? Math.round(((sellingPrice - hpp) / sellingPrice) * 100) : 0;

    return {
      ...product,
      hpp,
      margin,
      recipe: product.recipe?.map((recipe) => {
        const ingredient = ingredients.find(
          (candidate) => String(candidate.id) === String(recipe.ingredientId),
        );
        if (!ingredient) return recipe;

        const baseQty = convertQuantityToIngredientUnit(recipe.qty, recipe.unit, ingredient);
        const cost = Math.round(baseQty * Number(ingredient.costPerUnit || recipe.costPerUnit || 0));
        return {
          ...recipe,
          costPerUnit: Number(ingredient.costPerUnit || recipe.costPerUnit || 0),
          cost,
        };
      }) || [],
    };
  });
}

export function buildSaleStockMovements(transaction, products = []) {
  return (transaction.items || []).flatMap((item) => {
    const product = products.find((candidate) => String(candidate.id) === String(item.productId));
    if (!product?.recipe) return [];

    return product.recipe.map((recipe, index) => ({
      id: `SM-${Date.now()}-${transaction.id}-${recipe.ingredientId}-${index}`,
      ingredientId: recipe.ingredientId,
      type: 'keluar',
      movementType: 'out',
      qty: Number(recipe.qty || 0) * Number(item.qty || 0),
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
    .map((item, index) => ({
      id: `SM-${Date.now()}-${expense.id}-${item.ingredientId}-${index}`,
      ingredientId: item.ingredientId,
      type: 'masuk',
      movementType: 'in',
      qty: Number(item.stockQty || 0),
      unit: item.stockUnit || item.unit,
      source: `Pembelian (${expense.id})`,
      sourceType: 'expense',
      sourceId: expense.id,
      date: expense.date,
      user: expense.user,
    }));
}

export function applyPurchaseCosts(ingredients, expenseItems = []) {
  return ingredients.map((ingredient) => {
    const relevantItems = expenseItems.filter(
      (item) => item.addsStock && String(item.ingredientId) === String(ingredient.id),
    );
    if (!relevantItems.length) return ingredient;

    let nextStock = Number(ingredient.stock || 0);
    let nextCost = Number(ingredient.costPerUnit || 0);

    relevantItems.forEach((item) => {
      const stockQty = Number(item.stockQty ?? item.quantity ?? item.qty ?? 0);
      const stockUnit = item.stockUnit || item.unit;
      const addedBaseQty = convertQuantityToIngredientUnit(stockQty, stockUnit, ingredient);
      const itemTotal = Number(item.total ?? item.subtotal ?? 0);
      if (addedBaseQty <= 0 || itemTotal <= 0) return;

      const oldValue = Math.max(nextStock, 0) * nextCost;
      const newValue = itemTotal;
      nextStock += addedBaseQty;
      nextCost = (oldValue + newValue) / nextStock;
    });

    return {
      ...ingredient,
      costPerUnit: Number(nextCost.toFixed(3)),
    };
  });
}

export function applyStockMovements(ingredients, movements) {
  return ingredients.map((ingredient) => {
    const totalDelta = movements
      .filter((movement) => String(movement.ingredientId) === String(ingredient.id))
      .reduce((sum, movement) => {
        const convertedQty = convertQuantityToIngredientUnit(movement.qty, movement.unit, ingredient);
        if (['masuk', 'in'].includes(movement.type) || movement.movementType === 'in') {
          return sum + convertedQty;
        }
        if (['keluar', 'out'].includes(movement.type) || movement.movementType === 'out') {
          return sum - convertedQty;
        }
        if (movement.type === 'koreksi' || movement.movementType === 'adjustment') {
          return sum + convertedQty;
        }
        return sum;
      }, 0);

    if (!totalDelta) return ingredient;

    const nextStock = Math.max(0, Number((Number(ingredient.stock || 0) + totalDelta).toFixed(3)));
    return {
      ...ingredient,
      stock: nextStock,
      status: getIngredientStatus(nextStock, ingredient.minStock),
    };
  });
}

export function getCashExpected({ sales = [], expenses = [], openingCash = 0, businessDate }) {
  const date = businessDate || new Date().toLocaleDateString('en-CA', {
    timeZone: process.env.RUTE_BUSINESS_TZ || 'Asia/Makassar',
  });
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

  return Number(openingCash || 0) + cashSales - cashExpenses;
}
