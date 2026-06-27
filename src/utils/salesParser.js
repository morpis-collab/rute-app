export const PRODUCT_NICKNAMES = {
  'ruang': 1,
  'rute': 1,
  'kopi susu': 1,
  'americano': 3,
  'ame': 3,
  'cokelat': 4,
  'chocolate': 4,
  'coklat': 4,
  'es kopi': 5,
  'thai tea': 6,
  'tea': 6,
  'thai': 6,
  'morpis': 1779031553821,
  'matcha': 2,
};

export function inputDateToIso(date) {
  return date ? `${date}T12:00:00.000Z` : undefined;
}

export function productPrice(product) {
  return Number(product?.sellingPrice ?? product?.price ?? 0);
}

export function fuzzyMatchProduct(text, productsList) {
  const query = String(text || '').toLowerCase().trim();
  if (!query) return '';

  // 1. Direct match with nicknames
  for (const [nickname, id] of Object.entries(PRODUCT_NICKNAMES)) {
    if (query.includes(nickname)) {
      const found = productsList.find(p => String(p.id) === String(id));
      if (found) return found.id;
    }
  }

  // 2. Exact name contains or matching
  const matches = productsList.map(product => {
    const name = String(product.name || '').toLowerCase();
    let score = 0;

    if (name === query) score = 100;
    else if (name.includes(query)) score = 80;
    else if (query.includes(name)) score = 60;

    // Word overlapping check
    const queryWords = query.split(/\s+/);
    const nameWords = name.split(/\s+/);
    const commonWords = queryWords.filter(w => nameWords.includes(w));
    score += commonWords.length * 20;

    return { id: product.id, score };
  });

  const sorted = matches.sort((a, b) => b.score - a.score);
  if (sorted[0] && sorted[0].score > 30) {
    return sorted[0].id;
  }

  return '';
}
