import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Flame,
  Info,
  Layers,
  MapPin,
  Network,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Trees,
  Waves,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { CATEGORY_LIST, REGION_LIST } from '../data/taxonomy.js';
import {
  getAllStories,
  getCategoryCounts,
  getConnectedStories,
  getFeaturedStories,
  getRegionCounts,
  getStoryBySlug,
} from '../utils/storyHelpers.js';
import { formatStoryCount, HOME_EXPLORE_COPY } from '../i18n/homeExplore.js';
import EpistemicBadge from '../components/common/EpistemicBadge.jsx';
import SectionHeader from '../components/common/SectionHeader.jsx';
import InteractiveEarthMap from '../components/earth/InteractiveEarthMap.jsx';
import RelationshipBadge from '../components/stories/RelationshipBadge.jsx';
import StoryCard from '../components/stories/StoryCard.jsx';
import '../styles/homeExplore.css';

const CATEGORY_ICONS = {
  Trees,
  PawPrint,
  Flame,
  Waves,
};

const EPISTEMIC_TYPES = ['fact', 'estimate', 'interpretation', 'uncertainty'];

function formatCoordPair(coords) {
  if (!coords) return '';
  const latDir = coords.lat >= 0 ? 'N' : 'S';
  const lngDir = coords.lng >= 0 ? 'E' : 'W';
  return `${Math.abs(coords.lat).toFixed(2)}° ${latDir}, ${Math.abs(coords.lng).toFixed(2)}° ${lngDir}`;
}

export default function HomePage() {
  const { lang, t, pick } = useLanguage();

  useEffect(() => {
    document.title = `${t('nav.home')} — ${t('site.title')}`;
  }, [t]);

  const allStories = useMemo(() => getAllStories(), []);
  const featuredStories = useMemo(() => getFeaturedStories(), []);
  const categoryCounts = useMemo(() => getCategoryCounts(), []);
  const regionCounts = useMemo(() => getRegionCounts(), []);

  const totalEdges = useMemo(
    () =>
      allStories.reduce(
        (acc, story) =>
          acc + (Array.isArray(story.relatedStories) ? story.relatedStories.length : 0),
        0
      ),
    [allStories]
  );

  const curatedConnections = useMemo(() => {
    const picks = [
      { sourceSlug: 'sumatra-rainforest-deforestation', targetSlug: 'sumatran-tiger-conservation' },
      { sourceSlug: 'sumatra-rainforest-deforestation', targetSlug: 'indonesia-peatland-fires' },
      { sourceSlug: 'sumatran-tiger-conservation', targetSlug: 'sumatran-orangutan-leuser' },
      { sourceSlug: 'indonesia-mangrove-blue-carbon', targetSlug: 'indonesia-peatland-fires' },
    ];

    const resolved = [];
    for (const pair of picks) {
      const sourceStory = getStoryBySlug(pair.sourceSlug);
      if (!sourceStory) continue;
      const match = getConnectedStories(pair.sourceSlug).find(
        (conn) => conn.story.slug === pair.targetSlug
      );
      if (match) {
        resolved.push({
          sourceStory,
          targetStory: match.story,
          relationType: match.relationType,
          rationale: match.rationale,
        });
      }
    }
    return resolved;
  }, []);

  const copy = HOME_EXPLORE_COPY.home;

  return (
    <>
      {/* 1. Informative Hero + Interactive Earth Representation */}
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="container home-hero__grid">
          <div className="home-hero__copy">
            <span className="eyebrow">
              <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
              <span>{t('site.themeBadge')}</span>
            </span>

            <h1 id="home-hero-title" className="home-hero__title">
              {pick(copy.hero.title)}
            </h1>

            <p className="home-hero__tagline">{t('site.tagline')}</p>

            <p className="home-hero__description">{pick(copy.hero.description)}</p>

            <div className="home-hero__actions">
              <Link to="/explore" className="btn btn--primary btn--lg">
                <Compass size={18} strokeWidth={2} aria-hidden="true" />
                <span>{pick(copy.hero.primaryCta)}</span>
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link to="/about" className="btn btn--secondary btn--lg">
                <Info size={18} strokeWidth={2} aria-hidden="true" />
                <span>{pick(copy.hero.secondaryCta)}</span>
              </Link>
            </div>

            <div className="home-hero__stats" role="list">
              <div className="home-hero__stat" role="listitem">
                <span className="home-hero__stat-value tabular-nums">
                  {allStories.length}
                </span>
                <span className="home-hero__stat-label">
                  {pick(copy.hero.statStoriesLabel)}
                </span>
              </div>
              <div className="home-hero__stat" role="listitem">
                <span className="home-hero__stat-value tabular-nums">
                  {totalEdges}
                </span>
                <span className="home-hero__stat-label">
                  {pick(copy.hero.statConnectionsLabel)}
                </span>
              </div>
              <div className="home-hero__stat" role="listitem">
                <span className="home-hero__stat-value tabular-nums">
                  {CATEGORY_LIST.length}
                </span>
                <span className="home-hero__stat-label">
                  {pick(copy.hero.statDomainsLabel)}
                </span>
              </div>
            </div>

            <figure className="home-hero__earth-inset">
              <img
                src="/images/blue-marble-earth.jpg"
                alt={pick(copy.hero.blueMarbleAlt)}
                className="home-hero__earth-thumb"
                width="52"
                height="52"
              />
              <figcaption className="home-hero__earth-caption">
                <span className="home-hero__earth-title">
                  {pick(copy.hero.earthContextTitle)}
                </span>
                <span className="home-hero__earth-credit">
                  {pick(copy.hero.blueMarbleCredit)}
                </span>
              </figcaption>
            </figure>
          </div>

          <InteractiveEarthMap
            stories={allStories}
            initialStorySlug="sumatra-rainforest-deforestation"
            layout="stacked"
          />
        </div>
      </section>

      {/* 2. Featured Environmental Stories */}
      <section className="page-section" aria-labelledby="home-featured-heading">
        <div className="container">
          <SectionHeader
            id="home-featured-heading"
            eyebrow={copy.featured.eyebrow}
            title={copy.featured.title}
            subtitle={copy.featured.subtitle}
            icon={BookOpen}
            action={
              <Link to="/explore" className="btn btn--secondary btn--sm">
                <span>{pick(copy.featured.viewAllCta)}</span>
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            }
          />

          <div className="grid grid--3">
            {featuredStories.map((story) => (
              <StoryCard key={story.slug} story={story} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. Explore by Category */}
      <section
        className="page-section section--surface"
        aria-labelledby="home-categories-heading"
      >
        <div className="container">
          <SectionHeader
            id="home-categories-heading"
            eyebrow={copy.categories.eyebrow}
            title={copy.categories.title}
            subtitle={copy.categories.subtitle}
            icon={Layers}
          />

          <div className="grid grid--4">
            {CATEGORY_LIST.map((cat) => {
              const IconComp = CATEGORY_ICONS[cat.icon] || Trees;
              const count = categoryCounts[cat.id] ?? 0;

              return (
                <Link
                  key={cat.id}
                  to={`/explore?category=${encodeURIComponent(cat.id)}`}
                  className="card card--interactive category-card"
                  style={{
                    '--cat-color': cat.color,
                    '--cat-bg': cat.bgTint,
                    '--cat-border': cat.borderTint,
                  }}
                >
                  <div className="category-card__top">
                    <span className="category-card__icon" aria-hidden="true">
                      <IconComp size={20} strokeWidth={2} />
                    </span>
                    <span className="tag tabular-nums">
                      {formatStoryCount(lang, count)}
                    </span>
                  </div>

                  <h3 className="category-card__title">{pick(cat.label)}</h3>
                  <p className="category-card__desc">{pick(cat.description)}</p>

                  <span className="category-card__cta">
                    <span>{pick(copy.categories.exploreCategoryCta)}</span>
                    <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Explore by Location */}
      <section className="page-section" aria-labelledby="home-regions-heading">
        <div className="container">
          <SectionHeader
            id="home-regions-heading"
            eyebrow={copy.regions.eyebrow}
            title={copy.regions.title}
            subtitle={copy.regions.subtitle}
            icon={MapPin}
          />

          <div className="grid grid--auto-fit">
            {REGION_LIST.map((reg) => {
              const count = regionCounts[reg.id] ?? 0;
              return (
                <Link
                  key={reg.id}
                  to={`/explore?region=${encodeURIComponent(reg.id)}`}
                  className="card card--interactive region-card"
                  style={{ '--reg-color': reg.color }}
                >
                  <div className="region-card__top">
                    <span className="region-card__coords">
                      <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                      <span>{formatCoordPair(reg.coordinates)}</span>
                    </span>
                    <span className="tag tabular-nums">
                      {formatStoryCount(lang, count)}
                    </span>
                  </div>

                  <h3 className="region-card__title">{pick(reg.label)}</h3>
                  <p className="region-card__desc">{pick(reg.description)}</p>

                  <span className="region-card__cta">
                    <span>{pick(copy.regions.exploreRegionCta)}</span>
                    <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Connected Stories Preview */}
      <section
        className="page-section section--surface"
        aria-labelledby="home-connections-heading"
      >
        <div className="container">
          <SectionHeader
            id="home-connections-heading"
            eyebrow={copy.connections.eyebrow}
            title={copy.connections.title}
            subtitle={copy.connections.subtitle}
            icon={Network}
            action={
              <Link to="/explore" className="btn btn--secondary btn--sm">
                <span>{pick(copy.connections.exploreGraphCta)}</span>
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            }
          />

          <div className="home-connections-grid">
            {curatedConnections.map((edge) => (
              <article
                key={`${edge.sourceStory.slug}-${edge.targetStory.slug}-${edge.relationType}`}
                className="card connection-preview-card"
              >
                <div className="connection-preview-card__flow">
                  <Link
                    to={`/story/${edge.sourceStory.slug}`}
                    className="connection-preview-card__node"
                  >
                    <span>{pick(edge.sourceStory.title)}</span>
                  </Link>
                  <RelationshipBadge
                    relationType={edge.relationType}
                    targetStory={edge.targetStory}
                    rationale={edge.rationale}
                    size="sm"
                  />
                </div>
                <p className="connection-preview-card__rationale">
                  {pick(edge.rationale)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. About This Project Preview + Epistemic Legend */}
      <section className="page-section" aria-labelledby="home-about-heading">
        <div className="container">
          <div className="card card--elevated home-about-card">
            <SectionHeader
              id="home-about-heading"
              eyebrow={copy.aboutPreview.eyebrow}
              title={copy.aboutPreview.title}
              subtitle={copy.aboutPreview.subtitle}
              icon={ShieldCheck}
            />

            <p className="prose-measure">{pick(copy.aboutPreview.body)}</p>

            <div className="home-about-pillars">
              {copy.aboutPreview.pillars.map((pillar) => (
                <div key={pillar.id} className="home-about-pillar">
                  <h3 className="home-about-pillar__title">{pick(pillar.title)}</h3>
                  <p className="home-about-pillar__body">{pick(pillar.body)}</p>
                </div>
              ))}
            </div>

            <div className="home-about-footer">
              <Link to="/about" className="btn btn--primary">
                <Info size={16} strokeWidth={2} aria-hidden="true" />
                <span>{pick(copy.aboutPreview.cta)}</span>
                <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link to="/explore" className="btn btn--ghost">
                <span>{pick(copy.featured.viewAllCta)}</span>
                <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div
            className="home-epistemic-section"
            aria-labelledby="home-epistemic-heading"
          >
            <SectionHeader
              id="home-epistemic-heading"
              eyebrow={copy.epistemic.eyebrow}
              title={copy.epistemic.title}
              subtitle={copy.epistemic.subtitle}
              icon={Compass}
            />

            <div className="home-epistemic-grid">
              {EPISTEMIC_TYPES.map((type) => (
                <article key={type} className="card home-epistemic-card">
                  <EpistemicBadge type={type} />
                  <p>{t(`epistemic.${type}.description`)}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
