import { useId } from 'react';
import { BarChart3 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { detailInfo } from '../../i18n/detailInfo.js';
import ClaimCitation from './ClaimCitation.jsx';

function computeNiceMax(rawMax) {
  if (!Number.isFinite(rawMax) || rawMax <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalized = rawMax / magnitude;
  let niceFactor = 10;
  if (normalized <= 1) niceFactor = 1;
  else if (normalized <= 1.2) niceFactor = 1.2;
  else if (normalized <= 1.5) niceFactor = 1.5;
  else if (normalized <= 2) niceFactor = 2;
  else if (normalized <= 2.5) niceFactor = 2.5;
  else if (normalized <= 3) niceFactor = 3;
  else if (normalized <= 4) niceFactor = 4;
  else if (normalized <= 5) niceFactor = 5;
  else if (normalized <= 6) niceFactor = 6;
  else if (normalized <= 8) niceFactor = 8;
  return niceFactor * magnitude;
}

export default function DataChart({
  chartData,
  sources = [],
  onSelectSource,
}) {
  const { lang, pick } = useLanguage();
  const chartUid = useId();

  if (!chartData || !Array.isArray(chartData.series) || chartData.series.length === 0) {
    return null;
  }

  const copy = (detailInfo[lang] ?? detailInfo.en).storyDetail.chart;
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const numberFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  });
  const compactFormatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  const chartTitle = pick(chartData.title);
  const chartNote = pick(chartData.note);
  const unitText = typeof chartData.unit === 'string' ? chartData.unit : '';
  const chartSource = Array.isArray(sources)
    ? sources.find((s) => s && s.id === chartData.sourceId)
    : null;
  const typeLabel =
    (chartData.type && copy.typeLabels?.[chartData.type]) ||
    copy.typeLabels.bar;

  const series = chartData.series.map((pt, idx) => {
    const rawLabel = typeof pt?.label === 'string' ? pt.label : String(idx + 1);
    const localizedLabel =
      (copy.seriesLabels && Object.hasOwn(copy.seriesLabels, rawLabel)
        ? copy.seriesLabels[rawLabel]
        : rawLabel) || rawLabel;
    const numericValue = Number(pt?.value);
    const value = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
    const rawUncertainty = pt?.uncertainty;
    const hasUncertainty =
      typeof rawUncertainty === 'number' &&
      Number.isFinite(rawUncertainty) &&
      rawUncertainty > 0;

    return {
      key: `${rawLabel}-${idx}`,
      label: localizedLabel,
      value,
      uncertainty: hasUncertainty ? rawUncertainty : null,
      highlight: Boolean(pt?.highlight),
    };
  });

  const hasAnyHighlight = series.some((pt) => pt.highlight);
  const hasAnyBaseline = series.some((pt) => !pt.highlight);
  const hasAnyUncertainty = series.some((pt) => pt.uncertainty !== null);

  const rawMax = Math.max(
    ...series.map((pt) => pt.value + (pt.uncertainty ?? 0)),
    1
  );
  const niceMax = computeNiceMax(rawMax);

  // Responsive stacked-row SVG geometry (zero label clipping at 375px+)
  const svgWidth = 720;
  const padLeft = 16;
  const padRight = 16;
  const barAreaWidth = svgWidth - padLeft - padRight;
  const topPad = 14;
  const rowHeight = 62;
  const axisHeight = 34;
  const svgHeight = topPad + series.length * rowHeight + axisHeight;
  const axisY = topPad + series.length * rowHeight + 6;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const formatTick = (val) => {
    if (val === 0) return '0';
    if (niceMax >= 10000) return compactFormatter.format(val);
    return numberFormatter.format(val);
  };

  const titleId = `${chartUid}-title`;
  const descId = `${chartUid}-desc`;

  const srDescription = series
    .map((pt) => {
      const formattedVal = numberFormatter.format(pt.value);
      const unc =
        pt.uncertainty !== null
          ? ` ± ${numberFormatter.format(pt.uncertainty)}`
          : '';
      return `${pt.label}: ${formattedVal}${unc} ${unitText}`.trim();
    })
    .join('; ');

  return (
    <div className="data-chart" data-chart-type={chartData.type || 'bar'}>
      <div className="data-chart__header">
        <div>
          <h3 className="data-chart__title">{chartTitle}</h3>
        </div>

        <div className="data-chart__badges">
          <span className="tag">
            <BarChart3 size={13} aria-hidden="true" />
            <span>{typeLabel}</span>
          </span>
          {unitText && (
            <span className="tag mono">
              {copy.unitLabel}: {unitText}
            </span>
          )}
        </div>
      </div>

      {(hasAnyHighlight || hasAnyBaseline) && (
        <div className="data-chart__legend">
          {hasAnyHighlight && (
            <span className="data-chart__legend-item">
              <span
                className="data-chart__swatch data-chart__swatch--highlight"
                aria-hidden="true"
              />
              <span>{copy.highlightedLabel}</span>
            </span>
          )}
          {hasAnyBaseline && (
            <span className="data-chart__legend-item">
              <span
                className="data-chart__swatch data-chart__swatch--base"
                aria-hidden="true"
              />
              <span>{copy.baselineLabel}</span>
            </span>
          )}
          {hasAnyUncertainty && (
            <span className="data-chart__legend-item">
              <span className="mono" aria-hidden="true">±</span>
              <span>{copy.uncertaintyLabel}</span>
            </span>
          )}
        </div>
      )}

      <div className="data-chart__svg-wrap">
        <svg
          className="data-chart__svg"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="img"
          aria-labelledby={titleId}
          aria-describedby={descId}
        >
          <title id={titleId}>{chartTitle}</title>
          <desc id={descId}>{srDescription}</desc>

          {/* Vertical grid lines */}
          {ticks.map((ratio) => {
            const x = padLeft + ratio * barAreaWidth;
            return (
              <g key={`grid-${ratio}`}>
                <line
                  x1={x}
                  y1={topPad}
                  x2={x}
                  y2={axisY}
                  stroke="rgba(148, 163, 184, 0.16)"
                  strokeWidth="1"
                  strokeDasharray={ratio === 0 ? undefined : '3 4'}
                />
                <text
                  x={x}
                  y={axisY + 18}
                  textAnchor={
                    ratio === 0 ? 'start' : ratio === 1 ? 'end' : 'middle'
                  }
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                >
                  {formatTick(niceMax * ratio)}
                </text>
              </g>
            );
          })}

          {/* Horizontal stacked rows */}
          {series.map((pt, idx) => {
            const rowTop = topPad + idx * rowHeight;
            const barY = rowTop + 26;
            const barHeight = 20;
            const barWidth = Math.max(
              pt.value > 0 ? 4 : 0,
              (pt.value / niceMax) * barAreaWidth
            );
            const barFill = pt.highlight ? '#fbbf24' : '#38bdf8';

            const formattedVal = numberFormatter.format(pt.value);
            const valueDisplay =
              pt.uncertainty !== null
                ? `${formattedVal} ± ${numberFormatter.format(pt.uncertainty)} ${unitText}`.trim()
                : `${formattedVal} ${unitText}`.trim();

            const lowX =
              pt.uncertainty !== null
                ? padLeft +
                  (Math.max(0, pt.value - pt.uncertainty) / niceMax) *
                    barAreaWidth
                : null;
            const highX =
              pt.uncertainty !== null
                ? padLeft +
                  (Math.min(niceMax, pt.value + pt.uncertainty) / niceMax) *
                    barAreaWidth
                : null;
            const whiskerY = barY + barHeight / 2;

            return (
              <g key={pt.key}>
                {/* Row label (top-left) */}
                <text
                  x={padLeft}
                  y={rowTop + 17}
                  fill="#f1f5f9"
                  fontSize="13.5"
                  fontWeight={pt.highlight ? '600' : '500'}
                  fontFamily="var(--font-sans)"
                >
                  {pt.label}
                </text>

                {/* Exact formatted value (top-right) */}
                <text
                  x={svgWidth - padRight}
                  y={rowTop + 17}
                  textAnchor="end"
                  fill={pt.highlight ? '#fbbf24' : '#cbd5e1'}
                  fontSize="13"
                  fontWeight="600"
                  fontFamily="var(--font-mono)"
                >
                  {valueDisplay}
                </text>

                {/* Track */}
                <rect
                  x={padLeft}
                  y={barY}
                  width={barAreaWidth}
                  height={barHeight}
                  rx="5"
                  fill="#162032"
                  stroke="rgba(148, 163, 184, 0.14)"
                  strokeWidth="1"
                />

                {/* Data Bar */}
                {barWidth > 0 && (
                  <rect
                    x={padLeft}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    rx="5"
                    fill={barFill}
                    fillOpacity={pt.highlight ? '0.92' : '0.82'}
                  />
                )}

                {/* Optional Uncertainty Whiskers */}
                {lowX !== null && highX !== null && (
                  <g stroke="#f1f5f9" strokeWidth="1.75">
                    <line x1={lowX} y1={whiskerY} x2={highX} y2={whiskerY} />
                    <line
                      x1={lowX}
                      y1={whiskerY - 5}
                      x2={lowX}
                      y2={whiskerY + 5}
                    />
                    <line
                      x1={highX}
                      y1={whiskerY - 5}
                      x2={highX}
                      y2={whiskerY + 5}
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <details className="data-chart__details">
        <summary>{copy.dataTableSummary}</summary>
        <div className="data-chart__table-wrap">
          <table className="data-chart__table">
            <thead>
              <tr>
                <th scope="col">{copy.tableCategoryCol}</th>
                <th scope="col">
                  {copy.tableValueCol} {unitText ? `(${unitText})` : ''}
                </th>
                {hasAnyUncertainty && (
                  <th scope="col">{copy.tableUncertaintyCol}</th>
                )}
                <th scope="col">{copy.tableStatusCol}</th>
              </tr>
            </thead>
            <tbody>
              {series.map((pt) => (
                <tr key={`row-${pt.key}`}>
                  <td>{pt.label}</td>
                  <td className="tabular-nums">
                    {numberFormatter.format(pt.value)}
                  </td>
                  {hasAnyUncertainty && (
                    <td className="tabular-nums">
                      {pt.uncertainty !== null
                        ? `± ${numberFormatter.format(pt.uncertainty)}`
                        : '—'}
                    </td>
                  )}
                  <td>
                    {pt.highlight ? copy.highlightedLabel : copy.baselineLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="data-chart__footer">
        {chartNote && <p className="data-chart__note">{chartNote}</p>}
        {chartData.sourceId && (
          <div className="data-chart__source-row">
            <span>{copy.sourceLabel}:</span>
            {chartSource && (
              <span className="data-chart__source-author">
                {chartSource.authorOrInstitution}
                {chartSource.year ? ` (${chartSource.year})` : ''}
              </span>
            )}
            <ClaimCitation
              sourceId={chartData.sourceId}
              sources={sources}
              onSelectSource={onSelectSource}
            />
          </div>
        )}
      </div>
    </div>
  );
}
