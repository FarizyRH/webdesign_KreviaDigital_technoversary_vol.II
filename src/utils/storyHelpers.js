import storiesData from '../data/stories.json' with { type: 'json' };
import { CATEGORIES, REGIONS } from '../data/taxonomy.js';

const MONTH_MAP = {
  jan: 1,
  january: 1,
  januari: 1,
  feb: 2,
  february: 2,
  februari: 2,
  mar: 3,
  march: 3,
  maret: 3,
  apr: 4,
  april: 4,
  may: 5,
  mei: 5,
  jun: 6,
  june: 6,
  juni: 6,
  jul: 7,
  july: 7,
  juli: 7,
  aug: 8,
  august: 8,
  agu: 8,
  agustus: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  okt: 10,
  oktober: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
  des: 12,
  desember: 12,
};

function parseTimelineSortKey(dateStr) {
  if (typeof dateStr !== 'string') return 0;
  const trimmed = dateStr.trim();
  const primaryPart = trimmed.split(/[–—]/)[0].trim();

  const isoMatch = primaryPart.match(/^((?:19|20)\d{2})(?:-(\d{1,2})(?:-(\d{1,2}))?)?/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = isoMatch[2] ? Math.min(12, Math.max(1, Number(isoMatch[2]))) : 0;
    const day = isoMatch[3] ? Math.min(31, Math.max(1, Number(isoMatch[3]))) : 0;
    return year * 10000 + month * 100 + day;
  }

  const yearMatch = primaryPart.match(/(19|20)\d{2}/);
  if (!yearMatch) return 0;
  const year = Number(yearMatch[0]);

  let month = 0;
  const tokens = primaryPart.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    if (MONTH_MAP[tok]) {
      month = MONTH_MAP[tok];
      break;
    }
  }

  return year * 10000 + month * 100;
}

export function getAllStories() {
  return [...(Array.isArray(storiesData?.stories) ? storiesData.stories : [])];
}

export function getFeaturedStories() {
  return getAllStories().filter((story) => Boolean(story?.featured));
}

export function getStoryBySlug(slug) {
  if (typeof slug !== 'string') return undefined;
  const normalized = slug.trim();
  if (!normalized) return undefined;
  return getAllStories().find((story) => story.slug === normalized || story.id === normalized);
}

export function getConnectedStories(slug) {
  const source = getStoryBySlug(slug);
  if (!source || !Array.isArray(source.relatedStories)) {
    return [];
  }

  const seen = new Set();
  const connected = [];

  for (const rel of source.relatedStories) {
    const target = getStoryBySlug(rel?.targetSlug);
    if (!target || target.slug === source.slug) {
      continue;
    }
    const dedupeKey = `${target.slug}::${rel.relationType}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    connected.push({
      story: target,
      relationType: rel.relationType,
      rationale: rel.rationale,
    });
  }

  return connected;
}

export function filterStories(filters = {}) {
  const { category = '', region = '', query = '', lang = 'id' } = filters ?? {};
  const stories = getAllStories();
  const normalizedQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
  const activeLang = lang === 'en' ? 'en' : 'id';

  return stories.filter((story) => {
    if (category && category !== 'all' && story.category !== category) {
      return false;
    }
    if (region && region !== 'all' && story.region !== region) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const catMeta = CATEGORIES[story.category];
    const regMeta = REGIONS[story.region];
    const causesItems = Array.isArray(story.sections?.causes?.items) ? story.sections.causes.items : [];
    const impactsItems = Array.isArray(story.sections?.impacts?.items) ? story.sections.impacts.items : [];

    const corpusParts = [
      story.slug,
      story.title?.[activeLang],
      story.title?.id,
      story.title?.en,
      story.subtitle?.id,
      story.subtitle?.en,
      story.summary?.id,
      story.summary?.en,
      story.location?.name?.id,
      story.location?.name?.en,
      story.location?.coordinates?.label,
      catMeta?.label?.id,
      catMeta?.label?.en,
      regMeta?.label?.id,
      regMeta?.label?.en,
      ...causesItems.flatMap((item) => [item?.title?.id, item?.title?.en]),
      ...impactsItems.flatMap((item) => [item?.title?.id, item?.title?.en]),
    ];

    const haystack = corpusParts.filter((part) => typeof part === 'string' && part.trim() !== '').join(' ').toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function getCategoryCounts() {
  const counts = {};
  for (const key of Object.keys(CATEGORIES)) {
    counts[key] = 0;
  }
  for (const story of getAllStories()) {
    if (story.category && Object.prototype.hasOwnProperty.call(counts, story.category)) {
      counts[story.category] += 1;
    }
  }
  return counts;
}

export function getRegionCounts() {
  const counts = {};
  for (const key of Object.keys(REGIONS)) {
    counts[key] = 0;
  }
  for (const story of getAllStories()) {
    if (story.region && Object.prototype.hasOwnProperty.call(counts, story.region)) {
      counts[story.region] += 1;
    }
  }
  return counts;
}

export function getGlobalTimelineEvents() {
  const events = [];
  for (const story of getAllStories()) {
    if (!Array.isArray(story.timeline)) continue;
    for (const item of story.timeline) {
      events.push({
        ...item,
        sortKey: parseTimelineSortKey(item?.date),
        storySlug: story.slug,
        storyTitle: story.title,
        storyCategory: story.category,
        storyRegion: story.region,
      });
    }
  }

  events.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    const slugCmp = a.storySlug.localeCompare(b.storySlug);
    if (slugCmp !== 0) return slugCmp;
    return (a.title?.en ?? '').localeCompare(b.title?.en ?? '');
  });

  return events;
}
