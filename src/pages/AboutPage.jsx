import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Compass,
  GitBranch,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { detailInfo } from '../i18n/detailInfo.js';
import { FACT_TYPES, RELATIONSHIP_LIST } from '../data/taxonomy.js';
import SectionHeader from '../components/common/SectionHeader.jsx';
import EpistemicBadge from '../components/common/EpistemicBadge.jsx';
import '../styles/detailInfo.css';

const PURPOSE_ICONS = [BookOpen, Layers, ShieldCheck];

export default function AboutPage() {
  const { lang, t, pick } = useLanguage();
  const copy = (detailInfo[lang] ?? detailInfo.en).about;

  useEffect(() => {
    document.title = `${t('nav.about')} — ${t('site.title')}`;
  }, [t]);

  return (
    <div className="about-page">
      <header className="page-hero">
        <div className="container">
          <div className="page-hero__inner">
            <span className="page-hero__eyebrow">{copy.hero.eyebrow}</span>
            <h1 className="page-hero__title">{copy.hero.title}</h1>
            <p className="page-hero__subtitle">{copy.hero.subtitle}</p>
          </div>
        </div>
      </header>

      {/* Project Background */}
      <section className="page-section" aria-labelledby="about-bg-heading">
        <div className="container">
          <SectionHeader
            id="about-bg-heading"
            eyebrow={copy.background.eyebrow}
            title={copy.background.title}
            icon={Compass}
          />
          <div className="about-prose-card">
            {copy.background.paragraphs.map((paragraph, index) => (
              <p key={`bg-p-${index}`}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Educational Purpose */}
      <section
        className="page-section section--surface"
        aria-labelledby="about-purpose-heading"
      >
        <div className="container">
          <SectionHeader
            id="about-purpose-heading"
            eyebrow={copy.purpose.eyebrow}
            title={copy.purpose.title}
            subtitle={copy.purpose.subtitle}
            icon={BookOpen}
          />
          <div className="about-pillars-grid">
            {copy.purpose.cards.map((card, idx) => {
              const IconComp = PURPOSE_ICONS[idx % PURPOSE_ICONS.length];
              return (
                <article key={card.title} className="about-pillar-card">
                  <div className="about-pillar-card__icon" aria-hidden="true">
                    <IconComp size={20} />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Non-Linear Exploration Model (6 relationship verbs from taxonomy.js) */}
      <section className="page-section" aria-labelledby="about-model-heading">
        <div className="container">
          <SectionHeader
            id="about-model-heading"
            eyebrow={copy.explorationModel.eyebrow}
            title={copy.explorationModel.title}
            subtitle={copy.explorationModel.description}
            icon={GitBranch}
          />
          <div className="about-relations-grid">
            {RELATIONSHIP_LIST.map((rel) => (
              <article key={rel.id} className="about-relation-card">
                <div className="related-story-card__badges">
                  <span
                    className="related-relation-pill"
                    style={{
                      color: rel.color,
                      backgroundColor: rel.bgTint,
                      borderColor: rel.borderTint,
                    }}
                  >
                    {pick(rel.label)}
                  </span>
                </div>
                <p className="about-relation-card__verb">
                  {copy.explorationModel.relationCodeLabel}: <code>{rel.id}</code>
                </p>
                <p className="about-relation-card__desc">
                  {pick(rel.description)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Data & Scientific Source Principles */}
      <section
        className="page-section section--surface"
        aria-labelledby="about-science-heading"
      >
        <div className="container">
          <SectionHeader
            id="about-science-heading"
            eyebrow={copy.scientificPrinciples.eyebrow}
            title={copy.scientificPrinciples.title}
            subtitle={copy.scientificPrinciples.subtitle}
            icon={ShieldCheck}
          />

          <h3 className="epistemic-legend__title">
            {copy.scientificPrinciples.epistemicTitle}
          </h3>
          <div className="epistemic-legend__grid">
            {FACT_TYPES.map((typeKey) => (
              <div key={typeKey} className="epistemic-legend__item">
                <EpistemicBadge type={typeKey} />
                <p className="epistemic-legend__desc">
                  {t(`epistemic.${typeKey}.description`)}
                </p>
              </div>
            ))}
          </div>

          <h3
            className="epistemic-legend__title"
            style={{ marginTop: 'var(--space-8)' }}
          >
            {copy.scientificPrinciples.institutionsTitle}
          </h3>
          <div className="about-institutions-grid">
            {copy.scientificPrinciples.institutions.map((inst) => (
              <article key={inst.name} className="about-institution-card">
                <h4>{inst.name}</h4>
                <p>{inst.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Scope & Scientific Limitations */}
      <section
        className="page-section"
        aria-labelledby="about-limitations-heading"
      >
        <div className="container">
          <SectionHeader
            id="about-limitations-heading"
            eyebrow={copy.limitations.eyebrow}
            title={copy.limitations.title}
            subtitle={copy.limitations.subtitle}
            icon={ShieldAlert}
          />
          <div className="about-limitations-grid">
            {copy.limitations.items.map((item) => (
              <article key={item.title} className="about-limitation-card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="page-section">
        <div className="container">
          <div className="about-cta-banner">
            <div className="about-cta-banner__copy">
              <h2>{copy.cta.title}</h2>
              <p>{copy.cta.description}</p>
            </div>
            <div className="about-cta-banner__actions">
              <Link to="/explore" className="btn btn--primary">
                <Compass size={18} aria-hidden="true" />
                <span>{copy.cta.primaryBtn}</span>
              </Link>
              <Link to="/contact" className="btn btn--secondary">
                <Users size={18} aria-hidden="true" />
                <span>{copy.cta.secondaryBtn}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
