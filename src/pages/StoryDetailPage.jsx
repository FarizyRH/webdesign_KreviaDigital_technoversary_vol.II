import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronRight,
  Compass,
  ExternalLink,
  GitBranch,
  Home,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { detailInfo } from '../i18n/detailInfo.js';
import { getStoryBySlug, getConnectedStories } from '../utils/storyHelpers.js';
import {
  getCategoryMeta,
  getRegionMeta,
  getRelationshipMeta,
} from '../data/taxonomy.js';
import SectionHeader from '../components/common/SectionHeader.jsx';
import EpistemicBadge from '../components/common/EpistemicBadge.jsx';
import ClaimCitation from '../components/stories/ClaimCitation.jsx';
import StoryTimeline from '../components/stories/StoryTimeline.jsx';
import DataChart from '../components/stories/DataChart.jsx';
import EvidenceSection from '../components/stories/EvidenceSection.jsx';
import '../styles/detailInfo.css';

export default function StoryDetailPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { lang, t, pick } = useLanguage();
  const copy = (detailInfo[lang] ?? detailInfo.en).storyDetail;

  const story = getStoryBySlug(slug);
  const [highlightedSourceId, setHighlightedSourceId] = useState(null);
  const highlightTimerRef = useRef(null);

  const triggerSourceHighlight = (sourceId) => {
    if (!sourceId) return;
    setHighlightedSourceId(sourceId);
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedSourceId(null);
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (location.hash && location.hash.startsWith('#source-')) {
      const idFromHash = location.hash.slice('#source-'.length);
      if (idFromHash) {
        triggerSourceHighlight(idFromHash);
      }
    }
  }, [location.hash]);

  useEffect(() => {
    if (story) {
      document.title = `${pick(story.title)} — ${t('site.title')}`;
    } else {
      document.title = `${copy.missing.code} — ${t('site.title')}`;
    }
  }, [story, lang, pick, t, copy.missing.code]);

  if (!story) {
    return (
      <section className="container page-section not-found-section">
        <div className="card stub-card not-found-card">
          <p className="not-found-code" aria-hidden="true">
            {copy.missing.code}
          </p>
          <span className="eyebrow">{copy.missing.eyebrow}</span>
          <h1>{copy.missing.title}</h1>
          <p className="stub-description">{copy.missing.message}</p>
          {slug && (
            <p className="stub-slug-line">
              <span>{copy.missing.requestedSlugLabel}:</span>{' '}
              <code>{slug}</code>
            </p>
          )}
          <div className="stub-actions">
            <Link to="/explore" className="btn btn--primary">
              <Compass size={18} aria-hidden="true" />
              <span>{copy.missing.backExplore}</span>
            </Link>
            <Link to="/" className="btn btn--secondary">
              <Home size={18} aria-hidden="true" />
              <span>{copy.missing.backHome}</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const categoryMeta = getCategoryMeta(story.category);
  const regionMeta = getRegionMeta(story.region);
  const connectedStories = getConnectedStories(story.slug);
  const hasChart =
    Array.isArray(story.chartData?.series) && story.chartData.series.length > 0;

  const introParagraphs = Array.isArray(story.sections?.introduction?.paragraphs)
    ? story.sections.introduction.paragraphs
    : [];
  const placeParagraphs = Array.isArray(story.sections?.place?.paragraphs)
    ? story.sections.place.paragraphs
    : [];
  const happeningParagraphs = Array.isArray(
    story.sections?.whatIsHappening?.paragraphs
  )
    ? story.sections.whatIsHappening.paragraphs
    : [];
  const causesItems = Array.isArray(story.sections?.causes?.items)
    ? story.sections.causes.items
    : [];
  const impactsItems = Array.isArray(story.sections?.impacts?.items)
    ? story.sections.impacts.items
    : [];
  const limitationsObj = story.sections?.limitations ?? null;
  const timelineEvents = Array.isArray(story.timeline) ? story.timeline : [];
  const sources = Array.isArray(story.sources) ? story.sources : [];

  const jumpLinks = [
    { id: 'intro', label: copy.sections.introduction },
    { id: 'place', label: copy.sections.place },
    { id: 'what-is-happening', label: copy.sections.whatIsHappening },
    { id: 'causes', label: copy.sections.causes },
    { id: 'impacts', label: copy.sections.impacts },
    ...(hasChart ? [{ id: 'chart', label: copy.sections.chart }] : []),
    { id: 'timeline', label: copy.sections.timeline },
    { id: 'limitations', label: copy.sections.limitations },
    { id: 'evidence', label: copy.sections.evidence },
    { id: 'related', label: copy.sections.related },
  ];

  return (
    <article className="story-detail-page">
      {/* Hero Header */}
      <header className="story-detail-hero">
        <div className="container">
          <nav className="story-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">
              <Home size={14} aria-hidden="true" />
              <span>{copy.breadcrumbHome}</span>
            </Link>
            <ChevronRight size={14} aria-hidden="true" />
            <Link to="/explore">{copy.breadcrumbExplore}</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span className="story-breadcrumb__current" aria-current="page">
              {pick(story.title)}
            </span>
          </nav>

          <div className="story-hero-grid">
            <div className="story-hero-meta">
              <div className="story-meta-badges">
                {categoryMeta && (
                  <span
                    className="story-taxonomy-pill"
                    style={{
                      color: categoryMeta.color,
                      backgroundColor: categoryMeta.bgTint,
                      borderColor: categoryMeta.borderTint,
                    }}
                  >
                    {pick(categoryMeta.label)}
                  </span>
                )}
                {regionMeta && (
                  <span className="story-taxonomy-pill">
                    <MapPin size={13} aria-hidden="true" />
                    <span>{pick(regionMeta.shortLabel)}</span>
                  </span>
                )}
                {story.location?.coordinates?.label && (
                  <span className="story-coords-pill">
                    {story.location.coordinates.label}
                  </span>
                )}
              </div>

              <h1 className="story-hero-title">{pick(story.title)}</h1>

              {story.subtitle && (
                <p className="story-hero-subtitle">{pick(story.subtitle)}</p>
              )}

              {story.summary && (
                <p className="story-hero-summary">{pick(story.summary)}</p>
              )}

              {story.keyMetric && (
                <div className="story-key-metric">
                  <span className="story-key-metric__eyebrow">
                    {copy.keyMetricHeading}
                  </span>
                  <div className="story-key-metric__row">
                    <span className="story-key-metric__value">
                      {story.keyMetric.value}
                    </span>
                    <span className="story-key-metric__label">
                      {pick(story.keyMetric.label)}
                    </span>
                  </div>
                  <div className="story-key-metric__footer">
                    <EpistemicBadge
                      type={story.keyMetric.factType || 'fact'}
                      size="sm"
                    />
                    <ClaimCitation
                      sourceId={story.keyMetric.sourceId}
                      sources={sources}
                      onSelectSource={triggerSourceHighlight}
                    />
                  </div>
                </div>
              )}

              <div>
                <Link to="/explore" className="btn btn--secondary btn--sm">
                  <ArrowLeft size={15} aria-hidden="true" />
                  <span>{copy.backToExplore}</span>
                </Link>
              </div>
            </div>

            {story.heroImage && (
              <figure className="story-hero-figure">
                <div className="story-hero-figure__media">
                  <img
                    src={story.heroImage.src}
                    alt={pick(story.heroImage.alt)}
                    loading="eager"
                  />
                </div>
                <figcaption className="story-hero-figure__caption">
                  <p className="story-hero-figure__caption-text">
                    {pick(story.heroImage.caption)}
                  </p>
                  <div className="story-hero-figure__credit">
                    <span>
                      <strong>{copy.authorLabel}:</strong>{' '}
                      {story.heroImage.author}
                    </span>
                    {story.heroImage.licenseUrl && (
                      <a
                        href={story.heroImage.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{story.heroImage.license}</span>
                        <ExternalLink size={12} aria-hidden="true" />
                        <span className="sr-only">
                          {' '}
                          ({t('common.externalLink')})
                        </span>
                      </a>
                    )}
                    {story.heroImage.sourceUrl && (
                      <a
                        href={story.heroImage.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{copy.sourceLinkLabel}</span>
                        <ExternalLink size={12} aria-hidden="true" />
                        <span className="sr-only">
                          {' '}
                          ({t('common.externalLink')})
                        </span>
                      </a>
                    )}
                  </div>
                </figcaption>
              </figure>
            )}
          </div>
        </div>
      </header>

      {/* Non-Linear Story Body */}
      <div className="container story-detail-body">
        <div className="story-detail-layout">
          <aside className="story-toc" aria-label={copy.jumpNavLabel}>
            <h2 className="story-toc__heading">{copy.tocHeading}</h2>
            <nav aria-label={copy.jumpNavLabel}>
              <ul className="story-toc__list">
                {jumpLinks.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="story-toc__link">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="story-detail-main">
            {/* Introduction */}
            <section
              id="intro"
              className="story-detail-section"
              aria-labelledby="intro-heading"
            >
              <SectionHeader
                id="intro-heading"
                eyebrow={copy.sectionEyebrows.introduction}
                title={copy.sections.introduction}
                icon={BookOpen}
              />
              <div className="story-prose-stack">
                {introParagraphs.map((para, idx) => (
                  <div key={`intro-${idx}`} className="story-paragraph-block">
                    <p className="story-paragraph-text">{pick(para)}</p>
                    <div className="story-claim-meta">
                      <EpistemicBadge
                        type={para.factType || 'fact'}
                        size="sm"
                      />
                      <ClaimCitation
                        sourceIds={para.sourceIds}
                        sources={sources}
                        onSelectSource={triggerSourceHighlight}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* The Place */}
            <section
              id="place"
              className="story-detail-section"
              aria-labelledby="place-heading"
            >
              <SectionHeader
                id="place-heading"
                eyebrow={copy.sectionEyebrows.place}
                title={copy.sections.place}
                icon={MapPin}
              />
              {story.location && (
                <div className="story-place-banner">
                  <MapPin size={16} aria-hidden="true" />
                  <strong>{pick(story.location.name)}</strong>
                  {story.location.coordinates?.label && (
                    <span className="mono">
                      ({story.location.coordinates.label})
                    </span>
                  )}
                </div>
              )}
              <div className="story-prose-stack">
                {placeParagraphs.map((para, idx) => (
                  <div key={`place-${idx}`} className="story-paragraph-block">
                    <p className="story-paragraph-text">{pick(para)}</p>
                    <div className="story-claim-meta">
                      <EpistemicBadge
                        type={para.factType || 'fact'}
                        size="sm"
                      />
                      <ClaimCitation
                        sourceIds={para.sourceIds}
                        sources={sources}
                        onSelectSource={triggerSourceHighlight}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* What Is Happening */}
            <section
              id="what-is-happening"
              className="story-detail-section"
              aria-labelledby="happening-heading"
            >
              <SectionHeader
                id="happening-heading"
                eyebrow={copy.sectionEyebrows.whatIsHappening}
                title={copy.sections.whatIsHappening}
                icon={Compass}
              />
              <div className="story-prose-stack">
                {happeningParagraphs.map((para, idx) => (
                  <div key={`happening-${idx}`} className="story-paragraph-block">
                    <p className="story-paragraph-text">{pick(para)}</p>
                    <div className="story-claim-meta">
                      <EpistemicBadge
                        type={para.factType || 'fact'}
                        size="sm"
                      />
                      <ClaimCitation
                        sourceIds={para.sourceIds}
                        sources={sources}
                        onSelectSource={triggerSourceHighlight}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Causes */}
            <section
              id="causes"
              className="story-detail-section"
              aria-labelledby="causes-heading"
            >
              <SectionHeader
                id="causes-heading"
                eyebrow={copy.sectionEyebrows.causes}
                title={copy.sections.causes}
              />
              <div className="story-items-grid">
                {causesItems.map((item, idx) => (
                  <article key={`cause-${idx}`} className="story-item-card">
                    <div>
                      <h3 className="story-item-card__title">
                        {pick(item.title)}
                      </h3>
                      <p className="story-item-card__detail">
                        {pick(item.detail)}
                      </p>
                    </div>
                    <div className="story-claim-meta">
                      <EpistemicBadge
                        type={item.factType || 'interpretation'}
                        size="sm"
                      />
                      <ClaimCitation
                        sourceIds={item.sourceIds}
                        sources={sources}
                        onSelectSource={triggerSourceHighlight}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Impacts */}
            <section
              id="impacts"
              className="story-detail-section"
              aria-labelledby="impacts-heading"
            >
              <SectionHeader
                id="impacts-heading"
                eyebrow={copy.sectionEyebrows.impacts}
                title={copy.sections.impacts}
              />
              <div className="story-items-grid">
                {impactsItems.map((item, idx) => (
                  <article key={`impact-${idx}`} className="story-item-card">
                    <div>
                      <h3 className="story-item-card__title">
                        {pick(item.title)}
                      </h3>
                      <p className="story-item-card__detail">
                        {pick(item.detail)}
                      </p>
                    </div>
                    <div className="story-claim-meta">
                      <EpistemicBadge
                        type={item.factType || 'fact'}
                        size="sm"
                      />
                      <ClaimCitation
                        sourceIds={item.sourceIds}
                        sources={sources}
                        onSelectSource={triggerSourceHighlight}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Conditional DataChart */}
            {hasChart && (
              <section
                id="chart"
                className="story-detail-section"
                aria-labelledby="chart-heading"
              >
                <SectionHeader
                  id="chart-heading"
                  eyebrow={copy.sectionEyebrows.chart}
                  title={copy.sections.chart}
                  icon={BarChart3}
                />
                <DataChart
                  chartData={story.chartData}
                  sources={sources}
                  onSelectSource={triggerSourceHighlight}
                />
              </section>
            )}

            {/* StoryTimeline */}
            <section
              id="timeline"
              className="story-detail-section"
              aria-labelledby="timeline-heading"
            >
              <SectionHeader
                id="timeline-heading"
                eyebrow={copy.sectionEyebrows.timeline}
                title={copy.sections.timeline}
                subtitle={`${timelineEvents.length} ${copy.timeline.eventCountLabel} — ${copy.timeline.subtitle}`}
                icon={Calendar}
              />
              <StoryTimeline
                events={timelineEvents}
                sources={sources}
                headingId="timeline-heading"
                onSelectSource={triggerSourceHighlight}
              />
            </section>

            {/* Scientific Limitations (single object: { id, en, factType, sourceIds }) */}
            {limitationsObj && (
              <section
                id="limitations"
                className="story-detail-section"
                aria-labelledby="limitations-heading"
              >
                <SectionHeader
                  id="limitations-heading"
                  eyebrow={copy.sectionEyebrows.limitations}
                  title={copy.sections.limitations}
                  icon={ShieldAlert}
                />
                <div className="story-limitations-box">
                  <div className="story-limitations-box__header">
                    <EpistemicBadge
                      type={limitationsObj.factType || 'uncertainty'}
                    />
                    <ClaimCitation
                      sourceIds={limitationsObj.sourceIds}
                      sources={sources}
                      onSelectSource={triggerSourceHighlight}
                    />
                  </div>
                  <p className="story-limitations-box__text">
                    {pick(limitationsObj)}
                  </p>
                </div>
              </section>
            )}

            {/* Evidence & Sources */}
            <section
              id="evidence"
              className="story-detail-section"
              aria-labelledby="evidence-heading"
            >
              <SectionHeader
                id="evidence-heading"
                eyebrow={copy.sectionEyebrows.evidence}
                title={copy.sections.evidence}
                subtitle={copy.evidence.subtitle}
                icon={ShieldCheck}
              />
              <EvidenceSection
                sources={sources}
                heroImage={story.heroImage}
                highlightedSourceId={highlightedSourceId}
              />
            </section>

            {/* Connected / Related Stories (uses taxonomy.js directly — zero M3 imports) */}
            <section
              id="related"
              className="story-detail-section"
              aria-labelledby="related-heading"
            >
              <SectionHeader
                id="related-heading"
                eyebrow={copy.sectionEyebrows.related}
                title={copy.sections.related}
                subtitle={copy.related.subtitle}
                icon={GitBranch}
              />
              {connectedStories.length > 0 ? (
                <div className="related-stories-grid">
                  {connectedStories.map(({ story: target, relationType, rationale }) => {
                    const relMeta = getRelationshipMeta(relationType);
                    const targetCategory = getCategoryMeta(target.category);
                    const targetRegion = getRegionMeta(target.region);
                    const relLabel = relMeta ? pick(relMeta.label) : relationType;

                    return (
                      <Link
                        key={`${target.slug}-${relationType}`}
                        to={`/story/${target.slug}`}
                        className="related-story-card"
                      >
                        <div>
                          <div className="related-story-card__badges">
                            <span
                              className="related-relation-pill"
                              style={
                                relMeta
                                  ? {
                                      color: relMeta.color,
                                      backgroundColor: relMeta.bgTint,
                                      borderColor: relMeta.borderTint,
                                    }
                                  : undefined
                              }
                            >
                              {relLabel}
                            </span>
                            {targetCategory && (
                              <span className="tag">
                                {pick(targetCategory.shortLabel)}
                              </span>
                            )}
                            {targetRegion && (
                              <span className="tag">
                                {pick(targetRegion.shortLabel)}
                              </span>
                            )}
                          </div>

                          <h3 className="related-story-card__title">
                            {pick(target.title)}
                          </h3>
                          {rationale && (
                            <p className="related-story-card__rationale">
                              {pick(rationale)}
                            </p>
                          )}
                        </div>

                        <div className="related-story-card__footer">
                          {target.keyMetric?.value && (
                            <span className="related-story-card__metric">
                              {target.keyMetric.value}
                            </span>
                          )}
                          <span className="related-story-card__cta">
                            <span>{copy.related.readStoryCta}</span>
                            <ArrowRight size={15} aria-hidden="true" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-state">{copy.related.emptyMessage}</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}
