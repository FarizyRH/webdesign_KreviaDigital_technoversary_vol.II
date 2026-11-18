import { useLanguage } from '../../context/LanguageContext.jsx';
import { detailInfo } from '../../i18n/detailInfo.js';

export default function ClaimCitation({
  sourceId,
  sourceIds,
  sources = [],
  onSelectSource,
  className = '',
}) {
  const { lang, pick } = useLanguage();
  const copy = (detailInfo[lang] ?? detailInfo.en).storyDetail.claimCitation;

  if (!Array.isArray(sources) || sources.length === 0) {
    return null;
  }

  const sourceMap = new Map();
  sources.forEach((src, index) => {
    if (src && typeof src.id === 'string' && src.id.trim() !== '') {
      sourceMap.set(src.id, { source: src, number: index + 1 });
    }
  });

  const requestedIds = [];
  const seen = new Set();

  const addId = (candidate) => {
    if (typeof candidate !== 'string') return;
    const trimmed = candidate.trim();
    if (!trimmed || seen.has(trimmed)) return;
    if (sourceMap.has(trimmed)) {
      seen.add(trimmed);
      requestedIds.push(trimmed);
    }
  };

  if (typeof sourceId === 'string') {
    addId(sourceId);
  }
  if (Array.isArray(sourceIds)) {
    sourceIds.forEach(addId);
  }

  if (requestedIds.length === 0) {
    return null;
  }

  const handleCitationClick = (event, id) => {
    event.preventDefault();
    const targetId = `source-${id}`;
    const targetEl = document.getElementById(targetId);

    if (targetEl) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      targetEl.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });

      if (typeof targetEl.focus === 'function') {
        targetEl.focus({ preventScroll: true });
      }
    }

    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${targetId}`);
    }

    if (typeof onSelectSource === 'function') {
      onSelectSource(id);
    }
  };

  return (
    <span
      className={`claim-citation-list ${className}`.trim()}
      role="group"
      aria-label={copy.groupLabel}
    >
      {requestedIds.map((id) => {
        const entry = sourceMap.get(id);
        if (!entry) return null;
        const { source, number } = entry;
        const claimPreview = pick(source.supportedClaim);
        const tooltipText = `${source.authorOrInstitution} (${source.year}) — ${source.title}`;
        const ariaLabel = `${copy.refPrefix} [${number}]: ${source.authorOrInstitution} (${source.year}). ${claimPreview ? `${copy.supportedClaimLabel}: ${claimPreview}. ` : ''}${copy.jumpToSource}.`;

        return (
          <a
            key={source.id}
            href={`#source-${source.id}`}
            className="claim-citation-pill"
            title={tooltipText}
            aria-label={ariaLabel}
            onClick={(event) => handleCitationClick(event, source.id)}
          >
            [{number}]
          </a>
        );
      })}
    </span>
  );
}
