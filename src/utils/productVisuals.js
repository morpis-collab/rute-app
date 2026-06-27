const visualCatalog = [
  {
    keys: ['ruang coffee', 'kopi susu', 'aren'],
    image: '/menu/ruang-coffee.svg',
    accent: 'var(--color-band-1)',
    tone: 'var(--color-success-bg)',
    label: 'Kopi susu',
  },
  {
    keys: ['tengah coffee'],
    image: '/menu/tengah-coffee.svg',
    accent: 'var(--color-text-secondary)',
    tone: 'var(--color-info-bg)',
    label: 'Signature',
  },
  {
    keys: ['americano'],
    image: '/menu/americano.svg',
    accent: 'var(--color-band-2)',
    tone: 'var(--color-coffee-cream)',
    label: 'Espresso',
  },
  {
    keys: ['butterscotch'],
    image: '/menu/butterscotch-coffee.svg',
    accent: 'var(--color-band-3)',
    tone: 'var(--color-band-4)',
    label: 'Creamy',
  },
  {
    keys: ['matcha'],
    image: '/menu/matcha.svg',
    accent: 'var(--color-accent-blue)',
    tone: 'var(--color-info-bg)',
    label: 'Non-kopi',
  },
  {
    keys: ['red velvet', 'velvet'],
    image: '/menu/red-velvet.svg',
    accent: 'var(--color-accent-red)',
    tone: 'var(--color-danger-bg)',
    label: 'Non-kopi',
  },
  {
    keys: ['taro'],
    image: '/menu/taro.svg',
    accent: 'var(--color-accent-secondary)',
    tone: 'var(--color-bg-secondary)',
    label: 'Non-kopi',
  },
  {
    keys: ['coklat', 'chocolate'],
    image: '/menu/coklat.svg',
    accent: 'var(--color-accent-orange)',
    tone: 'var(--color-warning-bg)',
    label: 'Coklat',
  },
  {
    keys: ['lychee', 'tea', 'teh'],
    image: '/menu/lychee-tea.svg',
    accent: 'var(--color-accent-blue)',
    tone: 'var(--color-info-bg)',
    label: 'Tea',
  },
];

function normalize(value) {
  return String(value || '').toLowerCase();
}

export function getProductVisual(product = {}) {
  if (product.imageUrl) {
    return {
      image: product.imageUrl,
      accent: 'var(--color-band-1)',
      tone: 'var(--color-success-bg)',
      label: product.category || 'Menu',
    };
  }

  const haystack = `${normalize(product.name)} ${normalize(product.category)}`;
  const matched = visualCatalog.find((visual) => visual.keys.some((key) => haystack.includes(key)));
  if (matched) return matched;

  if (haystack.includes('non')) {
    return {
      image: '/menu/fallback.svg',
      accent: 'var(--color-accent-blue)',
      tone: 'var(--color-info-bg)',
      label: 'Non-kopi',
    };
  }

  return {
    image: '/menu/fallback.svg',
    accent: 'var(--color-band-1)',
    tone: 'var(--color-band-4)',
    label: product.category || 'Menu',
  };
}

export function getIngredientTone(item = {}) {
  const status = item.status || (Number(item.stock || 0) <= Number(item.minStock || 0) ? 'kritis' : 'aman');
  if (status === 'kritis' || status === 'habis') {
    return { accent: 'var(--color-accent-red)', tone: 'var(--color-danger-bg)', label: 'Kritis' };
  }
  if (String(item.category || '').includes('packaging')) {
    return { accent: 'var(--color-accent-secondary)', tone: 'var(--color-info-bg)', label: 'Packaging' };
  }
  return { accent: 'var(--color-accent-blue)', tone: 'var(--color-success-bg)', label: 'Aman' };
}
