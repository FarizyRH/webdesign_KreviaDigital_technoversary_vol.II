export const CATEGORIES = {
  'forest-loss': {
    id: 'forest-loss',
    label: { id: 'Kehilangan Hutan & Tata Guna Lahan', en: 'Forest Loss & Land Use' },
    shortLabel: { id: 'Kehilangan Hutan', en: 'Forest Loss' },
    description: {
      id: 'Deforestasi hutan primer, fragmentasi lanskap, dan perubahan tutupan lahan berbasis satelit.',
      en: 'Primary forest clearing, landscape fragmentation, and satellite-monitored land-cover change.',
    },
    color: '#34d399',
    bgTint: 'rgba(52, 211, 153, 0.12)',
    borderTint: 'rgba(52, 211, 153, 0.35)',
    icon: 'Trees',
  },
  'endangered-species': {
    id: 'endangered-species',
    label: { id: 'Spesies Terancam Punah', en: 'Endangered Species' },
    shortLabel: { id: 'Spesies Terancam', en: 'Endangered Species' },
    description: {
      id: 'Status populasi, ambang kelayakan habitat, dan risiko kepunahan satwa kunci Sumatra.',
      en: 'Population assessments, habitat viability thresholds, and extinction risks for Sumatran flagship fauna.',
    },
    color: '#fbbf24',
    bgTint: 'rgba(251, 191, 36, 0.12)',
    borderTint: 'rgba(251, 191, 36, 0.35)',
    icon: 'PawPrint',
  },
  'climate-fires': {
    id: 'climate-fires',
    label: { id: 'Iklim, Karbon & Karhutla', en: 'Climate, Carbon & Fires' },
    shortLabel: { id: 'Karhutla & Iklim', en: 'Climate & Fires' },
    description: {
      id: 'Degradasi gambut, kekeringan El Niño, kebakaran berulang, dan emisi karbon atmosferik.',
      en: 'Peatland drainage, El Niño drought sensitivity, recurring fires, and atmospheric carbon emissions.',
    },
    color: '#fb923c',
    bgTint: 'rgba(251, 146, 60, 0.12)',
    borderTint: 'rgba(251, 146, 60, 0.35)',
    icon: 'Flame',
  },
  'coastal-blue-carbon': {
    id: 'coastal-blue-carbon',
    label: { id: 'Karbon Biru Pesisir & Laut', en: 'Coastal & Blue Carbon' },
    shortLabel: { id: 'Karbon Biru', en: 'Blue Carbon' },
    description: {
      id: 'Ekosistem mangrove kepulauan, cadangan karbon sedimen pesisir, dan target rehabilitasi.',
      en: 'Archipelagic mangrove ecosystems, coastal soil carbon stocks, and rehabilitation mandates.',
    },
    color: '#38bdf8',
    bgTint: 'rgba(56, 189, 248, 0.12)',
    borderTint: 'rgba(56, 189, 248, 0.35)',
    icon: 'Waves',
  },
};

export const REGIONS = {
  sumatra: {
    id: 'sumatra',
    label: { id: 'Dataran Rendah & Pulau Sumatra', en: 'Sumatra Lowlands & Island-Wide' },
    shortLabel: { id: 'Sumatra', en: 'Sumatra' },
    description: {
      id: 'Lanskap hutan hujan tropis dataran rendah dan koridor konservasi lintas provinsi Sumatra.',
      en: 'Lowland tropical rainforests and cross-province conservation corridors across Sumatra.',
    },
    coordinates: { lat: 0.5, lng: 101.45 },
    color: '#34d399',
    bgTint: 'rgba(52, 211, 153, 0.12)',
    borderTint: 'rgba(52, 211, 153, 0.35)',
  },
  'leuser-aceh': {
    id: 'leuser-aceh',
    label: { id: 'Ekosistem Leuser & Batang Toru (Aceh–Sumut)', en: 'Leuser & Batang Toru (Aceh–North Sumatra)' },
    shortLabel: { id: 'Leuser & Aceh', en: 'Leuser & Aceh' },
    description: {
      id: 'Bentang alam >2,6 juta ha tempat harimau, orangutan, badak, dan gajah Sumatra hidup berdampingan.',
      en: 'Over 2.6 Mha conservation landscape supporting the last coexisting Sumatran megafauna.',
    },
    coordinates: { lat: 3.5, lng: 97.5 },
    color: '#2dd4bf',
    bgTint: 'rgba(45, 212, 191, 0.12)',
    borderTint: 'rgba(45, 212, 191, 0.35)',
  },
  'kerinci-seblat': {
    id: 'kerinci-seblat',
    label: { id: 'Taman Nasional Kerinci Seblat & Bukit Barisan', en: 'Kerinci Seblat & Barisan Range' },
    shortLabel: { id: 'Kerinci Seblat', en: 'Kerinci Seblat' },
    description: {
      id: 'Lanskap inti harimau Sumatra seluas ~1,38 juta ha di sepanjang pegunungan Bukit Barisan.',
      en: 'Core ~1.38 Mha Sumatran tiger landscape spanning the Barisan mountain range.',
    },
    coordinates: { lat: -2.4167, lng: 101.4833 },
    color: '#fbbf24',
    bgTint: 'rgba(251, 191, 36, 0.12)',
    borderTint: 'rgba(251, 191, 36, 0.35)',
  },
  'riau-south-sumatra': {
    id: 'riau-south-sumatra',
    label: { id: 'Sabuk Gambut Riau & Sumatra Selatan', en: 'Riau & South Sumatra Peat Belt' },
    shortLabel: { id: 'Gambut Riau–Sumsel', en: 'Riau–South Sumatra' },
    description: {
      id: 'Zona lahan gambut tropis dataran rendah yang rentan kekeringan El Niño dan karhutla.',
      en: 'Lowland tropical peat swamp belt highly sensitive to El Niño drought and fire.',
    },
    coordinates: { lat: -2.5, lng: 104.5 },
    color: '#fb923c',
    bgTint: 'rgba(251, 146, 60, 0.12)',
    borderTint: 'rgba(251, 146, 60, 0.35)',
  },
  'archipelago-coast': {
    id: 'archipelago-coast',
    label: { id: 'Pesisir Mangrove Kepulauan Indonesia', en: 'Indonesian Archipelagic Coast' },
    shortLabel: { id: 'Pesisir Kepulauan', en: 'Archipelago Coast' },
    description: {
      id: 'Sabuk mangrove pesisir Indonesia (3,36 juta ha) dari Sumatra, Kalimantan, Bali hingga Papua.',
      en: 'Indonesia’s 3.36 Mha coastal mangrove belt spanning Sumatra, Kalimantan, Bali, and Papua.',
    },
    coordinates: { lat: -8.75, lng: 115.21 },
    color: '#38bdf8',
    bgTint: 'rgba(56, 189, 248, 0.12)',
    borderTint: 'rgba(56, 189, 248, 0.35)',
  },
};

export const RELATIONSHIP_TYPES = {
  'Located in': {
    id: 'Located in',
    label: { id: 'Berlokasi di', en: 'Located in' },
    description: {
      id: 'Menunjukkan keterikatan ruang atau wilayah geografis yang sama.',
      en: 'Indicates shared geographic containment or landscape location.',
    },
    color: '#38bdf8',
    bgTint: 'rgba(56, 189, 248, 0.12)',
    borderTint: 'rgba(56, 189, 248, 0.35)',
  },
  'Related to': {
    id: 'Related to',
    label: { id: 'Terkait dengan', en: 'Related to' },
    description: {
      id: 'Menghubungkan fenomena melalui tata kelola, kebijakan, atau perbandingan ekosistem.',
      en: 'Connects phenomena through shared governance, policy, or ecosystem comparison.',
    },
    color: '#94a3b8',
    bgTint: 'rgba(148, 163, 184, 0.12)',
    borderTint: 'rgba(148, 163, 184, 0.35)',
  },
  Affects: {
    id: 'Affects',
    label: { id: 'Memengaruhi', en: 'Affects' },
    description: {
      id: 'Menunjukkan tekanan atau dampak ekologis langsung yang didukung bukti ilmiah.',
      en: 'Indicates a direct ecological pressure or impact supported by scientific evidence.',
    },
    color: '#fb923c',
    bgTint: 'rgba(251, 146, 60, 0.12)',
    borderTint: 'rgba(251, 146, 60, 0.35)',
  },
  'Part of': {
    id: 'Part of',
    label: { id: 'Bagian dari', en: 'Part of' },
    description: {
      id: 'Menunjukkan komponen ekosistem atau kawasan konservasi dalam lanskap yang lebih luas.',
      en: 'Indicates an ecosystem component within a broader conservation landscape.',
    },
    color: '#34d399',
    bgTint: 'rgba(52, 211, 153, 0.12)',
    borderTint: 'rgba(52, 211, 153, 0.35)',
  },
  'Observed in': {
    id: 'Observed in',
    label: { id: 'Teramati di', en: 'Observed in' },
    description: {
      id: 'Menunjukkan ko-eksistensi spesies atau kejadian yang tercatat pada lanskap yang sama.',
      en: 'Indicates documented species coexistence or phenomena observed in the same landscape.',
    },
    color: '#2dd4bf',
    bgTint: 'rgba(45, 212, 191, 0.12)',
    borderTint: 'rgba(45, 212, 191, 0.35)',
  },
  'Associated with': {
    id: 'Associated with',
    label: { id: 'Berasosiasi dengan', en: 'Associated with' },
    description: {
      id: 'Menunjukkan keterkaitan pendorong risiko bersama atau kerentanan ekologis.',
      en: 'Indicates co-occurring risk drivers or shared ecological vulnerability.',
    },
    color: '#fbbf24',
    bgTint: 'rgba(251, 191, 36, 0.12)',
    borderTint: 'rgba(251, 191, 36, 0.35)',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);
export const CATEGORY_KEYS = Object.keys(CATEGORIES);

export const REGION_LIST = Object.values(REGIONS);
export const REGION_KEYS = Object.keys(REGIONS);

export const RELATIONSHIP_LIST = Object.values(RELATIONSHIP_TYPES);
export const RELATIONSHIP_KEYS = Object.keys(RELATIONSHIP_TYPES);

export const FACT_TYPES = ['fact', 'estimate', 'interpretation', 'uncertainty'];

export function getCategoryMeta(key) {
  return typeof key === 'string' && Object.hasOwn(CATEGORIES, key) ? CATEGORIES[key] : null;
}

export function getRegionMeta(key) {
  return typeof key === 'string' && Object.hasOwn(REGIONS, key) ? REGIONS[key] : null;
}

export function getRelationshipMeta(verb) {
  return typeof verb === 'string' && Object.hasOwn(RELATIONSHIP_TYPES, verb) ? RELATIONSHIP_TYPES[verb] : null;
}
