import { Compass } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

const ALLOWED_HEADINGS = new Set(['h1', 'h2', 'h3', 'h4']);

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  headingLevel = 'h2',
  as = null,
  id,
  icon: CustomIcon = null,
  showEyebrowIcon = false,
  action = null,
  className = '',
}) {
  const { pick } = useLanguage();

  const resolveText = (value) => {
    if (!value) return '';
    return typeof value === 'string' ? value : pick(value);
  };

  const requestedHeading = as || headingLevel;
  const HeadingTag = ALLOWED_HEADINGS.has(requestedHeading) ? requestedHeading : 'h2';
  const eyebrowText = resolveText(eyebrow);
  const titleText = resolveText(title);
  const subtitleText = resolveText(subtitle);
  const EyebrowIcon = CustomIcon || (showEyebrowIcon ? Compass : null);
  const alignClass = align === 'center' ? 'section-header--center' : '';

  return (
    <header className={`section-header ${alignClass} ${className}`.trim()}>
      <div className="section-header__row">
        <div className="section-header__text">
          {eyebrowText && (
            <p className="section-header__eyebrow">
              {EyebrowIcon && (
                <EyebrowIcon size={14} strokeWidth={2} aria-hidden="true" />
              )}
              <span>{eyebrowText}</span>
            </p>
          )}
          <HeadingTag id={id} className="section-header__title">
            {titleText}
          </HeadingTag>
          {subtitleText && (
            <p className="section-header__subtitle">{subtitleText}</p>
          )}
        </div>
        {action && align !== 'center' && (
          <div className="section-header__action">{action}</div>
        )}
      </div>
    </header>
  );
}
