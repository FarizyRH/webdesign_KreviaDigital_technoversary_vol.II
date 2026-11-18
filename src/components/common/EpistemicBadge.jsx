import {
  CircleCheck,
  ChartColumn,
  Compass,
  TriangleAlert,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

const EPISTEMIC_MAP = {
  fact: {
    Icon: CircleCheck,
    className: 'epistemic-badge--fact',
    labelKey: 'epistemic.fact.label',
    descKey: 'epistemic.fact.description',
  },
  estimate: {
    Icon: ChartColumn,
    className: 'epistemic-badge--estimate',
    labelKey: 'epistemic.estimate.label',
    descKey: 'epistemic.estimate.description',
  },
  interpretation: {
    Icon: Compass,
    className: 'epistemic-badge--interpretation',
    labelKey: 'epistemic.interpretation.label',
    descKey: 'epistemic.interpretation.description',
  },
  uncertainty: {
    Icon: TriangleAlert,
    className: 'epistemic-badge--uncertainty',
    labelKey: 'epistemic.uncertainty.label',
    descKey: 'epistemic.uncertainty.description',
  },
};

export default function EpistemicBadge({
  type = 'fact',
  size = 'md',
  showIcon = true,
  className = '',
}) {
  const { t } = useLanguage();
  const config = Object.hasOwn(EPISTEMIC_MAP, type) ? EPISTEMIC_MAP[type] : EPISTEMIC_MAP.fact;
  const { Icon } = config;
  const label = t(config.labelKey);
  const description = t(config.descKey);
  const sizeClass = size === 'sm' ? 'epistemic-badge--sm' : '';

  return (
    <span
      className={`epistemic-badge ${config.className} ${sizeClass} ${className}`.trim()}
      title={description}
      aria-label={`${label}: ${description}`}
    >
      {showIcon && (
        <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2} aria-hidden="true" />
      )}
      <span>{label}</span>
    </span>
  );
}
