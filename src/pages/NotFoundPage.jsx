import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, Home } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { detailInfo } from '../i18n/detailInfo.js';
import { getFeaturedStories } from '../utils/storyHelpers.js';
import '../styles/detailInfo.css';

export default function NotFoundPage() {
  const { lang, t, pick } = useLanguage();
  const copy = (detailInfo[lang] ?? detailInfo.en).notFound;
  const featuredStories = getFeaturedStories();

  useEffect(() => {
    document.title = `${t('notFound.code')} — ${t('site.title')}`;
  }, [t]);

  return (
    <section className="container page-section not-found-section">
      <div className="card stub-card not-found-card">
        <p className="not-found-code" aria-hidden="true">
          {t('notFound.code')}
        </p>
        <span className="eyebrow">{t('notFound.eyebrow')}</span>
        <h1>{t('notFound.title')}</h1>
        <p className="stub-description">{t('notFound.message')}</p>

        <div className="stub-actions">
          <Link to="/" className="btn btn--primary">
            <Home size={18} aria-hidden="true" />
            <span>{t('notFound.backHome')}</span>
          </Link>
          <Link to="/explore" className="btn btn--secondary">
            <Compass size={18} aria-hidden="true" />
            <span>{t('notFound.browseExplore')}</span>
          </Link>
          <Link to="/about" className="btn btn--ghost">
            <BookOpen size={18} aria-hidden="true" />
            <span>{copy.aboutBtn}</span>
          </Link>
        </div>

        {featuredStories.length > 0 && (
          <div className="not-found-extras">
            <h2 className="not-found-extras__heading">
              {copy.featuredStoriesHeading}
            </h2>
            <ul className="not-found-links">
              {featuredStories.map((story) => (
                <li key={story.slug}>
                  <Link
                    to={`/story/${story.slug}`}
                    className="not-found-story-link"
                  >
                    <span>{pick(story.title)}</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
