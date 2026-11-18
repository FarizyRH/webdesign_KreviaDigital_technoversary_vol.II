import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES,
  REGIONS,
  RELATIONSHIP_TYPES,
  FACT_TYPES,
  getCategoryMeta,
  getRegionMeta,
  getRelationshipMeta,
} from '../src/data/taxonomy.js';
import {
  getAllStories,
  getFeaturedStories,
  getStoryBySlug,
  getConnectedStories,
  filterStories,
  getCategoryCounts,
  getRegionCounts,
  getGlobalTimelineEvents,
} from '../src/utils/storyHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const errors = [];
const warnings = [];

function addError(msg) {
  errors.push(msg);
}

function addWarning(msg) {
  warnings.push(msg);
}

function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function checkBilingual(obj, ctx) {
  if (!obj || typeof obj !== 'object') {
    addError(`${ctx}: expected bilingual object { id, en }`);
    return;
  }
  if (!isNonEmptyString(obj.id)) {
    addError(`${ctx}.id: missing or empty Indonesian text`);
  }
  if (!isNonEmptyString(obj.en)) {
    addError(`${ctx}.en: missing or empty English text`);
  }
}

function checkValidUrlOrDoi(val) {
  if (!isNonEmptyString(val)) return false;
  const trimmed = val.trim();
  if (/^https?:\/\/\S+$/i.test(trimmed)) return true;
  if (/^(https?:\/\/(dx\.)?doi\.org\/)?10\.\d{4,9}\/\S+$/i.test(trimmed)) return true;
  return false;
}

function checkImageMagicBytes(filePath, minSizeBytes = 1024) {
  if (!fs.existsSync(filePath)) {
    return `file does not exist: ${filePath}`;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return `not a regular file: ${filePath}`;
  }
  if (stat.size <= minSizeBytes) {
    return `file too small (${stat.size} bytes <= ${minSizeBytes}): ${filePath}`;
  }

  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(16);
  try {
    fs.readSync(fd, buf, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }

  const ext = path.extname(filePath).toLowerCase();
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isWebp =
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP';
  const headText = fs.readFileSync(filePath, { encoding: 'utf8' }).slice(0, 256).trimStart();
  const isSvg = headText.startsWith('<svg') || headText.startsWith('<?xml');

  if (ext === '.jpg' || ext === '.jpeg') {
    if (!isJpeg) {
      return `expected JPEG magic bytes (FF D8 FF) in ${filePath}, got ${buf.subarray(0, 4).toString('hex')}`;
    }
    return null;
  }

  if (!isJpeg && !isPng && !isWebp && !isSvg) {
    return `unrecognized image magic bytes in ${filePath}`;
  }
  return null;
}

function scanPlaceholders(value, jsonPath = 'root') {
  if (typeof value === 'string') {
    if (/\b(TBD|TODO|FIXME|PLACEHOLDER|LOREM IPSUM|COMING SOON|XXX|ALIGN_WITH)\b/i.test(value)) {
      addError(`${jsonPath}: contains prohibited placeholder token -> "${value.slice(0, 120)}"`);
    }
    if (/\[[^\]]*(placeholder|align_with|verify_url)[^\]]*\]/i.test(value)) {
      addError(`${jsonPath}: contains bracketed placeholder -> "${value.slice(0, 120)}"`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => scanPlaceholders(item, `${jsonPath}[${idx}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      scanPlaceholders(val, `${jsonPath}.${key}`);
    }
  }
}

function validateFavicon() {
  const faviconPath = path.join(repoRoot, 'public', 'favicon.svg');
  if (!fs.existsSync(faviconPath)) {
    addError(`public/favicon.svg missing at ${faviconPath}`);
    return;
  }
  const stat = fs.statSync(faviconPath);
  if (!stat.isFile() || stat.size < 100) {
    addError(`public/favicon.svg is empty or invalid (${stat.size} bytes)`);
    return;
  }
  const svgText = fs.readFileSync(faviconPath, 'utf8');
  if (!svgText.includes('<svg') || !svgText.includes('</svg>') || !svgText.includes('viewBox="0 0 64 64"')) {
    addError('public/favicon.svg does not appear to be a valid 64x64 SVG document');
  }
}

function validatePublicImagesDirectory() {
  const imagesDir = path.join(repoRoot, 'public', 'images');
  if (!fs.existsSync(imagesDir)) {
    addError(`public/images directory missing at ${imagesDir}`);
    return 0;
  }
  const entries = fs.readdirSync(imagesDir, { withFileTypes: true });
  const jpgFiles = entries
    .filter((entry) => entry.isFile() && /\.(jpg|jpeg)$/i.test(entry.name))
    .map((entry) => entry.name);

  if (jpgFiles.length === 0) {
    addError('public/images contains zero .jpg/.jpeg files');
    return 0;
  }

  for (const filename of jpgFiles) {
    const fullPath = path.join(imagesDir, filename);
    const err = checkImageMagicBytes(fullPath, 10000);
    if (err) {
      addError(`public/images/${filename}: ${err}`);
    }
  }
  return jpgFiles.length;
}

function run() {
  const storiesPath = path.join(repoRoot, 'src', 'data', 'stories.json');
  let data;
  try {
    const raw = fs.readFileSync(storiesPath, 'utf8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`FATAL: Failed to read/parse ${storiesPath}: ${err.message}`);
    process.exit(1);
  }

  // 1. Top-level & Story Count
  if (!isNonEmptyString(data?.version)) {
    addError('stories.json: version must be a non-empty string');
  }
  const stories = data?.stories;
  if (!Array.isArray(stories)) {
    addError('stories.json: stories must be an array');
    reportAndExit();
  }
  if (stories.length < 3 || stories.length > 5) {
    addError(`stories.json: stories.length must be between 3 and 5 (got ${stories.length})`);
  }

  // Placeholder scan across entire JSON
  scanPlaceholders(data, 'stories.json');

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const slugSet = new Set();
  const categoryKeys = new Set(Object.keys(CATEGORIES));
  const regionKeys = new Set(Object.keys(REGIONS));
  const relationshipKeys = new Set(Object.keys(RELATIONSHIP_TYPES));
  const factTypeSet = new Set(FACT_TYPES);

  let featuredCount = 0;
  const seenCategories = new Set();
  const seenRegions = new Set();

  for (let i = 0; i < stories.length; i += 1) {
    const s = stories[i];
    const ctx = `stories[${i}] (${s?.slug ?? 'unknown'})`;

    if (!isNonEmptyString(s?.id) || !slugRegex.test(s.id)) {
      addError(`${ctx}: id must be non-empty kebab-case`);
    }
    if (!isNonEmptyString(s?.slug) || !slugRegex.test(s.slug)) {
      addError(`${ctx}: slug must be non-empty kebab-case`);
    }
    if (s?.id !== s?.slug) {
      addError(`${ctx}: id ("${s?.id}") must equal slug ("${s?.slug}")`);
    }
    if (slugSet.has(s?.slug)) {
      addError(`${ctx}: duplicate slug "${s?.slug}"`);
    } else if (s?.slug) {
      slugSet.add(s.slug);
    }

    if (typeof s?.featured !== 'boolean') {
      addError(`${ctx}: featured must be boolean`);
    } else if (s.featured) {
      featuredCount += 1;
    }

    // 2. Taxonomy keys
    if (!categoryKeys.has(s?.category)) {
      addError(`${ctx}: invalid category "${s?.category}"`);
    } else {
      seenCategories.add(s.category);
    }
    if (!regionKeys.has(s?.region)) {
      addError(`${ctx}: invalid region "${s?.region}"`);
    } else {
      seenRegions.add(s.region);
    }

    // 3. Bilingual text
    checkBilingual(s?.title, `${ctx}.title`);
    checkBilingual(s?.subtitle, `${ctx}.subtitle`);
    checkBilingual(s?.summary, `${ctx}.summary`);
    checkBilingual(s?.location?.name, `${ctx}.location.name`);

    // 4. Sources
    const sourceIds = new Set();
    if (!Array.isArray(s?.sources) || s.sources.length < 1) {
      addError(`${ctx}: sources must be a non-empty array`);
    } else {
      s.sources.forEach((src, sIdx) => {
        const sCtx = `${ctx}.sources[${sIdx}]`;
        if (!isNonEmptyString(src?.id)) {
          addError(`${sCtx}: id must be non-empty string`);
        } else if (sourceIds.has(src.id)) {
          addError(`${sCtx}: duplicate source id "${src.id}"`);
        } else {
          sourceIds.add(src.id);
        }
        if (!isNonEmptyString(src?.title)) addError(`${sCtx}: missing title`);
        if (!isNonEmptyString(src?.authorOrInstitution)) addError(`${sCtx}: missing authorOrInstitution`);
        if (!isNonEmptyString(src?.year)) addError(`${sCtx}: missing year`);
        if (!checkValidUrlOrDoi(src?.urlOrDoi)) {
          addError(`${sCtx}: invalid urlOrDoi "${src?.urlOrDoi}"`);
        }
        checkBilingual(src?.supportedClaim, `${sCtx}.supportedClaim`);
      });
    }

    const assertSourceRefs = (refs, refCtx) => {
      if (!Array.isArray(refs) || refs.length === 0) {
        addError(`${refCtx}: sourceIds must be a non-empty array`);
        return;
      }
      for (const refId of refs) {
        if (!sourceIds.has(refId)) {
          addError(`${refCtx}: unresolved sourceId "${refId}"`);
        }
      }
    };

    // KeyMetric
    if (!isNonEmptyString(s?.keyMetric?.value)) {
      addError(`${ctx}.keyMetric.value: must be non-empty string`);
    }
    checkBilingual(s?.keyMetric?.label, `${ctx}.keyMetric.label`);
    if (!['fact', 'estimate'].includes(s?.keyMetric?.factType)) {
      addError(`${ctx}.keyMetric.factType: must be "fact" or "estimate" (got "${s?.keyMetric?.factType}")`);
    }
    if (!sourceIds.has(s?.keyMetric?.sourceId)) {
      addError(`${ctx}.keyMetric.sourceId: unresolved "${s?.keyMetric?.sourceId}"`);
    }

    // Sections
    for (const secKey of ['introduction', 'place', 'whatIsHappening']) {
      const paras = s?.sections?.[secKey]?.paragraphs;
      if (!Array.isArray(paras) || paras.length === 0) {
        addError(`${ctx}.sections.${secKey}.paragraphs: must be non-empty array`);
      } else {
        paras.forEach((p, pIdx) => {
          const pCtx = `${ctx}.sections.${secKey}.paragraphs[${pIdx}]`;
          checkBilingual(p, pCtx);
          if (!factTypeSet.has(p?.factType)) {
            addError(`${pCtx}.factType: invalid "${p?.factType}"`);
          }
          assertSourceRefs(p?.sourceIds, pCtx);
        });
      }
    }

    for (const listKey of ['causes', 'impacts']) {
      const items = s?.sections?.[listKey]?.items;
      if (!Array.isArray(items) || items.length === 0) {
        addError(`${ctx}.sections.${listKey}.items: must be non-empty array`);
      } else {
        items.forEach((item, idx) => {
          const iCtx = `${ctx}.sections.${listKey}.items[${idx}]`;
          checkBilingual(item?.title, `${iCtx}.title`);
          checkBilingual(item?.detail, `${iCtx}.detail`);
          if (!factTypeSet.has(item?.factType)) {
            addError(`${iCtx}.factType: invalid "${item?.factType}"`);
          }
          assertSourceRefs(item?.sourceIds, iCtx);
        });
      }
    }

    // Limitations
    const lim = s?.sections?.limitations;
    checkBilingual(lim, `${ctx}.sections.limitations`);
    if (lim && lim.factType !== 'uncertainty') {
      addError(`${ctx}.sections.limitations.factType: must be "uncertainty" (got "${lim.factType}")`);
    }
    assertSourceRefs(lim?.sourceIds, `${ctx}.sections.limitations`);

    // Timeline
    if (!Array.isArray(s?.timeline) || s.timeline.length === 0) {
      addError(`${ctx}.timeline: must be non-empty array`);
    } else {
      s.timeline.forEach((ev, tIdx) => {
        const tCtx = `${ctx}.timeline[${tIdx}]`;
        if (!isNonEmptyString(ev?.date)) {
          addError(`${tCtx}.date: must be non-empty string`);
        }
        checkBilingual(ev?.title, `${tCtx}.title`);
        checkBilingual(ev?.detail, `${tCtx}.detail`);
        if (!factTypeSet.has(ev?.factType)) {
          addError(`${tCtx}.factType: invalid "${ev?.factType}"`);
        }
        assertSourceRefs(ev?.sourceIds, tCtx);
      });
    }

    // 5. Hero image
    const img = s?.heroImage;
    if (!isNonEmptyString(img?.src) || !/^\/images\/[a-z0-9._-]+$/i.test(img.src)) {
      addError(`${ctx}.heroImage.src: must match /images/<filename> (got "${img?.src}")`);
    } else {
      const imgFilePath = path.join(repoRoot, 'public', img.src.replace(/^\//, ''));
      const imgErr = checkImageMagicBytes(imgFilePath, 10000);
      if (imgErr) {
        addError(`${ctx}.heroImage.src: ${imgErr}`);
      }
    }
    checkBilingual(img?.alt, `${ctx}.heroImage.alt`);
    checkBilingual(img?.caption, `${ctx}.heroImage.caption`);
    if (!isNonEmptyString(img?.author)) addError(`${ctx}.heroImage.author: missing`);
    if (!isNonEmptyString(img?.license)) addError(`${ctx}.heroImage.license: missing`);
    if (!isNonEmptyString(img?.attribution)) addError(`${ctx}.heroImage.attribution: missing`);
    if (!isNonEmptyString(img?.licenseUrl) || !/^https?:\/\/.+/.test(img.licenseUrl)) {
      addError(`${ctx}.heroImage.licenseUrl: invalid URL "${img?.licenseUrl}"`);
    }
    if (!isNonEmptyString(img?.sourceUrl) || !/^https?:\/\/.+/.test(img.sourceUrl)) {
      addError(`${ctx}.heroImage.sourceUrl: invalid URL "${img?.sourceUrl}"`);
    }

    // 6. Location & mapAnchor (0..1000 Indonesia Archipelago canvas)
    const coords = s?.location?.coordinates;
    if (typeof coords?.lat !== 'number' || !Number.isFinite(coords.lat) || coords.lat < -90 || coords.lat > 90) {
      addError(`${ctx}.location.coordinates.lat: out of range [-90, 90]`);
    }
    if (typeof coords?.lng !== 'number' || !Number.isFinite(coords.lng) || coords.lng < -180 || coords.lng > 180) {
      addError(`${ctx}.location.coordinates.lng: out of range [-180, 180]`);
    }
    if (!isNonEmptyString(coords?.label)) {
      addError(`${ctx}.location.coordinates.label: missing`);
    }
    const anchor = s?.location?.mapAnchor;
    if (typeof anchor?.x !== 'number' || !Number.isFinite(anchor.x) || anchor.x < 0 || anchor.x > 1000) {
      addError(`${ctx}.location.mapAnchor.x: must be in [0, 1000] (got ${anchor?.x})`);
    }
    if (typeof anchor?.y !== 'number' || !Number.isFinite(anchor.y) || anchor.y < 0 || anchor.y > 1000) {
      addError(`${ctx}.location.mapAnchor.y: must be in [0, 1000] (got ${anchor?.y})`);
    }

    // 8. Optional chartData
    if (s?.chartData !== undefined) {
      const cd = s.chartData;
      const cdCtx = `${ctx}.chartData`;
      if (!['bar', 'comparison'].includes(cd?.type)) {
        addError(`${cdCtx}.type: must be "bar" or "comparison"`);
      }
      checkBilingual(cd?.title, `${cdCtx}.title`);
      checkBilingual(cd?.note, `${cdCtx}.note`);
      if (!isNonEmptyString(cd?.unit)) {
        addError(`${cdCtx}.unit: must be non-empty string`);
      }
      if (!sourceIds.has(cd?.sourceId)) {
        addError(`${cdCtx}.sourceId: unresolved "${cd?.sourceId}"`);
      }
      if (!Array.isArray(cd?.series) || cd.series.length < 1) {
        addError(`${cdCtx}.series: must be non-empty array`);
      } else {
        cd.series.forEach((pt, ptIdx) => {
          const ptCtx = `${cdCtx}.series[${ptIdx}]`;
          if (!isNonEmptyString(pt?.label)) addError(`${ptCtx}.label: missing`);
          if (typeof pt?.value !== 'number' || !Number.isFinite(pt.value)) {
            addError(`${ptCtx}.value: must be finite number`);
          }
          if (pt?.uncertainty !== undefined && (typeof pt.uncertainty !== 'number' || !Number.isFinite(pt.uncertainty) || pt.uncertainty < 0)) {
            addError(`${ptCtx}.uncertainty: must be non-negative finite number`);
          }
          if (pt?.highlight !== undefined && typeof pt.highlight !== 'boolean') {
            addError(`${ptCtx}.highlight: must be boolean`);
          }
        });
      }
    }
  }

  if (featuredCount < 1) {
    addError('stories.json: at least 1 story must have featured: true');
  }
  if (seenCategories.size < categoryKeys.size) {
    addWarning(`Only ${seenCategories.size}/${categoryKeys.size} taxonomy categories represented in stories`);
  }
  if (seenRegions.size < regionKeys.size) {
    addWarning(`Only ${seenRegions.size}/${regionKeys.size} taxonomy regions represented in stories`);
  }

  // 7. Relationship Graph (second pass after slugSet populated)
  let totalEdges = 0;
  for (let i = 0; i < stories.length; i += 1) {
    const s = stories[i];
    const ctx = `stories[${i}] (${s?.slug})`;
    const rels = s?.relatedStories;
    if (!Array.isArray(rels) || rels.length < 1) {
      addError(`${ctx}.relatedStories: must have at least 1 relationship edge`);
      continue;
    }
    const edgeKeys = new Set();
    rels.forEach((rel, rIdx) => {
      const rCtx = `${ctx}.relatedStories[${rIdx}]`;
      if (!relationshipKeys.has(rel?.relationType)) {
        addError(`${rCtx}.relationType: invalid "${rel?.relationType}"`);
      }
      if (!slugSet.has(rel?.targetSlug)) {
        addError(`${rCtx}.targetSlug: unresolved "${rel?.targetSlug}"`);
      }
      if (rel?.targetSlug === s?.slug) {
        addError(`${rCtx}: self-loop detected for "${s?.slug}"`);
      }
      const edgeKey = `${s?.slug}->${rel?.targetSlug}::${rel?.relationType}`;
      if (edgeKeys.has(edgeKey)) {
        addError(`${rCtx}: duplicate relationship edge "${edgeKey}"`);
      } else {
        edgeKeys.add(edgeKey);
        totalEdges += 1;
      }
      checkBilingual(rel?.rationale, `${rCtx}.rationale`);
    });
  }

  // Favicon & public/images/ directory verification
  validateFavicon();
  const publicImageCount = validatePublicImagesDirectory();

  // 9. storyHelpers.js Node ESM Smoke Checks
  const allStories = getAllStories();
  if (allStories.length !== stories.length) {
    addError(`storyHelpers.getAllStories(): expected ${stories.length}, got ${allStories.length}`);
  }
  if (getFeaturedStories().length < 1) {
    addError('storyHelpers.getFeaturedStories(): expected >= 1 featured story');
  }
  if (getStoryBySlug('non-existent-slug') !== undefined) {
    addError('storyHelpers.getStoryBySlug("non-existent-slug"): expected undefined');
  }
  if (stories.length > 0) {
    const firstSlug = stories[0].slug;
    if (getStoryBySlug(firstSlug)?.slug !== firstSlug) {
      addError(`storyHelpers.getStoryBySlug("${firstSlug}") failed to resolve`);
    }
    const connected = getConnectedStories(firstSlug);
    if (connected.length !== stories[0].relatedStories.length) {
      addError(`storyHelpers.getConnectedStories("${firstSlug}"): expected ${stories[0].relatedStories.length}, got ${connected.length}`);
    }
  }
  if (filterStories({}).length !== stories.length) {
    addError(`storyHelpers.filterStories({}): expected ${stories.length}`);
  }
  if (filterStories({ query: 'harimau' }).length < 1 || filterStories({ query: 'tiger' }).length < 1) {
    addError('storyHelpers.filterStories(): bilingual query ("harimau" / "tiger") failed to match');
  }

  const catCounts = getCategoryCounts();
  const catSum = Object.values(catCounts).reduce((acc, n) => acc + n, 0);
  if (catSum !== stories.length) {
    addError(`storyHelpers.getCategoryCounts(): sum ${catSum} !== ${stories.length}`);
  }

  const regCounts = getRegionCounts();
  const regSum = Object.values(regCounts).reduce((acc, n) => acc + n, 0);
  if (regSum !== stories.length) {
    addError(`storyHelpers.getRegionCounts(): sum ${regSum} !== ${stories.length}`);
  }

  const timelineEvents = getGlobalTimelineEvents();
  if (timelineEvents.length === 0) {
    addError('storyHelpers.getGlobalTimelineEvents(): expected non-empty array');
  }
  for (let i = 1; i < timelineEvents.length; i += 1) {
    if (timelineEvents[i].sortKey < timelineEvents[i - 1].sortKey) {
      addError(`storyHelpers.getGlobalTimelineEvents(): sort order violated at index ${i}`);
    }
  }

  // 10. taxonomy.js Getter Prototype-Safety & Non-String Smoke Checks
  const unsafeTaxonomyInputs = [
    '__proto__',
    'constructor',
    'toString',
    'valueOf',
    'hasOwnProperty',
    null,
    undefined,
    123,
  ];
  for (const [fnName, getterFn] of [
    ['getCategoryMeta', getCategoryMeta],
    ['getRegionMeta', getRegionMeta],
    ['getRelationshipMeta', getRelationshipMeta],
  ]) {
    for (const badInput of unsafeTaxonomyInputs) {
      const res = getterFn(badInput);
      if (res !== null) {
        addError(`taxonomy.${fnName}(${String(badInput)}): expected null, got ${typeof res}`);
      }
    }
  }
  if (getCategoryMeta('forest-loss')?.id !== 'forest-loss') {
    addError('taxonomy.getCategoryMeta("forest-loss"): failed to resolve valid category');
  }
  if (getRegionMeta('sumatra')?.id !== 'sumatra') {
    addError('taxonomy.getRegionMeta("sumatra"): failed to resolve valid region');
  }
  if (getRelationshipMeta('Affects')?.id !== 'Affects') {
    addError('taxonomy.getRelationshipMeta("Affects"): failed to resolve valid relationship type');
  }

  reportAndExit({
    storyCount: stories.length,
    featuredCount,
    totalEdges,
    publicImageCount,
    timelineCount: timelineEvents.length,
  });
}

function reportAndExit(summary = {}) {
  if (warnings.length > 0) {
    console.warn('Warnings:');
    for (const w of warnings) console.warn(`  - ${w}`);
  }
  if (errors.length > 0) {
    console.error(`\nValidation FAILED with ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`  [ERROR] ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `Validation PASSED: ${summary.storyCount} stories (${summary.featuredCount} featured), ` +
      `${summary.totalEdges} relationship edges, ${summary.timelineCount} timeline events, ` +
      `${summary.publicImageCount} verified local JPEGs in public/images/, favicon.svg valid, ` +
      `and all taxonomy.js & storyHelpers.js ESM smoke checks passed.`
  );
  process.exit(0);
}

run();
