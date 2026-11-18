import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Flame,
  Link2,
  MapPin,
  PawPrint,
  Sparkles,
  Trees,
  Waves,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getCategoryMeta, getRegionMeta } from '../../data/taxonomy.js';
import { formatConnectionCount, HOME_EXPLORE_COPY } from '../../i18n/homeExplore.js';
import EpistemicBadge from '../common/EpistemicBadge.jsx';
import '../../styles/homeExplore.css';

const CATEGORY_ICONS = {
  Trees,
  PawPrint,
  Flame,
  Waves,
};

export default function StoryCard({
  story,
  variant = 'default',
  showSummary = true,
}) {
  const { lang, t, pick } = useLanguage();

  if (!story) return null;

  const catMeta = getCategoryMeta(story.category);
  const regMeta = getRegionMeta(story.region);
  const CategoryIcon = CATEGORY_ICONS[catMeta?.icon] || Trees;

  const titleText = pick(story.title);
  const summaryText = pick(story.summary);
  const regionLabel = regMeta ? pick(regMeta.shortLabel) : pick(story.location?.name);
  const connectionCount = Array.isArray(story.relatedStories) ? story.relatedStories.length : 0;

  const tagStyle = catMeta
    ? {
        '--cat-color': catMeta.color,
        '--cat-bg': catMeta.bgTint,
        '--cat-border': catMeta.borderTint,
      }
    : undefined;

  return (
    <article
      className={`card card--interactive story-card ${
        variant === 'compact' ? 'story-card--compact' : ''
      }`.trim()}
    >
      <div className="card__media story-card__media">
        <img
          src={story.heroImage?.src}
          alt={pick(story.heroImage?.alt)}
          loading="eager"
        />
        {story.featured && (
          <span className="story-card__featured-badge">
            <Sparkles size={11} strokeWidth={2} aria-hidden="true" />
            <span>{pick(HOME_EXPLORE_COPY.storyCard.featuredLabel)}</span>
          </span>
        )}
      </div>

      <div className="card__body story-card__body">
        <div className="story-card__badges">
          {catMeta && (
            <span className="tag story-card__tag" style={tagStyle}>
              <CategoryIcon size={13} strokeWidth={2} aria-hidden="true" />
              <span>{pick(catMeta.shortLabel)}</span>
            </span>
          )}
          <EpistemicBadge
            type={story.keyMetric?.factType || 'fact'}
            size="sm"
          />
        </div>

        <h3 className="story-card__title">
          <Link to={`/story/${story.slug}`} className="story-card__title-link">
            {titleText}
          </Link>
        </h3>

        {showSummary && summaryText && (
          <p className="story-card__summary">{summaryText}</p>
        )}

        {story.keyMetric && (
          <div className="story-card__metric">
            <div className="story-card__metric-top">
              <span className="story-card__metric-value tabular-nums">
                {story.keyMetric.value}
              </span>
            </div>
            <span className="story-card__metric-label">
              {pick(story.keyMetric.label)}
            </span>
          </div>
        )}
      </div>

      <footer className="card__footer story-card__footer">
        <div className="story-card__meta-group">
          <span className="story-card__meta">
            <MapPin size={13} strokeWidth={2} aria-hidden="true" />
            <span>{regionLabel}</span>
          </span>
          <span className="story-card__meta">
            <Link2 size={13} strokeWidth={2} aria-hidden="true" />
            <span className="tabular-nums">
              {formatConnectionCount(lang, connectionCount)}
            </span>
          </span>
        </div>

        <Link
          to={`/story/${story.slug}`}
          className="btn btn--sm btn--secondary story-card__cta"
          aria-label={`${pick(HOME_EXPLORE_COPY.storyCard.readAriaPrefix)}: ${titleText}`}
        >
          <span>{t('common.readStory')}</span>
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}
