import { getBusinessDate } from './businessDate';

export const promotionTypeLabels = {
  percentage: 'Diskon Persen',
  nominal: 'Diskon Nominal',
  fixed_price: 'Harga Khusus',
  bundle: 'Bundling',
  bogo: 'Buy 1 Get 1',
};

export const promotionStatusLabels = {
  draft: 'Draft',
  scheduled: 'Terjadwal',
  active: 'Aktif',
  completed: 'Selesai',
  canceled: 'Dibatalkan',
};

export function getPromotionStatus(promotion, businessDate = getBusinessDate()) {
  const status = promotion?.status || 'draft';
  if (status === 'draft' || status === 'canceled') return status;
  if (promotion?.endDate && promotion.endDate < businessDate) return 'completed';
  if (promotion?.startDate && promotion.startDate > businessDate) return 'scheduled';
  return 'active';
}

export function isPromotionActive(promotion, businessDate = getBusinessDate()) {
  return getPromotionStatus(promotion, businessDate) === 'active';
}

export function isProductInPromotion(productId, promotion) {
  const targets = promotion?.targetProductIds || [];
  return targets.length === 0 || targets.some((id) => String(id) === String(productId));
}

export function getPromotionPrice(product, promotion) {
  const normalPrice = Number(product?.sellingPrice ?? product?.price ?? 0);
  const discountValue = Number(promotion?.discountValue || 0);
  const bundleQty = Number(promotion?.bundleQty || 0);
  const bundlePrice = Number(promotion?.bundlePrice || 0);
  let promoPrice = normalPrice;

  if (promotion?.type === 'percentage') {
    promoPrice = normalPrice - Math.round((normalPrice * discountValue) / 100);
  } else if (promotion?.type === 'nominal') {
    promoPrice = normalPrice - discountValue;
  } else if (promotion?.type === 'fixed_price') {
    promoPrice = discountValue;
  } else if (promotion?.type === 'bundle' && bundleQty > 0 && bundlePrice > 0) {
    promoPrice = Math.round(bundlePrice / bundleQty);
  }

  promoPrice = Math.max(0, Math.round(Number(promoPrice || 0)));
  return {
    normalPrice,
    promoPrice,
    discountAmount: Math.max(0, normalPrice - promoPrice),
    bundleQty,
    bundlePrice,
  };
}

export function findBestPromotionForProduct(product, promotions = [], businessDate = getBusinessDate()) {
  const activePromotions = (promotions || [])
    .filter((promotion) => isPromotionActive(promotion, businessDate))
    .filter((promotion) => isProductInPromotion(product?.id, promotion))
    .map((promotion) => ({
      promotion,
      pricing: getPromotionPrice(product, promotion),
    }))
    .filter(({ pricing, promotion }) => (
      pricing.discountAmount > 0 || ['bundle', 'bogo'].includes(promotion.type)
    ));

  if (!activePromotions.length) return null;

  return activePromotions.reduce((best, candidate) => (
    candidate.pricing.discountAmount > best.pricing.discountAmount ? candidate : best
  ));
}

export function getPromotionPerformance(promotion, sales = []) {
  const promoId = String(promotion?.id || '');
  const rows = (sales || []).flatMap((sale) => (
    (sale.items || [])
      .filter((item) => String(item.promoId || '') === promoId)
      .map((item) => ({ sale, item }))
  ));

  const totalCup = rows.reduce((sum, row) => sum + Number(row.item.qty || 0), 0);
  const totalOmzet = rows.reduce((sum, row) => sum + Number(row.item.subtotal || 0), 0);
  const totalDiscount = rows.reduce((sum, row) => {
    const qty = Number(row.item.qty || 0);
    const discount = Number(row.item.discountAmount || 0);
    return sum + discount * qty;
  }, 0);
  const transactionIds = new Set(rows.map((row) => row.sale.id));

  return {
    totalCup,
    totalOmzet,
    totalDiscount,
    totalTransactions: transactionIds.size,
    targetProgress: Number(promotion?.targetSales || 0) > 0
      ? Math.min(100, Math.round((totalCup / Number(promotion.targetSales || 1)) * 100))
      : 0,
  };
}
