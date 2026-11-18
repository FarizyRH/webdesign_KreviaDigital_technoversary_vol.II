import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Globe, Menu, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/explore', labelKey: 'nav.explore', end: false },
  { to: '/about', labelKey: 'nav.about', end: false },
  { to: '/contact', labelKey: 'nav.contact', end: false },
];

function BrandOrbitMark() {
  return (
    <svg
      className="brand-mark"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <ellipse
        cx="16"
        cy="16"
        rx="14"
        ry="5.5"
        transform="rotate(-24 16 16)"
        stroke="#38BDF8"
        strokeWidth="1.5"
      />
      <path
        d="M16 5.5C19.2 8.6 20.5 12.2 20.5 16C20.5 19.8 19.2 23.4 16 26.5"
        stroke="#34D399"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M6.8 12.8C9.8 14 12.9 14.5 16 14.5C19.1 14.5 22.2 14 25.2 12.8"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="24.5" cy="10" r="2.2" fill="#34D399" />
    </svg>
  );
}

export default function Navbar() {
  const { lang, toggleLang, t } = useLanguage();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuButtonRef = useRef(null);
  const firstMobileLinkRef = useRef(null);
  const openedViaButtonRef = useRef(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleChange = (event) => {
      if (event.matches) {
        setIsMenuOpen(false);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }
    if (openedViaButtonRef.current) {
      firstMobileLinkRef.current?.focus();
      openedViaButtonRef.current = false;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const handleDrawerToggle = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      menuButtonRef.current?.focus();
    } else {
      openedViaButtonRef.current = true;
      setIsMenuOpen(true);
    }
  };

  const langSwitchAriaLabel = lang === 'id' ? t('nav.toggleToEn') : t('nav.toggleToId');

  return (
    <header className="site-header">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <BrandOrbitMark />
          <span className="brand-text">
            <span className="brand-title">{t('site.title')}</span>
            <span className="brand-badge">{t('site.themeBadge')}</span>
          </span>
        </Link>

        <nav className="navbar-desktop-nav" aria-label={t('nav.primaryNavLabel')}>
          <ul className="nav-links">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'nav-link nav-link--active' : 'nav-link'
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="navbar-actions">
          <button
            type="button"
            className="lang-toggle"
            onClick={toggleLang}
            aria-label={langSwitchAriaLabel}
            aria-pressed={lang === 'en'}
            data-lang={lang}
            data-testid="lang-toggle"
          >
            <Globe size={16} aria-hidden="true" />
            <span className={lang === 'id' ? 'lang-option is-active' : 'lang-option'}>
              ID
            </span>
            <span className="lang-sep" aria-hidden="true">
              /
            </span>
            <span className={lang === 'en' ? 'lang-option is-active' : 'lang-option'}>
              EN
            </span>
          </button>

          <button
            ref={menuButtonRef}
            type="button"
            className="nav-drawer-toggle"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            onClick={handleDrawerToggle}
          >
            {isMenuOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav-drawer"
        className="mobile-drawer"
        hidden={!isMenuOpen}
      >
        <nav className="container" aria-label={t('nav.mobileNavLabel')}>
          <ul className="mobile-nav-links">
            {NAV_ITEMS.map((item, index) => (
              <li key={item.to}>
                <NavLink
                  ref={index === 0 ? firstMobileLinkRef : undefined}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'mobile-nav-link mobile-nav-link--active' : 'mobile-nav-link'
                  }
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
