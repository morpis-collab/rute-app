const visualCatalog = [
  {
    keys: ['ruang coffee', 'kopi susu', 'aren'],
    image: '/menu/ruang-coffee.svg',
    accent: '#4F684F',
    tone: '#E9F1E6',
    label: 'Kopi susu',
  },
  {
    keys: ['tengah coffee'],
    image: '/menu/tengah-coffee.svg',
    accent: '#526B55',
    tone: '#EDF4EA',
    label: 'Signature',
  },
  {
    keys: ['americano'],
    image: '/menu/americano.svg',
    accent: '#2F4634',
    tone: '#E1EADF',
    label: 'Espresso',
  },
  {
    keys: ['butterscotch'],
    image: '/menu/butterscotch-coffee.svg',
    accent: '#7D9078',
    tone: '#F1F5EF',
    label: 'Creamy',
  },
  {
    keys: ['matcha'],
    image: '/menu/matcha.svg',
    accent: '#5D8D63',
    tone: '#EAF4E5',
    label: 'Non-kopi',
  },
  {
    keys: ['red velvet', 'velvet'],
    image: '/menu/red-velvet.svg',
    accent: '#B94F58',
    tone: '#FBE7EA',
    label: 'Non-kopi',
  },
  {
    keys: ['taro'],
    image: '/menu/taro.svg',
    accent: '#7C6F58',
    tone: '#F0E8DC',
    label: 'Non-kopi',
  },
  {
    keys: ['coklat', 'chocolate'],
    image: '/menu/coklat.svg',
    accent: '#70412B',
    tone: '#F1E2D7',
    label: 'Coklat',
  },
  {
    keys: ['lychee', 'tea', 'teh'],
    image: '/menu/lychee-tea.svg',
    accent: '#667C62',
    tone: '#EDF4EA',
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
      accent: '#4F684F',
      tone: '#E9F1E6',
      label: product.category || 'Menu',
    };
  }

  const haystack = `${normalize(product.name)} ${normalize(product.category)}`;
  const matched = visualCatalog.find((visual) => visual.keys.some((key) => haystack.includes(key)));
  if (matched) return matched;

  if (haystack.includes('non')) {
    return {
      image: '/menu/fallback.svg',
      accent: '#5D8D63',
      tone: '#EAF4E5',
      label: 'Non-kopi',
    };
  }

  return {
    image: '/menu/fallback.svg',
    accent: '#4F684F',
    tone: '#F1F5EF',
    label: product.category || 'Menu',
  };
}

export function getIngredientTone(item = {}) {
  const status = item.status || (Number(item.stock || 0) <= Number(item.minStock || 0) ? 'kritis' : 'aman');
  if (status === 'kritis' || status === 'habis') {
    return { accent: '#C45F4E', tone: '#FFF0EC', label: 'Kritis' };
  }
  if (String(item.category || '').includes('packaging')) {
    return { accent: '#78906F', tone: '#EEF4E8', label: 'Packaging' };
  }
  return { accent: '#5D8D63', tone: '#ECF6EA', label: 'Aman' };
}
