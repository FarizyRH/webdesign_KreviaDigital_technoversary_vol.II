import { Link } from 'react-router-dom';
import { ArrowRight, Link2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getRelationshipMeta } from '../../data/taxonomy.js';
import '../../styles/homeExplore.css';

export default function RelationshipBadge({
  relationType,
  targetStory = null,
  rationale = null,
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const { pick } = useLanguage();
  const meta = getRelationshipMeta(relationType);

  const label = meta ? pick(meta.label) : relationType;
  const titleText = rationale
    ? pick(rationale)
    : meta
      ? pick(meta.description)
      : undefined;

  const badgeStyle = meta
    ? {
        '--rel-color': meta.color,
        '--rel-bg': meta.bgTint,
        '--rel-border': meta.borderTint,
      }
    : undefined;

  const sizeClass = size === 'sm' ? 'rel-badge--sm' : '';
  const iconSize = size === 'sm' ? 12 : 13;

  if (targetStory?.slug) {
    const targetTitle = pick(targetStory.title);
    return (
      <Link
        to={`/story/${targetStory.slug}`}
        className={`rel-badge rel-badge--link ${sizeClass} ${className}`.trim()}
        style={badgeStyle}
        title={titleText}
        aria-label={titleText ? `${label}: ${targetTitle} — ${titleText}` : `${label}: ${targetTitle}`}
      >
        {showIcon && <Link2 size={iconSize} strokeWidth={2} aria-hidden="true" />}
        <span className="rel-badge__verb">{label}</span>
        <span className="rel-badge__target">{targetTitle}</span>
        <ArrowRight size={iconSize} strokeWidth={2} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <span
      className={`rel-badge ${sizeClass} ${className}`.trim()}
      style={badgeStyle}
      title={titleText}
    >
      {showIcon && <Link2 size={iconSize} strokeWidth={2} aria-hidden="true" />}
      <span className="rel-badge__verb">{label}</span>
    </span>
  );
}
