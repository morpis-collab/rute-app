function parsePositiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} wajib lebih dari 0`);
  }
  return number;
}

function roundQty(value) {
  return Number(Number(value || 0).toFixed(3));
}

export function buildStockAdjustmentPayload({
  mode,
  ingredient,
  actualStock,
  qty,
  unit,
  type,
  reason,
  user,
}) {
  if (!ingredient?.id) throw new Error('Bahan baku wajib dipilih');
  const cleanReason = String(reason || '').trim();
  if (!cleanReason) throw new Error('Alasan koreksi wajib diisi');

  if (mode === 'set_actual') {
    const currentStock = Number(ingredient.stock || 0);
    const targetStock = Number(actualStock);
    if (!Number.isFinite(targetStock) || targetStock < 0) {
      throw new Error('Stok aktual harus angka positif');
    }

    const delta = roundQty(targetStock - currentStock);
    if (delta === 0) throw new Error('Stok aktual sama dengan stok sistem');

    const baseUnit = ingredient.unit || unit || 'unit';
    return {
      ingredientId: ingredient.id,
      qty: Math.abs(delta),
      unit: baseUnit,
      type: delta > 0 ? 'masuk' : 'keluar',
      reason: `${cleanReason} - set stok aktual ${targetStock} ${baseUnit} dari sistem ${currentStock} ${baseUnit}`,
      user,
    };
  }

  return {
    ingredientId: ingredient.id,
    qty: parsePositiveNumber(qty, 'Jumlah koreksi'),
    unit: unit || ingredient.unit || 'unit',
    type: type === 'keluar' ? 'keluar' : 'masuk',
    reason: cleanReason,
    user,
  };
}
