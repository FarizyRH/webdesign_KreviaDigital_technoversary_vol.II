import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const E2E_ROOT = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(E2E_ROOT, '..');

export const PROTECTED_GUIDEBOOK_NAME = 'GUIDEBOOK WEB DESIGN (1).pdf';
export const PROTECTED_GUIDEBOOK_BYTES = 74073708;

export const TEAM_NAME_PLACEHOLDER = '[TEAM_NAME_PLACEHOLDER — fill in before submission]';

export const TEAM_MEMBERS = [
  {
    name: 'Albert Christian',
    roleRegex: /ketua|team\s*lead|lead/i,
    github: 'https://github.com/Albertchristiann14',
  },
  {
    name: 'Ananta Firdaus',
    roleRegex: /anggota|member/i,
    github: 'https://github.com/Ananta-TI',
  },
  {
    name: 'Farizy Rahman Hidayat',
    roleRegex: /anggota|member/i,
    github: 'https://github.com/FarizyRH',
  },
];

export const ALLOWED_RELATIONS = [
  'Located in',
  'Related to',
  'Affects',
  'Part of',
  'Observed in',
  'Associated with',
];

export const RELATION_BILINGUAL_REGEX =
  /\b(located\s+in|terletak\s+di|berlokasi\s+di|related\s+to|terkait(\s+dengan)?|affects|mempengaruhi|memengaruhi|part\s+of|bagian\s+dari|observed\s+in|diamati\s+di|teramati\s+di|associated\s+with|berhubungan\s+dengan|berkaitan\s+dengan|berasosiasi\s+dengan)\b/i;

export function relationRegexForLang(lang) {
  if (lang === 'en') {
    return /\b(located\s+in|related\s+to|affects|part\s+of|observed\s+in|associated\s+with)\b/i;
  }
  return /\b(berlokasi\s+di|terletak\s+di|terkait(\s+dengan)?|memengaruhi|mempengaruhi|bagian\s+dari|teramati\s+di|diamati\s+di|berasosiasi\s+dengan|berhubungan\s+dengan|berkaitan\s+dengan)\b/i;
}

export const VALID_FACT_TYPES = ['fact', 'estimate', 'interpretation', 'uncertainty'];

export const EPISTEMIC_BILINGUAL_REGEX =
  /\b(fakta(\s+terukur)?|measurable\s+fact|fact|estimasi(\s+ilmiah)?|scientific\s+estimate|estimate|perkiraan|interpretasi(\s+kausal)?|causal\s+interpretation|interpretation|ketidakpastian(\s*(&|dan)\s*batasan)?|uncertainty(\s*(&|and)\s*limitations)?)\b/i;

export function epistemicRegexForLang(lang) {
  if (lang === 'en') {
    return /\b(measurable\s+fact|scientific\s+estimate|causal\s+interpretation|uncertainty\s*(&|and)\s*limitations)\b/i;
  }
  return /\b(fakta\s+terukur|estimasi\s+ilmiah|interpretasi\s+kausal|ketidakpastian\s*(&|dan)\s*batasan)\b/i;
}

export const README_REQUIRED_SECTION_PATTERNS = [
  /Interactive Global Environmental Explorer/i,
  /\b(deskripsi|description)\b/i,
  /\b(tujuan|goal)\b/i,
  /\b(fitur|features?)\b/i,
  /\b(teknologi|technologies|tech\s*stack|stack)\b/i,
  /\b(instalasi|installation)\b/i,
  /(menjalankan|run\s+instructions|how\s+to\s+run|usage)/i,
  /(struktur\s+proyek|project\s+structure)/i,
  /\b(tim|team)\b/i,
  /\b(anggota|members?)\b/i,
  /(sumber\s+data|referensi|data\s+sources|references)/i,
  /\b(atribusi|kredit|attributions?|credits?)\b/i,
];

export const PROHIBITED_UI_KITS = [
  'tailwindui',
  '@tailwindplus',
  'bootstrap-themes',
  'themeforest',
  'creative-tim',
  'mui-pro',
  '@mui/x-data-grid-pro',
  'primereact-pro',
  'ant-design-pro',
  'antd-pro',
  'fontawesome-pro',
  '@fortawesome/pro',
  'syncfusion',
  'kendo',
];

export const PROHIBITED_BLOAT_SDKS = [
  'firebase',
  'supabase',
  '@supabase/supabase-js',
  'openai',
  'three',
  '@react-three/fiber',
  'auth0',
  'clerk',
  'mixpanel',
  'amplitude',
  'posthog-js',
];

export const PLACEHOLDER_PROSE_REGEX =
  /\b(lorem\s+ipsum|todo|tbd|coming\s+soon|dummy\s+text)\b/i;

export const FAKE_CONTACT_EMAIL_REGEX =
  /(?:\bmailto:|(?<![/@\w])[a-z0-9._%+-]+@[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,10}(?![/\w.]))/i;

export const FAKE_PHONE_REGEX =
  /(?:\btel:|(?<![\d.])(?:\+62[\s-]?8\d{1,3}|08[1-9]\d)[\s-]?\d{3,4}(?:[\s-]?\d{2,5})?\b)/i;

function createSyntheticFixture() {
  const stories = [
    {
      id: 'sumatra-rainforest-deforestation',
      slug: 'sumatra-rainforest-deforestation',
      featured: true,
      category: 'forest-loss',
      region: 'sumatra',
      location: {
        name: { id: 'Sumatra, Indonesia', en: 'Sumatra, Indonesia' },
        coordinates: { lat: -0.5, lng: 101.5, label: 'Sumatra' },
        mapAnchor: { x: 180, y: 120 },
      },
      heroImage: {
        src: '/fixture.svg',
        alt: { id: 'Ilustrasi hutan Sumatra', en: 'Sumatra forest illustration' },
        caption: { id: 'Kanopi hutan', en: 'Forest canopy' },
        author: 'NASA',
        license: 'Public Domain',
        licenseUrl: 'https://earthobservatory.nasa.gov',
        sourceUrl: 'https://earthobservatory.nasa.gov',
        attribution: 'NASA Earth Observatory (Public Domain)',
      },
      title: { id: 'Deforestasi Hutan Hujan Sumatra', en: 'Sumatra Rainforest Deforestation' },
      subtitle: { id: 'Perubahan tutupan hutan primer', en: 'Primary forest cover change' },
      summary: { id: 'Ringkasan deforestasi Sumatra.', en: 'Summary of Sumatra deforestation.' },
      keyMetric: {
        value: '7.54 Mha',
        label: { id: 'Hilangnya hutan primer 2000-2012', en: 'Primary forest loss 2000-2012' },
        factType: 'fact',
        sourceId: 'margono-2014',
      },
      sections: {
        introduction: { paragraphs: [{ id: 'Pengantar', en: 'Introduction', factType: 'fact', sourceIds: ['margono-2014'] }] },
        place: { paragraphs: [{ id: 'Pulau Sumatra', en: 'Sumatra Island', factType: 'fact', sourceIds: ['margono-2014'] }] },
        whatIsHappening: { paragraphs: [{ id: 'Kehilangan tutupan pohon', en: 'Tree cover loss', factType: 'estimate', sourceIds: ['margono-2014'] }] },
        causes: { items: [{ title: { id: 'Alih fungsi lahan', en: 'Land conversion' }, detail: { id: 'Perluasan perkebunan', en: 'Plantation expansion' }, factType: 'interpretation', sourceIds: ['margono-2014'] }] },
        impacts: { items: [{ title: { id: 'Fragmentasi habitat', en: 'Habitat fragmentation' }, detail: { id: 'Menekan satwa liar', en: 'Pressures wildlife' }, factType: 'fact', sourceIds: ['margono-2014'] }] },
        limitations: { id: 'Citra satelit memiliki keterbatasan tutupan awan.', en: 'Satellite imagery has cloud cover uncertainty.', factType: 'uncertainty', sourceIds: ['margono-2014'] },
      },
      timeline: [{ date: '2014', title: { id: 'Studi Margono', en: 'Margono study' }, detail: { id: 'Analisis tutupan hutan', en: 'Forest cover analysis' }, factType: 'fact', sourceIds: ['margono-2014'] }],
      sources: [{ id: 'margono-2014', title: 'Primary forest cover loss in Indonesia', authorOrInstitution: 'Margono et al.', year: '2014', urlOrDoi: 'https://doi.org/10.1038/nclimate2277', supportedClaim: { id: 'Hilangnya hutan primer', en: 'Primary forest loss' } }],
      relatedStories: [{ targetSlug: 'sumatran-tiger-conservation', relationType: 'Affects', rationale: { id: 'Mempengaruhi habitat harimau', en: 'Affects tiger habitat' } }],
    },
    {
      id: 'sumatran-tiger-conservation',
      slug: 'sumatran-tiger-conservation',
      featured: true,
      category: 'endangered-species',
      region: 'kerinci-seblat',
      location: {
        name: { id: 'Kerinci Seblat, Sumatra', en: 'Kerinci Seblat, Sumatra' },
        coordinates: { lat: -1.7, lng: 101.4, label: 'Kerinci Seblat' },
        mapAnchor: { x: 185, y: 140 },
      },
      heroImage: {
        src: '/fixture.svg',
        alt: { id: 'Harimau Sumatra', en: 'Sumatran Tiger' },
        caption: { id: 'Harimau Sumatra', en: 'Sumatran Tiger' },
        author: 'Wikimedia Contributor',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        sourceUrl: 'https://commons.wikimedia.org',
        attribution: 'Wikimedia Contributor (CC BY-SA 4.0)',
      },
      title: { id: 'Konservasi Harimau Sumatra', en: 'Sumatran Tiger Conservation' },
      subtitle: { id: 'Populasi terancam kritis', en: 'Critically endangered population' },
      summary: { id: 'Ringkasan harimau Sumatra.', en: 'Summary of Sumatran tiger.' },
      keyMetric: {
        value: '393',
        label: { id: 'Estimasi individu dewasa', en: 'Estimated mature individuals' },
        factType: 'estimate',
        sourceId: 'iucn-2022',
      },
      sections: {
        introduction: { paragraphs: [{ id: 'Pengantar', en: 'Introduction', factType: 'fact', sourceIds: ['iucn-2022'] }] },
        place: { paragraphs: [{ id: 'Bentang alam hutan Sumatra', en: 'Sumatra forest landscape', factType: 'fact', sourceIds: ['iucn-2022'] }] },
        whatIsHappening: { paragraphs: [{ id: 'Penurunan populasi', en: 'Population decline', factType: 'estimate', sourceIds: ['iucn-2022'] }] },
        causes: { items: [{ title: { id: 'Hilangnya habitat', en: 'Habitat loss' }, detail: { id: 'Fragmentasi lanskap', en: 'Landscape fragmentation' }, factType: 'fact', sourceIds: ['iucn-2022'] }] },
        impacts: { items: [{ title: { id: 'Risiko kepunahan', en: 'Extinction risk' }, detail: { id: 'Populasi kecil terisolasi', en: 'Small isolated subpopulations' }, factType: 'uncertainty', sourceIds: ['iucn-2022'] }] },
        limitations: { id: 'Interval kepercayaan kamera jebak cukup lebar.', en: 'Camera-trap confidence intervals remain wide.', factType: 'uncertainty', sourceIds: ['iucn-2022'] },
      },
      timeline: [{ date: '2022', title: { id: 'Penilaian IUCN', en: 'IUCN Assessment' }, detail: { id: 'Status Kritis', en: 'Critically Endangered status' }, factType: 'estimate', sourceIds: ['iucn-2022'] }],
      sources: [{ id: 'iucn-2022', title: 'Panthera tigris IUCN Red List', authorOrInstitution: 'Goodrich et al. / IUCN', year: '2022', urlOrDoi: 'https://www.iucnredlist.org', supportedClaim: { id: 'Estimasi populasi', en: 'Population estimate' } }],
      relatedStories: [{ targetSlug: 'sumatra-rainforest-deforestation', relationType: 'Related to', rationale: { id: 'Terkait hilangnya hutan', en: 'Related to forest loss' } }],
    },
    {
      id: 'indonesia-peatland-fires',
      slug: 'indonesia-peatland-fires',
      featured: true,
      category: 'climate-fires',
      region: 'riau-south-sumatra',
      location: {
        name: { id: 'Riau & Sumatra Selatan', en: 'Riau & South Sumatra' },
        coordinates: { lat: 0.5, lng: 102.0, label: 'Riau' },
        mapAnchor: { x: 195, y: 115 },
      },
      heroImage: {
        src: '/fixture.svg',
        alt: { id: 'Lahan gambut', en: 'Peatland landscape' },
        caption: { id: 'Lahan gambut', en: 'Peatland landscape' },
        author: 'NASA',
        license: 'Public Domain',
        licenseUrl: 'https://earthobservatory.nasa.gov',
        sourceUrl: 'https://earthobservatory.nasa.gov',
        attribution: 'NASA Earth Observatory (Public Domain)',
      },
      title: { id: 'Kebakaran Lahan Gambut Indonesia', en: 'Indonesia Peatland Fires' },
      subtitle: { id: 'Dinamika karhutla dan gambut', en: 'Peatland fire dynamics' },
      summary: { id: 'Ringkasan karhutla gambut.', en: 'Summary of peatland fires.' },
      keyMetric: {
        value: '2,611,411 ha',
        label: { id: 'Luas kebakaran 2015', en: '2015 burned area' },
        factType: 'fact',
        sourceId: 'sipongi-klhk',
      },
      sections: {
        introduction: { paragraphs: [{ id: 'Pengantar', en: 'Introduction', factType: 'fact', sourceIds: ['sipongi-klhk'] }] },
        place: { paragraphs: [{ id: 'Kubah gambut tropis', en: 'Tropical peat domes', factType: 'fact', sourceIds: ['sipongi-klhk'] }] },
        whatIsHappening: { paragraphs: [{ id: 'Kebakaran berulang saat El Nino', en: 'Recurrent fires during El Nino', factType: 'fact', sourceIds: ['sipongi-klhk'] }] },
        causes: { items: [{ title: { id: 'Drainase gambut', en: 'Peat drainage' }, detail: { id: 'Mengeringkan lapisan gambut', en: 'Dries peat layer' }, factType: 'fact', sourceIds: ['sipongi-klhk'] }] },
        impacts: { items: [{ title: { id: 'Emisi karbon & kabut asap', en: 'Carbon emissions & haze' }, detail: { id: 'Berdampak luas', en: 'Widespread impact' }, factType: 'estimate', sourceIds: ['sipongi-klhk'] }] },
        limitations: { id: 'Data luas terbakar bergantung pada pemetaan satelit.', en: 'Burned area figures depend on satellite mapping.', factType: 'uncertainty', sourceIds: ['sipongi-klhk'] },
      },
      timeline: [{ date: '2015', title: { id: 'Puncak Karhutla 2015', en: '2015 Fire Peak' }, detail: { id: '2.61 juta ha terbakar', en: '2.61 million ha burned' }, factType: 'fact', sourceIds: ['sipongi-klhk'] }],
      chartData: {
        type: 'bar',
        title: { id: 'Luas Area Terbakar (SiPongi)', en: 'Burned Area (SiPongi)' },
        unit: 'ha',
        note: { id: 'Sumber resmi KLHK SiPongi', en: 'Official KLHK SiPongi data' },
        sourceId: 'sipongi-klhk',
        series: [
          { label: '2015', value: 2611411, highlight: true },
          { label: '2019', value: 1649258 },
          { label: '2023', value: 1161193 },
        ],
      },
      sources: [{ id: 'sipongi-klhk', title: 'Rekapitulasi Luas Kebakaran Hutan dan Lahan', authorOrInstitution: 'KLHK SiPongi', year: '2024', urlOrDoi: 'https://sipongi.menlhk.go.id', supportedClaim: { id: 'Luas kebakaran nasional', en: 'National burned area' } }],
      relatedStories: [{ targetSlug: 'sumatra-rainforest-deforestation', relationType: 'Associated with', rationale: { id: 'Berkaitan dengan pembukaan lahan', en: 'Associated with land clearing' } }],
    },
  ];
  return {
    version: 'fixture',
    stories,
    slugs: stories.map((s) => s.slug),
    categories: [...new Set(stories.map((s) => s.category))],
    regions: [...new Set(stories.map((s) => s.region))],
    chartStories: stories.filter((s) => Boolean(s.chartData)),
    nonChartStories: stories.filter((s) => !s.chartData),
    isFixture: true,
  };
}

export function loadStoriesContract({ allowFixture = false } = {}) {
  const storiesPath = path.join(REPO_ROOT, 'src', 'data', 'stories.json');
  if (!fs.existsSync(storiesPath)) {
    if (allowFixture) {
      return createSyntheticFixture();
    }
    throw new Error(`Missing contracted dataset: ${storiesPath}`);
  }
  const raw = fs.readFileSync(storiesPath, 'utf8');
  const parsed = JSON.parse(raw);
  const stories = Array.isArray(parsed.stories) ? parsed.stories : [];
  return {
    version: parsed.version ?? null,
    stories,
    slugs: stories.map((s) => s.slug),
    categories: [...new Set(stories.map((s) => s.category))],
    regions: [...new Set(stories.map((s) => s.region))],
    chartStories: stories.filter((s) => Boolean(s.chartData)),
    nonChartStories: stories.filter((s) => !s.chartData),
    isFixture: false,
  };
}

export function loadReadmeContract() {
  const readmePath = path.join(REPO_ROOT, 'README.md');
  if (!fs.existsSync(readmePath)) {
    throw new Error(`Missing contracted README.md: ${readmePath}`);
  }
  return fs.readFileSync(readmePath, 'utf8');
}

export function loadPackageJsonContract() {
  const pkgPath = path.join(REPO_ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`Missing contracted package.json: ${pkgPath}`);
  }
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

export function loadIndexHtmlContract() {
  const indexPath = path.join(REPO_ROOT, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing index.html: ${indexPath}`);
  }
  return fs.readFileSync(indexPath, 'utf8');
}

export function getGuidebookStat() {
  const guidebookPath = path.join(REPO_ROOT, PROTECTED_GUIDEBOOK_NAME);
  if (!fs.existsSync(guidebookPath)) {
    return { exists: false, size: -1, path: guidebookPath };
  }
  const stat = fs.statSync(guidebookPath);
  return { exists: true, size: stat.size, path: guidebookPath };
}

export function publicImageExists(srcPath) {
  if (!srcPath || typeof srcPath !== 'string') return false;
  const normalized = srcPath.replace(/^\/+/, '');
  const fullPath = path.join(REPO_ROOT, 'public', normalized);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0;
}

export function collectStoryClaimRefs(story) {
  const refs = [
    ...(story.sections?.introduction?.paragraphs ?? []).map((item) => ({ ...item, kind: 'introduction' })),
    ...(story.sections?.place?.paragraphs ?? []).map((item) => ({ ...item, kind: 'place' })),
    ...(story.sections?.whatIsHappening?.paragraphs ?? []).map((item) => ({ ...item, kind: 'whatIsHappening' })),
    ...(story.sections?.causes?.items ?? []).map((item) => ({ ...item, kind: 'causes' })),
    ...(story.sections?.impacts?.items ?? []).map((item) => ({ ...item, kind: 'impacts' })),
    ...(story.timeline ?? []).map((item) => ({ ...item, kind: 'timeline' })),
  ];
  if (story.keyMetric) {
    refs.push({
      kind: 'keyMetric',
      factType: story.keyMetric.factType,
      sourceIds: story.keyMetric.sourceId ? [story.keyMetric.sourceId] : [],
    });
  }
  if (story.sections?.limitations) {
    refs.push({
      kind: 'limitations',
      factType: story.sections.limitations.factType,
      sourceIds: Array.isArray(story.sections.limitations.sourceIds)
        ? story.sections.limitations.sourceIds
        : [],
    });
  }
  if (story.chartData) {
    refs.push({
      kind: 'chartData',
      factType: 'fact',
      skipFactTypeCheck: true,
      sourceIds: story.chartData.sourceId ? [story.chartData.sourceId] : [],
    });
  }
  return refs;
}

export function categoryRegexForKey(categoryKey) {
  const map = {
    'forest-loss': /forest[\s-]*loss|deforestasi|hilangnya?\s+hutan|kehilangan\s+hutan|tutupan\s+hutan/i,
    'endangered-species': /endangered[\s-]*species|spesies\s+terancam|satwa\s+terancam|konservasi\s+spesies/i,
    'climate-fires': /climate[\s,&-]*(?:carbon[\s,&-]*)?fires|iklim.*(?:kebakaran|karhutla)|kebakaran.*gambut|karhutla|karbon\s*&\s*api/i,
    'coastal-blue-carbon': /coastal|blue[\s-]*carbon|pesisir|karbon\s+biru|mangrove/i,
  };
  return map[categoryKey] ?? new RegExp(categoryKey.replace(/[-_]+/g, '[\\s\\-_]*'), 'i');
}

export function regionRegexForKey(regionKey) {
  const map = {
    sumatra: /(?:dataran\s+rendah.*sumatra|sumatra\s+lowlands|(?<!(?:south|north)\s+)\bsumatra\b(?!\s+(?:selatan|utara)))/i,
    'leuser-aceh': /leuser|aceh/i,
    'kerinci-seblat': /kerinci|seblat/i,
    'riau-south-sumatra': /riau|sumatra\s+selatan|south\s+sumatra/i,
    'archipelago-coast': /archipelag|kepulauan|pesisir|nusantara/i,
  };
  return map[regionKey] ?? new RegExp(regionKey.replace(/[-_]+/g, '[\\s\\-_]*'), 'i');
}
