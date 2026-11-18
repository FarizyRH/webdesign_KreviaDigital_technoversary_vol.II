import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { detailInfo } from '../../i18n/detailInfo.js';
import { FACT_TYPES } from '../../data/taxonomy.js';
import EpistemicBadge from '../common/EpistemicBadge.jsx';

function normalizeExternalHref(urlOrDoi) {
  if (typeof urlOrDoi !== 'string') return '';
  const trimmed = urlOrDoi.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^10\.\d{4,9}\//i.test(trimmed)) return `https://doi.org/${trimmed}`;
  return '';
}

export default function EvidenceSection({
  sources = [],
  heroImage = null,
  highlightedSourceId = null,
}) {
  const { lang, t, pick } = useLanguage();
  const copy = (detailInfo[lang] ?? detailInfo.en).storyDetail;

  return (
    <div className="evidence-wrapper">
      <aside
        className="epistemic-legend"
        aria-labelledby="epistemic-legend-heading"
      >
        <h3 id="epistemic-legend-heading" className="epistemic-legend__title">
          {t('epistemic.legendTitle')}
        </h3>
        <div className="epistemic-legend__grid">
          {FACT_TYPES.map((typeKey) => (
            <div key={typeKey} className="epistemic-legend__item">
              <EpistemicBadge type={typeKey} size="sm" />
              <p className="epistemic-legend__desc">
                {t(`epistemic.${typeKey}.description`)}
              </p>
            </div>
          ))}
        </div>
      </aside>

      {Array.isArray(sources) && sources.length > 0 ? (
        <ol className="evidence-list">
          {sources.map((src, index) => {
            const isHighlighted = highlightedSourceId === src.id;
            const href = normalizeExternalHref(src.urlOrDoi);
            const claimText = pick(src.supportedClaim);

            return (
              <li
                key={src.id}
                id={`source-${src.id}`}
                tabIndex={-1}
                className={
                  isHighlighted
                    ? 'evidence-card evidence-card--highlighted'
                    : 'evidence-card'
                }
              >
                <div className="evidence-card__top">
                  <span className="evidence-card__index" aria-hidden="true">
                    [{index + 1}]
                  </span>
                  <div className="evidence-card__heading">
                    <h3 className="evidence-card__title">{src.title}</h3>
                    <p className="evidence-card__meta">
                      {src.authorOrInstitution}
                      {src.year ? ` (${src.year})` : ''}
                    </p>
                  </div>
                </div>

                {claimText && (
                  <div className="evidence-card__claim">
                    <span className="evidence-card__claim-label">
                      {copy.evidence.claimLabel}
                    </span>
                    <p>{claimText}</p>
                  </div>
                )}

                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="evidence-card__link"
                  >
                    <span>{href}</span>
                    <ExternalLink size={14} aria-hidden="true" />
                    <span className="sr-only">
                      {' '}
                      ({t('common.externalLink')})
                    </span>
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="empty-state">{copy.evidence.emptySources}</p>
      )}

      {heroImage && (
        <aside
          className="asset-attribution-card"
          aria-labelledby="asset-attribution-heading"
        >
          <div className="asset-attribution-card__header">
            <ImageIcon size={18} aria-hidden="true" />
            <div>
              <h3
                id="asset-attribution-heading"
                className="asset-attribution-card__title"
              >
                {copy.evidence.assetAttributionTitle}
              </h3>
              <p className="asset-attribution-card__subtitle">
                {copy.evidence.assetAttributionSubtitle}
              </p>
            </div>
          </div>

          <dl className="asset-attribution-card__grid">
            <div className="asset-attribution-card__field">
              <dt>{copy.authorLabel}</dt>
              <dd>{heroImage.author}</dd>
            </div>

            <div className="asset-attribution-card__field">
              <dt>{copy.licenseLabel}</dt>
              <dd>
                {heroImage.licenseUrl ? (
                  <a
                    href={heroImage.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{heroImage.license}</span>
                    <ExternalLink size={13} aria-hidden="true" />
                    <span className="sr-only">
                      {' '}
                      ({t('common.externalLink')})
                    </span>
                  </a>
                ) : (
                  heroImage.license
                )}
              </dd>
            </div>

            <div className="asset-attribution-card__field">
              <dt>{copy.sourceLinkLabel}</dt>
              <dd>
                {heroImage.sourceUrl ? (
                  <a
                    href={heroImage.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{heroImage.sourceUrl}</span>
                    <ExternalLink size={13} aria-hidden="true" />
                    <span className="sr-only">
                      {' '}
                      ({t('common.externalLink')})
                    </span>
                  </a>
                ) : (
                  heroImage.src
                )}
              </dd>
            </div>

            <div className="asset-attribution-card__field">
              <dt>{copy.evidence.attributionTextLabel}</dt>
              <dd>{heroImage.attribution}</dd>
            </div>
          </dl>
        </aside>
      )}
    </div>
  );
}
