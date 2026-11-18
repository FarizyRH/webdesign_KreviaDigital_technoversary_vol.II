import { useLanguage } from '../../context/LanguageContext.jsx';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function PageLayout({ children, className = '' }) {
  const { t } = useLanguage();

  return (
    <div className="page-shell">
      <a className="skip-link" href="#main-content">
        {t('nav.skipToContent')}
      </a>
      <Navbar />
      <main id="main-content" className={`main-content ${className}`.trim()} tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
