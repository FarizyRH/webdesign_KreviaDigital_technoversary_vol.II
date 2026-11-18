import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

const TEAM_MEMBERS = [
  {
    name: 'Albert Christian',
    roleKey: 'footer.leadRole',
    githubUrl: 'https://github.com/Albertchristiann14',
    githubHandle: '@Albertchristiann14',
  },
  {
    name: 'Ananta Firdaus',
    roleKey: 'footer.memberRole',
    githubUrl: 'https://github.com/Ananta-TI',
    githubHandle: '@Ananta-TI',
  },
  {
    name: 'Farizy Rahman Hidayat',
    roleKey: 'footer.memberRole',
    githubUrl: 'https://github.com/FarizyRH',
    githubHandle: '@FarizyRH',
  },
];

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="footer-brand-title">
            {t('site.title')}
          </Link>
          <p className="footer-tagline">{t('site.tagline')}</p>
          <p className="footer-mission">{t('footer.mission')}</p>
          <p className="footer-guidebook">{t('footer.guidebookNote')}</p>
        </div>

        <div className="footer-col">
          <h2 className="footer-heading">{t('footer.navigateTitle')}</h2>
          <ul className="footer-links">
            <li>
              <Link to="/">{t('nav.home')}</Link>
            </li>
            <li>
              <Link to="/explore">{t('nav.explore')}</Link>
            </li>
            <li>
              <Link to="/about">{t('nav.about')}</Link>
            </li>
            <li>
              <Link to="/contact">{t('nav.contact')}</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h2 className="footer-heading">{t('footer.projectTitle')}</h2>
          <p className="footer-integrity">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>{t('footer.integrityNote')}</span>
          </p>

          <div className="footer-team">
            <h3 className="footer-subheading">{t('footer.teamLabel')}</h3>
            <p className="footer-team-placeholder">
              <strong>{t('footer.teamNameLabel')}:</strong>{' '}
              <code>{t('footer.teamNamePlaceholder')}</code>
            </p>
            <ul className="footer-team-list">
              {TEAM_MEMBERS.map((member) => (
                <li key={member.githubUrl}>
                  <span className="footer-member-name">
                    {member.name} <span className="footer-member-role">({t(member.roleKey)})</span>
                  </span>
                  <a
                    href={member.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-github-link"
                  >
                    <span>{member.githubHandle}</span>
                    <ExternalLink size={13} aria-hidden="true" />
                    <span className="sr-only"> ({t('common.externalLink')})</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
