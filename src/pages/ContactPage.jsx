import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Code2,
  Compass,
  ExternalLink,
  Home,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { detailInfo } from '../i18n/detailInfo.js';
import '../styles/detailInfo.css';

const TEAM_MEMBERS = [
  {
    name: 'Albert Christian',
    isLead: true,
    githubUrl: 'https://github.com/Albertchristiann14',
    githubHandle: '@Albertchristiann14',
  },
  {
    name: 'Ananta Firdaus',
    isLead: false,
    githubUrl: 'https://github.com/Ananta-TI',
    githubHandle: '@Ananta-TI',
  },
  {
    name: 'Farizy Rahman Hidayat',
    isLead: false,
    githubUrl: 'https://github.com/FarizyRH',
    githubHandle: '@FarizyRH',
  },
];

export default function ContactPage() {
  const { lang, t } = useLanguage();
  const copy = (detailInfo[lang] ?? detailInfo.en).contact;

  useEffect(() => {
    document.title = `${t('nav.contact')} — ${t('site.title')}`;
  }, [t]);

  return (
    <div className="contact-page">
      <header className="page-hero">
        <div className="container">
          <div className="page-hero__inner">
            <span className="page-hero__eyebrow">{copy.hero.eyebrow}</span>
            <h1 className="page-hero__title">{copy.hero.title}</h1>
            <p className="page-hero__subtitle">{copy.hero.subtitle}</p>
          </div>
        </div>
      </header>

      <section className="page-section">
        <div className="container">
          <div className="contact-layout">
            {/* Competition Metadata Panel */}
            <article
              className="contact-panel"
              aria-labelledby="contact-competition-heading"
            >
              <h2
                id="contact-competition-heading"
                className="contact-panel__heading"
              >
                <Award size={20} aria-hidden="true" />
                <span>{copy.competition.heading}</span>
              </h2>

              <dl className="contact-meta-list">
                <div className="contact-meta-item">
                  <dt>{copy.competition.eventLabel}</dt>
                  <dd>{copy.competition.eventName}</dd>
                </div>
                <div className="contact-meta-item">
                  <dt>{copy.competition.organizerLabel}</dt>
                  <dd>{copy.competition.organizer}</dd>
                </div>
                <div className="contact-meta-item">
                  <dt>{copy.competition.themeLabel}</dt>
                  <dd>{copy.competition.themeValue}</dd>
                </div>
              </dl>

              <div className="contact-folder-note">
                <strong>{copy.competition.folderNoteLabel}</strong>
                <span>{copy.competition.folderNote}</span>
              </div>
            </article>

            {/* Verified Team Identity Panel */}
            <article
              className="contact-panel"
              aria-labelledby="contact-team-heading"
            >
              <h2 id="contact-team-heading" className="contact-panel__heading">
                <Users size={20} aria-hidden="true" />
                <span>{copy.team.heading}</span>
              </h2>

              <p className="team-name-row">
                <strong>{copy.team.teamNameLabel}:</strong>{' '}
                <code>{copy.team.teamNamePlaceholder}</code>
              </p>

              <ul className="contact-team-grid">
                {TEAM_MEMBERS.map((member) => (
                  <li key={member.githubUrl} className="contact-member-card">
                    <div className="contact-member-card__info">
                      <span className="contact-member-card__name">
                        {member.name}
                      </span>
                      <span className="contact-member-card__role">
                        {member.isLead ? copy.team.roleLead : copy.team.roleMember}
                      </span>
                    </div>
                    <a
                      href={member.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--secondary btn--sm"
                    >
                      <Code2 size={15} aria-hidden="true" />
                      <span>
                        {copy.team.githubCta}: {member.githubHandle}
                      </span>
                      <ExternalLink size={14} aria-hidden="true" />
                      <span className="sr-only">
                        {' '}
                        ({t('common.externalLink')})
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          {/* Anti-Fabrication Transparency Callout */}
          <aside
            className="contact-integrity-box"
            aria-labelledby="contact-integrity-heading"
          >
            <h2
              id="contact-integrity-heading"
              className="contact-panel__heading"
            >
              <ShieldCheck size={20} aria-hidden="true" />
              <span>{copy.integrity.heading}</span>
            </h2>
            <h3>{copy.integrity.title}</h3>
            <ul>
              {copy.integrity.items.map((item, idx) => (
                <li key={`integrity-${idx}`}>{item}</li>
              ))}
            </ul>
          </aside>

          <div className="contact-actions">
            <Link to="/explore" className="btn btn--primary">
              <Compass size={18} aria-hidden="true" />
              <span>{copy.actions.exploreBtn}</span>
            </Link>
            <Link to="/about" className="btn btn--secondary">
              <BookOpen size={18} aria-hidden="true" />
              <span>{copy.actions.aboutBtn}</span>
            </Link>
            <Link to="/" className="btn btn--ghost">
              <Home size={18} aria-hidden="true" />
              <span>{copy.actions.homeBtn}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
