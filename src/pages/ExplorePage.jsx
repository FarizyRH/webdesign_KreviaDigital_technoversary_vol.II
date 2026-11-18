import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Compass,
  Filter,
  Flame,
  Map,
  MapPin,
  PawPrint,
  RotateCcw,
  Search,
  Trees,
  Waves,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import {
  CATEGORY_LIST,
  getCategoryMeta,
  getRegionMeta,
  REGION_LIST,
} from '../data/taxonomy.js';
import {
  filterStories,
  getAllStories,
  getCategoryCounts,
  getRegionCounts,
} from '../utils/storyHelpers.js';
import { formatExploreCount, HOME_EXPLORE_COPY } from '../i18n/homeExplore.js';
import InteractiveEarthMap from '../components/earth/InteractiveEarthMap.jsx';
import StoryCard from '../components/stories/StoryCard.jsx';
import '../styles/homeExplore.css';

const CATEGORY_ICONS = {
  Trees,
  PawPrint,
  Flame,
  Waves,
};

export default function ExplorePage() {
  const { lang, t, pick } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMap, setShowMap] = useState(true);
  const [selectedMapSlug, setSelectedMapSlug] = useState(undefined);

  useEffect(() => {
    document.title = `${t('nav.explore')} — ${t('site.title')}`;
  }, [t]);

  const rawCategory = searchParams.get('category') || 'all';
  const rawRegion = searchParams.get('region') || 'all';
  const searchQuery = searchParams.get('q') || '';

  const activeCategory = getCategoryMeta(rawCategory) ? rawCategory : 'all';
  const activeRegion = getRegionMeta(rawRegion) ? rawRegion : 'all';

  const allStories = useMemo(() => getAllStories(), []);
  const categoryCounts = useMemo(() => getCategoryCounts(), []);
  const regionCounts = useMemo(() => getRegionCounts(), []);

  const filteredStories = useMemo(
    () =>
      filterStories({
        category: activeCategory,
        region: activeRegion,
        query: searchQuery,
        lang,
      }),
    [activeCategory, activeRegion, searchQuery, lang]
  );

  const filteredSlugs = useMemo(
    () => new Set(filteredStories.map((story) => story.slug)),
    [filteredStories]
  );

  const hasActiveFilters =
    activeCategory !== 'all' ||
    activeRegion !== 'all' ||
    searchQuery.trim() !== '';

  const updateParams = (updates, { replace = false } = {}) => {
    const next = new URLSearchParams(searchParams);

    if (Object.hasOwn(updates, 'category')) {
      if (!updates.category || updates.category === 'all') {
        next.delete('category');
      } else {
        next.set('category', updates.category);
      }
    }

    if (Object.hasOwn(updates, 'region')) {
      if (!updates.region || updates.region === 'all') {
        next.delete('region');
      } else {
        next.set('region', updates.region);
      }
    }

    if (Object.hasOwn(updates, 'q')) {
      if (!updates.q || updates.q.trim() === '') {
        next.delete('q');
      } else {
        next.set('q', updates.q);
      }
    }

    setSearchParams(next, { replace });
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  const copy = HOME_EXPLORE_COPY.explore;

  return (
    <>
      {/* Page Hero */}
      <section className="page-hero" aria-labelledby="explore-page-title">
        <div className="container page-hero__inner">
          <span className="page-hero__eyebrow">
            <Compass size={14} strokeWidth={2} aria-hidden="true" />
            <span>{pick(copy.hero.eyebrow)}</span>
          </span>
          <h1 id="explore-page-title" className="page-hero__title">
            {pick(copy.hero.title)}
          </h1>
          <p className="page-hero__subtitle">{pick(copy.hero.subtitle)}</p>
        </div>
      </section>

      {/* Main Directory & Controls */}
      <section className="page-section">
        <div className="container">
          {/* Search & Filter Controls */}
          <div className="card explore-controls">
            <div className="explore-search-row">
              <div className="explore-search-field">
                <label htmlFor="explore-search-input" className="sr-only">
                  {pick(copy.controls.searchLabel)}
                </label>
                <Search
                  size={17}
                  strokeWidth={2}
                  className="explore-search-icon"
                  aria-hidden="true"
                />
                <input
                  id="explore-search-input"
                  type="search"
                  className="explore-search-input"
                  value={searchQuery}
                  onChange={(e) =>
                    updateParams({ q: e.target.value }, { replace: true })
                  }
                  placeholder={pick(copy.controls.searchPlaceholder)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="explore-search-clear"
                    aria-label={pick(copy.controls.searchClearAria)}
                    onClick={() => updateParams({ q: '' }, { replace: true })}
                  >
                    <X size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div className="explore-filter-groups">
              {/* Category Chips */}
              <div className="explore-filter-group">
                <span className="explore-filter-label">
                  <Filter size={13} strokeWidth={2} aria-hidden="true" />
                  <span>{pick(copy.controls.categoryFilterLabel)}</span>
                </span>
                <div
                  className="explore-chip-row"
                  role="group"
                  aria-label={pick(copy.controls.categoryFilterLabel)}
                >
                  <button
                    type="button"
                    className={`chip ${activeCategory === 'all' ? 'chip--active' : ''}`}
                    aria-pressed={activeCategory === 'all'}
                    onClick={() => updateParams({ category: 'all' })}
                  >
                    <span>{pick(copy.controls.allCategories)}</span>
                    <span className="explore-chip-count tabular-nums">
                      ({allStories.length})
                    </span>
                  </button>

                  {CATEGORY_LIST.map((cat) => {
                    const IconComp = CATEGORY_ICONS[cat.icon] || Trees;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`chip ${isActive ? 'chip--active' : ''}`}
                        aria-pressed={isActive}
                        onClick={() =>
                          updateParams({ category: isActive ? 'all' : cat.id })
                        }
                      >
                        <IconComp size={14} strokeWidth={2} aria-hidden="true" />
                        <span>{pick(cat.shortLabel)}</span>
                        <span className="explore-chip-count tabular-nums">
                          ({categoryCounts[cat.id] ?? 0})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Region Chips */}
              <div className="explore-filter-group">
                <span className="explore-filter-label">
                  <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                  <span>{pick(copy.controls.regionFilterLabel)}</span>
                </span>
                <div
                  className="explore-chip-row"
                  role="group"
                  aria-label={pick(copy.controls.regionFilterLabel)}
                >
                  <button
                    type="button"
                    className={`chip ${activeRegion === 'all' ? 'chip--active' : ''}`}
                    aria-pressed={activeRegion === 'all'}
                    onClick={() => updateParams({ region: 'all' })}
                  >
                    <span>{pick(copy.controls.allRegions)}</span>
                    <span className="explore-chip-count tabular-nums">
                      ({allStories.length})
                    </span>
                  </button>

                  {REGION_LIST.map((reg) => {
                    const isActive = activeRegion === reg.id;
                    return (
                      <button
                        key={reg.id}
                        type="button"
                        className={`chip ${isActive ? 'chip--active' : ''}`}
                        aria-pressed={isActive}
                        onClick={() =>
                          updateParams({ region: isActive ? 'all' : reg.id })
                        }
                      >
                        <span>{pick(reg.shortLabel)}</span>
                        <span className="explore-chip-count tabular-nums">
                          ({regionCounts[reg.id] ?? 0})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Live Status Bar & Map Toggle */}
          <div className="explore-status-bar">
            <p className="explore-result-count" aria-live="polite">
              {formatExploreCount(lang, filteredStories.length, allStories.length)}
            </p>

            <div className="explore-status-actions">
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={handleResetFilters}
                >
                  <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                  <span>{pick(copy.controls.resetFilters)}</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn--sm btn--secondary"
                aria-expanded={showMap}
                aria-controls="explore-map-panel"
                onClick={() => setShowMap((prev) => !prev)}
              >
                <Map size={14} strokeWidth={2} aria-hidden="true" />
                <span>
                  {showMap
                    ? pick(copy.controls.hideMapLabel)
                    : pick(copy.controls.showMapLabel)}
                </span>
              </button>
            </div>
          </div>

          {/* Collapsible Interactive Map Synchronized with Active Filters */}
          {showMap && (
            <div id="explore-map-panel" className="explore-map-panel">
              <InteractiveEarthMap
                stories={allStories}
                highlightedSlugs={filteredSlugs}
                selectedSlug={selectedMapSlug}
                onSelectStory={setSelectedMapSlug}
                layout="split"
              />
            </div>
          )}

          {/* Story Results Grid or Empty State */}
          {filteredStories.length > 0 ? (
            <>
              <h2 className="sr-only">{pick(copy.results.heading)}</h2>
              <div className="grid grid--3 explore-grid">
                {filteredStories.map((story) => (
                  <StoryCard key={story.slug} story={story} />
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state explore-empty">
              <h2 className="explore-empty__title">{pick(copy.results.emptyTitle)}</h2>
              <p className="explore-empty__desc">
                {pick(copy.results.emptyDescription)}
              </p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleResetFilters}
              >
                <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
                <span>{pick(copy.results.emptyResetCta)}</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
