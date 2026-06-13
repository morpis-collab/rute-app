const visualCatalog = [
  {
    keys: ['ruang coffee', 'kopi susu', 'aren'],
    image: '/menu/ruang-coffee.svg',
    accent: '#B86F2E',
    tone: '#FFF0DD',
    label: 'Kopi susu',
  },
  {
    keys: ['tengah coffee'],
    image: '/menu/tengah-coffee.svg',
    accent: '#8A5635',
    tone: '#F6E8DC',
    label: 'Signature',
  },
  {
    keys: ['americano'],
    image: '/menu/americano.svg',
    accent: '#5F3B24',
    tone: '#EFE4DA',
    label: 'Espresso',
  },
  {
    keys: ['butterscotch'],
    image: '/menu/butterscotch-coffee.svg',
    accent: '#C98237',
    tone: '#FFF2D8',
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
    accent: '#7E6AB0',
    tone: '#EFEAF9',
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
    accent: '#D08B42',
    tone: '#FFF1D9',
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
      accent: '#A96835',
      tone: '#FFF0DD',
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
    accent: '#A96835',
    tone: '#F5E9DD',
    label: product.category || 'Menu',
  };
}

export function getIngredientTone(item = {}) {
  const status = item.status || (Number(item.stock || 0) <= Number(item.minStock || 0) ? 'kritis' : 'aman');
  if (status === 'kritis' || status === 'habis') {
    return { accent: '#C45F4E', tone: '#FFF0EC', label: 'Kritis' };
  }
  if (String(item.category || '').includes('packaging')) {
    return { accent: '#5F83A5', tone: '#EAF3FA', label: 'Packaging' };
  }
  return { accent: '#5D8D63', tone: '#ECF6EA', label: 'Aman' };
}
