import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Flame,
  Globe,
  Map,
  MapPin,
  Network,
  PawPrint,
  Trees,
  Waves,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import {
  getCategoryMeta,
  getRelationshipMeta,
  RELATIONSHIP_LIST,
} from '../../data/taxonomy.js';
import { getConnectedStories } from '../../utils/storyHelpers.js';
import { HOME_EXPLORE_COPY } from '../../i18n/homeExplore.js';
import EpistemicBadge from '../common/EpistemicBadge.jsx';
import RelationshipBadge from '../stories/RelationshipBadge.jsx';
import '../../styles/homeExplore.css';

const ARCHIPELAGO_ISLANDS = [
  {
    id: 'sumatra',
    d: 'M 27.5,61.3 L 65.6,68.8 L 88.5,96.2 L 98.3,106.3 L 122.9,126.3 L 155.2,157.5 L 177.1,178.8 L 199,207.5 L 215.6,228.8 L 228.1,255 L 249,278.8 L 247.5,312.5 L 244.8,346.8 L 234.4,338.8 L 219.8,347.5 L 197.9,322.5 L 172.1,295 L 147.9,263.8 L 132.3,223.7 L 110.4,195 L 99.6,156.5 L 77.1,138.7 L 63.5,116.3 L 44.4,96.2 L 26.7,71.3 Z',
  },
  {
    id: 'bangka',
    d: 'M 244.8,237.5 L 253.8,251.3 L 259.4,276.3 L 249,273.8 L 232.9,251.3 Z',
  },
  {
    id: 'java',
    d: 'M 247.5,348 L 267.7,353 L 299,356.3 L 328.1,373.7 L 355.2,366.3 L 388.5,378.8 L 396.9,391.3 L 426,393.8 L 424,411.3 L 405.2,408.8 L 364.6,403.7 L 314.6,393.8 L 283.3,393.8 L 258.3,383.8 L 236.5,371.2 Z',
  },
  {
    id: 'bali',
    d: 'M 425.6,403.7 L 439.6,402 L 451,408.8 L 441.7,421 L 432.3,413.8 Z',
  },
  {
    id: 'lombok',
    d: 'M 459.4,406.3 L 472.5,407 L 469.2,423 L 455.8,422 Z',
  },
  {
    id: 'sumbawa',
    d: 'M 475,403.7 L 519.8,404.5 L 521.9,421.3 L 476,426.3 Z',
  },
  {
    id: 'flores',
    d: 'M 538.5,406.3 L 603.1,408.8 L 601,418.8 L 540.6,421.3 Z',
  },
  {
    id: 'sumba',
    d: 'M 521.9,432.5 L 557.3,441.3 L 551,456.3 L 519.8,443.8 Z',
  },
  {
    id: 'timor',
    d: 'M 692.7,408.8 L 647.9,433.8 L 614.6,458.8 L 613.5,452.5 L 646.9,423.7 L 686.5,407.5 Z',
  },
  {
    id: 'kalimantan',
    d: 'M 325,155 L 343.8,171.2 L 385.4,165 L 437.5,137.5 L 492.7,96.2 L 499,146.3 L 519.8,176.3 L 486.5,223.7 L 467.7,262.5 L 459.4,298.7 L 428.1,288.8 L 369.8,283.8 L 336.5,268.8 L 315.6,213.8 L 310.4,178.8 Z',
  },
  {
    id: 'sulawesi',
    d: 'M 642.7,161.3 L 649,170 L 626,187.5 L 583.3,188.8 L 543.7,193.8 L 557.3,236.3 L 600,221.3 L 611.5,237.5 L 588.5,268.8 L 603.1,312.5 L 594.8,336.3 L 574,321.3 L 551,285 L 551,340 L 529.2,338.8 L 530.2,288.8 L 519.8,263.8 L 536.5,216.3 L 557.3,171.2 L 603.1,168.8 Z',
  },
  {
    id: 'halmahera',
    d: 'M 707.3,146.3 L 721.9,170 L 726,193.8 L 707.3,186.3 L 713.5,218.8 L 703.1,221.3 L 696.9,188.8 L 699,166.3 Z',
  },
  {
    id: 'seram',
    d: 'M 711.5,271.3 L 765.6,276.3 L 763.5,293.8 L 709.4,286.3 Z',
  },
  {
    id: 'papua',
    d: 'M 801,211.3 L 836.5,236.3 L 843.8,263.8 L 885.4,256.3 L 933.3,243.8 L 978.1,263.8 L 978.1,427.5 L 936.5,408.8 L 911.5,401.3 L 924,353.8 L 892.7,321.3 L 846.9,303.8 L 821.9,278.8 L 799,263.8 L 774,236.3 L 776,221.3 Z',
  },
];

const GLOBAL_CONTINENTS = [
  {
    id: 'north-america',
    d: 'M 33,69 L 56,53 L 153,53 L 264,56 L 319,78 L 347,106 L 314,125 L 292,153 L 278,178 L 272,186 L 283,225 L 267,222 L 208,194 L 175,161 L 153,117 L 139,97 Z',
  },
  {
    id: 'greenland',
    d: 'M 356,83 L 383,83 L 444,50 L 433,22 L 333,22 L 344,56 Z',
  },
  {
    id: 'south-america',
    d: 'M 283,225 L 300,217 L 331,222 L 361,250 L 403,267 L 392,292 L 381,314 L 353,344 L 319,367 L 311,403 L 294,394 L 300,347 L 303,300 L 275,264 L 281,244 Z',
  },
  {
    id: 'europe',
    d: 'M 475,147 L 475,131 L 494,131 L 489,117 L 506,108 L 522,100 L 528,89 L 514,81 L 542,61 L 578,53 L 617,64 L 639,78 L 611,119 L 581,136 L 564,147 L 544,144 L 533,128 L 514,131 L 486,150 Z',
  },
  {
    id: 'africa',
    d: 'M 483,150 L 528,147 L 589,164 L 619,217 L 642,217 L 614,256 L 611,292 L 597,322 L 556,347 L 542,322 L 533,283 L 525,239 L 506,233 L 458,219 L 453,208 L 456,183 Z',
  },
  {
    id: 'madagascar',
    d: 'M 636,283 L 639,300 L 631,319 L 622,317 L 625,292 Z',
  },
  {
    id: 'asia',
    d: 'M 600,150 L 611,133 L 639,133 L 667,61 L 778,36 L 889,47 L 986,67 L 950,97 L 894,100 L 875,128 L 858,153 L 839,144 L 836,164 L 817,189 L 800,206 L 803,219 L 786,246 L 778,228 L 772,206 L 750,189 L 722,222 L 714,228 L 700,194 L 683,181 L 656,178 L 664,189 L 644,208 L 622,214 L 597,169 Z',
  },
  {
    id: 'japan',
    d: 'M 861,164 L 878,156 L 892,144 L 903,128 L 892,125 L 886,142 L 872,153 Z',
  },
  {
    id: 'australia',
    d: 'M 817,311 L 839,297 L 864,283 L 878,283 L 894,281 L 906,300 L 925,325 L 917,353 L 883,347 L 858,339 L 819,344 L 814,322 Z',
  },
  {
    id: 'new-zealand',
    d: 'M 981,347 L 994,356 L 981,369 L 964,378 L 975,364 Z',
  },
];

const GLOBAL_INDONESIA_ISLANDS = [
  { id: 'sumatra-g', d: 'M 765,235 L 794,266 L 791,269 L 763,238 Z' },
  { id: 'java-g', d: 'M 793,267 L 818,273 L 817,276 L 792,270 Z' },
  { id: 'kalimantan-g', d: 'M 803,246 L 826,239 L 826,258 L 808,260 Z' },
  { id: 'sulawesi-g', d: 'M 831,247 L 847,246 L 840,264 L 832,264 Z' },
  { id: 'papua-g', d: 'M 864,254 L 892,257 L 892,274 L 869,263 Z' },
];

const PIN_LABELS = {
  'sumatran-orangutan-leuser': {
    short: { id: 'Leuser & Batang Toru', en: 'Leuser & Batang Toru' },
    dx: 14,
    dy: 4,
    textAnchor: 'start',
    boxXOffset: 10,
  },
  'sumatra-rainforest-deforestation': {
    short: { id: 'Riau & Sumatra', en: 'Riau & Sumatra' },
    dx: 14,
    dy: 4,
    textAnchor: 'start',
    boxXOffset: 10,
  },
  'sumatran-tiger-conservation': {
    short: { id: 'Kerinci Seblat', en: 'Kerinci Seblat' },
    dx: -14,
    dy: 4,
    textAnchor: 'end',
  },
  'indonesia-peatland-fires': {
    short: { id: 'Sumsel & Gambut', en: 'South Sumatra Peat' },
    dx: 14,
    dy: 4,
    textAnchor: 'start',
    boxXOffset: 10,
  },
  'indonesia-mangrove-blue-carbon': {
    short: { id: 'Benoa, Bali & Pesisir', en: 'Benoa, Bali & Coast' },
    dx: 14,
    dy: 4,
    textAnchor: 'start',
    boxXOffset: 10,
  },
};

const CATEGORY_ICONS = {
  Trees,
  PawPrint,
  Flame,
  Waves,
};

function getArchipelagoXY(story) {
  const anchor = story?.location?.mapAnchor;
  if (anchor && typeof anchor.x === 'number' && typeof anchor.y === 'number') {
    return { x: anchor.x, y: anchor.y * 0.5 };
  }
  const lat = story?.location?.coordinates?.lat ?? 0;
  const lng = story?.location?.coordinates?.lng ?? 110;
  return {
    x: ((lng - 94) / 48) * 1000,
    y: ((8 - lat) / 20) * 500,
  };
}

function getGlobalXY(story) {
  const lat = story?.location?.coordinates?.lat ?? 0;
  const lng = story?.location?.coordinates?.lng ?? 110;
  return {
    x: ((lng + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 500,
  };
}

function buildQuadraticArcPath(x1, y1, x2, y2, index = 0) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // Bow outward/northward over open sea so arcs avoid crossing adjacent Sumatra pins
  const bendMagnitude = Math.min(72, Math.max(24, dist * 0.28)) + (index % 2) * 10;
  const nx = -dy / dist;
  const ny = dx / dist;
  const sign = ny <= 0 ? 1 : -1;
  const cx = mx + nx * bendMagnitude * sign;
  const cy = my + ny * bendMagnitude * sign;

  return `M ${x1.toFixed(1)},${y1.toFixed(1)} Q ${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

export default function InteractiveEarthMap({
  stories = [],
  highlightedSlugs = null,
  selectedSlug = undefined,
  initialStorySlug = null,
  onSelectStory = null,
  initialView = 'archipelago',
  layout = 'split',
}) {
  const { lang, pick } = useLanguage();
  const [viewMode, setViewMode] = useState(
    initialView === 'global' ? 'global' : 'archipelago'
  );
  const [internalSlug, setInternalSlug] = useState(
    initialStorySlug || stories[0]?.slug || null
  );
  const pinRefs = useRef({});
  const archTabRef = useRef(null);
  const pendingArchFocusRef = useRef(false);

  const matchingSet = useMemo(() => {
    if (!highlightedSlugs) return null;
    if (highlightedSlugs instanceof Set) return highlightedSlugs;
    if (Array.isArray(highlightedSlugs)) return new Set(highlightedSlugs);
    return null;
  }, [highlightedSlugs]);

  const orderedStories = useMemo(() => {
    return [...stories].sort((a, b) => getArchipelagoXY(a).x - getArchipelagoXY(b).x);
  }, [stories]);

  const activeStories = useMemo(() => {
    if (!matchingSet) return orderedStories;
    return orderedStories.filter((story) => matchingSet.has(story.slug));
  }, [orderedStories, matchingSet]);

  const candidateSlug = selectedSlug !== undefined ? selectedSlug : internalSlug;

  const activeStory = useMemo(() => {
    if (activeStories.length === 0) return null;
    const found = activeStories.find((s) => s.slug === candidateSlug);
    return found || activeStories[0];
  }, [activeStories, candidateSlug]);

  const selectStory = (slug) => {
    if (selectedSlug === undefined) {
      setInternalSlug(slug);
    }
    if (typeof onSelectStory === 'function') {
      onSelectStory(slug);
    }
  };

  const handleZoomToArchipelago = () => {
    pendingArchFocusRef.current = true;
    setViewMode('archipelago');
  };

  useEffect(() => {
    if (pendingArchFocusRef.current && viewMode === 'archipelago') {
      pendingArchFocusRef.current = false;
      const targetSlug = activeStory?.slug;
      const targetPin = targetSlug ? pinRefs.current[targetSlug] : null;
      if (targetPin && typeof targetPin.focus === 'function') {
        targetPin.focus();
      } else {
        archTabRef.current?.focus();
      }
    }
  }, [viewMode, activeStory]);

  const handlePinKeyDown = (event, slug) => {
    const navPool = activeStories.length > 0 ? activeStories : orderedStories;
    if (navPool.length === 0) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectStory(slug);
      return;
    }

    const currentIdx = navPool.findIndex((s) => s.slug === slug);
    if (currentIdx === -1) return;

    let nextIdx = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIdx = (currentIdx + 1) % navPool.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIdx = (currentIdx - 1 + navPool.length) % navPool.length;
    } else if (event.key === 'Home') {
      nextIdx = 0;
    } else if (event.key === 'End') {
      nextIdx = navPool.length - 1;
    }

    if (nextIdx !== null) {
      event.preventDefault();
      const nextSlug = navPool[nextIdx].slug;
      selectStory(nextSlug);
      pinRefs.current[nextSlug]?.focus();
    }
  };

  const activeConnections = useMemo(() => {
    if (!activeStory) return [];
    return getConnectedStories(activeStory.slug);
  }, [activeStory]);

  const storyLookup = useMemo(() => {
    const map = new globalThis.Map();
    for (const s of stories) {
      map.set(s.slug, s);
    }
    return map;
  }, [stories]);

  const activeCatMeta = activeStory ? getCategoryMeta(activeStory.category) : null;
  const ActiveCatIcon = CATEGORY_ICONS[activeCatMeta?.icon] || Trees;

  return (
    <section
      className="card card--elevated earth-map"
      aria-label={pick(HOME_EXPLORE_COPY.earthMap.title)}
    >
      <div className="earth-map__toolbar">
        <div className="earth-map__heading">
          <p className="earth-map__title">
            <Map size={18} strokeWidth={2} aria-hidden="true" />
            <span>{pick(HOME_EXPLORE_COPY.earthMap.title)}</span>
          </p>
          <p className="earth-map__subtitle">
            {pick(HOME_EXPLORE_COPY.earthMap.subtitle)}
          </p>
        </div>

        <div
          className="earth-map__tabs"
          role="group"
          aria-label={pick(HOME_EXPLORE_COPY.earthMap.viewModeAria)}
        >
          <button
            ref={archTabRef}
            type="button"
            className={`earth-map__tab ${viewMode === 'archipelago' ? 'is-active' : ''}`}
            aria-pressed={viewMode === 'archipelago'}
            onClick={() => setViewMode('archipelago')}
          >
            <MapPin size={14} strokeWidth={2} aria-hidden="true" />
            <span>{pick(HOME_EXPLORE_COPY.earthMap.archipelagoMode)}</span>
          </button>
          <button
            type="button"
            className={`earth-map__tab ${viewMode === 'global' ? 'is-active' : ''}`}
            aria-pressed={viewMode === 'global'}
            onClick={() => setViewMode('global')}
          >
            <Globe size={14} strokeWidth={2} aria-hidden="true" />
            <span>{pick(HOME_EXPLORE_COPY.earthMap.globalMode)}</span>
          </button>
        </div>
      </div>

      <div
        className={`earth-map__body ${
          layout === 'split' ? 'earth-map__body--split' : ''
        }`.trim()}
      >
        <div className="earth-map__stage">
          <div className="earth-map__svg-wrap">
            {viewMode === 'archipelago' ? (
              <svg
                key="archipelago"
                viewBox="0 0 1000 500"
                className="earth-map__svg"
                role="img"
                aria-label={pick(HOME_EXPLORE_COPY.earthMap.archipelagoSvgLabel)}
              >
                <rect x="0" y="0" width="1000" height="500" className="earth-map__ocean" />

                {/* Graticules: 94E..142E (every 6 deg) & 8N..12S (every 4 deg) */}
                {[41.7, 166.7, 291.7, 416.7, 541.7, 666.7, 791.7, 916.7].map((x) => (
                  <line
                    key={`lon-${x}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={500}
                    className="earth-map__graticule"
                  />
                ))}
                {[100, 300, 400].map((y) => (
                  <line
                    key={`lat-${y}`}
                    x1={0}
                    y1={y}
                    x2={1000}
                    y2={y}
                    className="earth-map__graticule"
                  />
                ))}
                <line
                  x1={0}
                  y1={200}
                  x2={1000}
                  y2={200}
                  className="earth-map__equator"
                />

                {/* Coordinate Labels */}
                <text x="45" y="16" className="earth-map__coord-label">96°E</text>
                <text x="295" y="16" className="earth-map__coord-label">108°E</text>
                <text x="545" y="16" className="earth-map__coord-label">120°E</text>
                <text x="795" y="16" className="earth-map__coord-label">132°E</text>
                <text x="954" y="194" className="earth-map__coord-label">0° EQ</text>
                <text x="954" y="394" className="earth-map__coord-label">8°S</text>

                {/* Indonesia Archipelago Landmasses */}
                <g aria-hidden="true">
                  {ARCHIPELAGO_ISLANDS.map((island) => (
                    <path
                      key={island.id}
                      d={island.d}
                      className="earth-map__land"
                    />
                  ))}
                </g>

                {/* Outgoing Relationship Arcs from Active Story */}
                {activeStory && (
                  <g aria-hidden="true">
                    {activeConnections.map((conn, idx) => {
                      const target = storyLookup.get(conn.story.slug);
                      if (!target) return null;
                      const p1 = getArchipelagoXY(activeStory);
                      const p2 = getArchipelagoXY(target);
                      const relMeta = getRelationshipMeta(conn.relationType);
                      return (
                        <path
                          key={`${activeStory.slug}->${target.slug}-${conn.relationType}`}
                          d={buildQuadraticArcPath(p1.x, p1.y, p2.x, p2.y, idx)}
                          className="earth-map__arc"
                          style={{ stroke: relMeta?.color || '#38bdf8' }}
                        />
                      );
                    })}
                  </g>
                )}

                {/* Story Location Pins */}
                {orderedStories.map((story) => {
                  const { x, y } = getArchipelagoXY(story);
                  const catMeta = getCategoryMeta(story.category);
                  const color = catMeta?.color || '#34d399';
                  const isMuted = matchingSet ? !matchingSet.has(story.slug) : false;
                  const isActive = activeStory?.slug === story.slug;
                  const labelCfg = PIN_LABELS[story.slug] || {
                    short: story.location?.name,
                    dx: 14,
                    dy: 4,
                    textAnchor: 'start',
                    boxXOffset: 10,
                  };
                  const labelText = pick(labelCfg.short);

                  return (
                    <g
                      key={story.slug}
                      ref={(el) => {
                        if (el) {
                          pinRefs.current[story.slug] = el;
                        } else {
                          delete pinRefs.current[story.slug];
                        }
                      }}
                      role="button"
                      tabIndex={isMuted ? -1 : 0}
                      aria-pressed={isActive}
                      aria-label={`${pick(story.title)} (${story.location?.coordinates?.label})`}
                      className={`earth-map__pin ${isActive ? 'earth-map__pin--active' : ''} ${
                        isMuted ? 'earth-map__pin--muted' : ''
                      }`.trim()}
                      onClick={() => {
                        if (!isMuted) selectStory(story.slug);
                      }}
                      onKeyDown={(e) => {
                        if (!isMuted) handlePinKeyDown(e, story.slug);
                      }}
                    >
                      <circle cx={x} cy={y} r={22} className="earth-map__pin-hit" />
                      <circle cx={x} cy={y} r={16} className="earth-map__pin-focus" />
                      {isActive && (
                        <circle
                          cx={x}
                          cy={y}
                          r={14}
                          className="earth-map__pin-halo"
                          style={{ stroke: color }}
                        />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={isActive ? 8.5 : 6.5}
                        className="earth-map__pin-core"
                        style={{ fill: color }}
                      />
                      <rect
                        x={
                          labelCfg.textAnchor === 'end'
                            ? x - (labelText.length * 6.3 + 20)
                            : x + labelCfg.boxXOffset
                        }
                        y={y - 11}
                        width={labelText.length * 6.3 + 12}
                        height={20}
                        rx={4}
                        className="earth-map__pin-label-bg"
                      />
                      <text
                        x={x + labelCfg.dx}
                        y={y + labelCfg.dy}
                        textAnchor={labelCfg.textAnchor}
                        className="earth-map__pin-label"
                      >
                        {labelText}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <svg
                key="global"
                viewBox="0 0 1000 500"
                className="earth-map__svg earth-map__svg--global"
                role="img"
                aria-label={pick(HOME_EXPLORE_COPY.earthMap.globalSvgLabel)}
              >
                <rect x="0" y="0" width="1000" height="500" className="earth-map__ocean" />

                {/* Global Graticules every 60 deg lon & 30 deg lat */}
                {[166.7, 333.3, 500, 666.7, 833.3].map((x) => (
                  <line
                    key={`glon-${x}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={500}
                    className="earth-map__graticule"
                  />
                ))}
                {[83.3, 166.7, 333.3, 416.7].map((y) => (
                  <line
                    key={`glat-${y}`}
                    x1={0}
                    y1={y}
                    x2={1000}
                    y2={y}
                    className="earth-map__graticule"
                  />
                ))}
                <line
                  x1={0}
                  y1={250}
                  x2={1000}
                  y2={250}
                  className="earth-map__equator"
                />

                {/* Global Labels */}
                <text x="12" y="244" className="earth-map__coord-label">0° Equator</text>
                <text x="506" y="16" className="earth-map__coord-label">0° Prime</text>

                {/* World Continents */}
                <g aria-hidden="true">
                  {GLOBAL_CONTINENTS.map((cont) => (
                    <path key={cont.id} d={cont.d} className="earth-map__land" />
                  ))}
                  {GLOBAL_INDONESIA_ISLANDS.map((isl) => (
                    <path
                      key={isl.id}
                      d={isl.d}
                      className="earth-map__land earth-map__land--indonesia"
                    />
                  ))}
                </g>

                {/* Clickable Indonesia Focus Bounding Frame */}
                <g
                  className="earth-map__focus-group"
                  role="button"
                  tabIndex={0}
                  aria-label={pick(HOME_EXPLORE_COPY.earthMap.focusIndonesiaLabel)}
                  onClick={handleZoomToArchipelago}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleZoomToArchipelago();
                    }
                  }}
                >
                  <rect
                    x="761.1"
                    y="227.8"
                    width="133.3"
                    height="55.6"
                    rx="4"
                    className="earth-map__focus-box"
                  />
                  <text x="761.1" y="220" className="earth-map__focus-label">
                    {pick(HOME_EXPLORE_COPY.earthMap.focusIndonesiaLabel)}
                  </text>
                </g>

                {/* Global Pins */}
                {orderedStories.map((story) => {
                  const { x, y } = getGlobalXY(story);
                  const catMeta = getCategoryMeta(story.category);
                  const color = catMeta?.color || '#34d399';
                  const isMuted = matchingSet ? !matchingSet.has(story.slug) : false;
                  const isActive = activeStory?.slug === story.slug;
                  return (
                    <g
                      key={story.slug}
                      ref={(el) => {
                        if (el) {
                          pinRefs.current[story.slug] = el;
                        } else {
                          delete pinRefs.current[story.slug];
                        }
                      }}
                      role="button"
                      tabIndex={isMuted ? -1 : 0}
                      aria-pressed={isActive}
                      aria-label={`${pick(story.title)} (${story.location?.coordinates?.label})`}
                      className={`earth-map__pin ${isActive ? 'earth-map__pin--active' : ''} ${
                        isMuted ? 'earth-map__pin--muted' : ''
                      }`.trim()}
                      onClick={() => {
                        if (!isMuted) selectStory(story.slug);
                      }}
                      onKeyDown={(e) => {
                        if (!isMuted) handlePinKeyDown(e, story.slug);
                      }}
                    >
                      <circle cx={x} cy={y} r={3.8} className="earth-map__pin-hit" />
                      <circle cx={x} cy={y} r={11} className="earth-map__pin-focus" />
                      {isActive && (
                        <circle
                          cx={x}
                          cy={y}
                          r={8.5}
                          className="earth-map__pin-halo"
                          style={{ stroke: color }}
                        />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={isActive ? 4.2 : 3.4}
                        className="earth-map__pin-core"
                        style={{ fill: color }}
                      />
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Accessible quick selector pills for touch & keyboard */}
          <div
            className="earth-map__story-pills"
            role="group"
            aria-label={pick(HOME_EXPLORE_COPY.earthMap.storySelectorLabel)}
          >
            {orderedStories.map((story) => {
              const catMeta = getCategoryMeta(story.category);
              const color = catMeta?.color || '#34d399';
              const isMuted = matchingSet ? !matchingSet.has(story.slug) : false;
              const isActive = activeStory?.slug === story.slug;
              const labelCfg = PIN_LABELS[story.slug];
              const shortText = labelCfg ? pick(labelCfg.short) : pick(story.location?.name);

              return (
                <button
                  key={story.slug}
                  type="button"
                  disabled={isMuted}
                  aria-pressed={isActive}
                  className={`earth-map__story-pill ${isActive ? 'is-active' : ''} ${
                    isMuted ? 'is-muted' : ''
                  }`.trim()}
                  style={{ '--pill-color': color }}
                  onClick={() => selectStory(story.slug)}
                >
                  <span
                    className="earth-map__story-pill-dot"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span>{shortText}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Inspector Panel */}
        <aside className="earth-map__inspector" aria-live="polite">
          {activeStory ? (
            <>
              <div className="earth-map__inspector-top">
                {activeCatMeta && (
                  <span
                    className="tag story-card__tag"
                    style={{
                      '--cat-color': activeCatMeta.color,
                      '--cat-bg': activeCatMeta.bgTint,
                      '--cat-border': activeCatMeta.borderTint,
                    }}
                  >
                    <ActiveCatIcon size={13} strokeWidth={2} aria-hidden="true" />
                    <span>{pick(activeCatMeta.shortLabel)}</span>
                  </span>
                )}
                <EpistemicBadge
                  type={activeStory.keyMetric?.factType || 'fact'}
                  size="sm"
                />
              </div>

              <p className="earth-map__inspector-title">{pick(activeStory.title)}</p>

              <p className="earth-map__inspector-coords">
                <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                <span>
                  {pick(activeStory.location?.name)} •{' '}
                  {activeStory.location?.coordinates?.label}
                </span>
              </p>

              {activeStory.keyMetric && (
                <div className="earth-map__inspector-metric">
                  <strong className="tabular-nums">
                    {activeStory.keyMetric.value}
                  </strong>
                  <span>{pick(activeStory.keyMetric.label)}</span>
                </div>
              )}

              {activeConnections.length > 0 && (
                <div className="earth-map__inspector-relations">
                  <span className="earth-map__inspector-label">
                    {pick(HOME_EXPLORE_COPY.earthMap.outgoingConnectionsLabel)} (
                    {activeConnections.length})
                  </span>
                  <div className="earth-map__inspector-badges">
                    {activeConnections.map((conn) => (
                      <RelationshipBadge
                        key={`${conn.story.slug}-${conn.relationType}`}
                        relationType={conn.relationType}
                        targetStory={conn.story}
                        rationale={conn.rationale}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="earth-map__inspector-actions">
                <Link
                  to={`/story/${activeStory.slug}`}
                  className="btn btn--primary btn--sm"
                >
                  <span>{pick(HOME_EXPLORE_COPY.earthMap.openStoryCta)}</span>
                  <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                </Link>
              </div>
            </>
          ) : (
            <div className="earth-map__inspector-relations">
              <p className="earth-map__inspector-title">
                {pick(HOME_EXPLORE_COPY.earthMap.noMatchingPinsTitle)}
              </p>
              <p className="earth-map__subtitle">
                {pick(HOME_EXPLORE_COPY.earthMap.noMatchingPinsBody)}
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="earth-map__legend">
        <div className="earth-map__legend-items">
          <span className="earth-map__legend-item">
            <Network size={13} strokeWidth={2} aria-hidden="true" />
            <span>{pick(HOME_EXPLORE_COPY.earthMap.legendLabel)}</span>
          </span>
          {RELATIONSHIP_LIST.filter((rel) =>
            ['Affects', 'Observed in', 'Associated with', 'Related to'].includes(rel.id)
          ).map((rel) => (
            <span key={rel.id} className="earth-map__legend-item">
              <span
                className="earth-map__legend-swatch"
                style={{ backgroundColor: rel.color }}
                aria-hidden="true"
              />
              <span>{lang === 'en' ? rel.label.en : rel.label.id}</span>
            </span>
          ))}
        </div>
        <span>{pick(HOME_EXPLORE_COPY.earthMap.keyboardHint)}</span>
      </div>
    </section>
  );
}
