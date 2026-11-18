import { Calendar } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import EpistemicBadge from '../common/EpistemicBadge.jsx';
import ClaimCitation from './ClaimCitation.jsx';

export default function StoryTimeline({
  events = [],
  sources = [],
  headingId = 'timeline-heading',
  onSelectSource,
}) {
  const { pick } = useLanguage();

  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }

  return (
    <ol className="story-timeline" aria-labelledby={headingId}>
      {events.map((eventItem, index) => {
        const titleText = pick(eventItem?.title);
        const detailText = pick(eventItem?.detail);
        const dateText = typeof eventItem?.date === 'string' ? eventItem.date : '';

        return (
          <li
            key={`${dateText || 'event'}-${index}`}
            className="story-timeline__item"
          >
            <span className="story-timeline__marker" aria-hidden="true" />
            <article className="story-timeline__card">
              <div className="story-timeline__meta">
                <span className="story-timeline__date-wrap">
                  <Calendar size={14} aria-hidden="true" />
                  <time className="story-timeline__date">{dateText}</time>
                </span>
                <EpistemicBadge type={eventItem?.factType || 'fact'} size="sm" />
              </div>

              {titleText && (
                <h3 className="story-timeline__title">{titleText}</h3>
              )}

              {detailText && (
                <p className="story-timeline__detail">{detailText}</p>
              )}

              <ClaimCitation
                sourceIds={eventItem?.sourceIds}
                sources={sources}
                onSelectSource={onSelectSource}
              />
            </article>
          </li>
        );
      })}
    </ol>
  );
}
