import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

export const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
  narrow: { width: 320, height: 568 },
};

const EDGE_CANDIDATES = [
  process.env.E2E_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

export function resolveEdgeExecutable() {
  for (const candidate of EDGE_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function launchBrowser() {
  const executablePath = resolveEdgeExecutable();
  const baseArgs = ['--no-first-run', '--no-default-browser-check'];
  if (executablePath) {
    return chromium.launch({
      headless: true,
      executablePath,
      args: baseArgs,
    });
  }
  return chromium.launch({
    headless: true,
    channel: 'msedge',
    args: baseArgs,
  });
}

export async function createTrackedPage(browser, options = {}) {
  const viewport = options.viewport ?? VIEWPORTS.desktop;
  const contextOptions = { viewport };
  if (options.reducedMotion) {
    contextOptions.reducedMotion = options.reducedMotion;
  }

  const context = await browser.newContext(contextOptions);
  if (options.initScript) {
    await context.addInitScript(options.initScript);
  }
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const httpErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(String(err?.message ?? err));
  });

  page.on('requestfailed', (req) => {
    const failureText = req.failure()?.errorText ?? 'unknown';
    if (failureText === 'net::ERR_ABORTED') return;
    requestFailures.push(`${req.method()} ${req.url()} (${failureText})`);
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      httpErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  return {
    context,
    page,
    errors: { consoleErrors, pageErrors, requestFailures, httpErrors },
    clearErrors() {
      consoleErrors.length = 0;
      pageErrors.length = 0;
      requestFailures.length = 0;
      httpErrors.length = 0;
    },
    async close() {
      await context.close().catch(() => {});
    },
  };
}

export function assertNoRuntimeErrors(tracker, label = 'page', { allowHttp404 = false } = {}) {
  const { consoleErrors, pageErrors, requestFailures, httpErrors } = tracker.errors;
  const filteredHttp = allowHttp404
    ? httpErrors.filter((entry) => !entry.startsWith('404 '))
    : httpErrors;
  const filteredConsole = allowHttp404
    ? consoleErrors.filter((entry) => !/404 \(Not Found\)/i.test(entry))
    : consoleErrors;

  assert.equal(
    pageErrors.length,
    0,
    `[${label}] Uncaught pageerror(s): ${pageErrors.join(' | ')}`
  );
  assert.equal(
    filteredConsole.length,
    0,
    `[${label}] console.error(s): ${filteredConsole.join(' | ')}`
  );
  assert.equal(
    requestFailures.length,
    0,
    `[${label}] Failed network request(s): ${requestFailures.join(' | ')}`
  );
  assert.equal(
    filteredHttp.length,
    0,
    `[${label}] HTTP >=400 response(s): ${filteredHttp.join(' | ')}`
  );
}

export async function gotoRoute(page, baseUrl, routePath = '/', { allowMainMissing = false } = {}) {
  const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`;
  const targetUrl = `${baseUrl}${normalizedPath}`;
  await page.goto(targetUrl, { waitUntil: 'load', timeout: 20000 });
  if (!allowMainMissing) {
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 10000 });
  } else {
    await page.waitForTimeout(250);
  }
}

export async function getHtmlLang(page) {
  const lang = await page.locator('html').getAttribute('lang');
  return (lang ?? '').toLowerCase().slice(0, 2);
}

function isLangButtonCandidate(text, ariaLabel) {
  return (
    /^(id\s*\/\s*en|en\s*\/\s*id|id|en)$/i.test(text) ||
    /\b(bahasa|language|english|inggris|indonesian?)\b/i.test(ariaLabel)
  );
}

const LANG_TOGGLE_NAME_RX =
  /\b(id|en|indonesia|indonesian|english|inggris|bahasa|language)\b/i;

export async function findMobileMenuToggle(page) {
  const candidates = page.locator('header button, nav button').filter({
    hasText: /menu|navigasi|navigation|buka|open|tutup|close/i,
  });
  for (let i = 0; i < (await candidates.count()); i += 1) {
    const btn = candidates.nth(i);
    const text = ((await btn.textContent()) ?? '').trim();
    const ariaLabel = (await btn.getAttribute('aria-label')) ?? '';
    if (isLangButtonCandidate(text, ariaLabel)) continue;
    if (await btn.isVisible()) return btn;
  }
  const ariaToggle = page.locator(
    'header button[aria-label*="menu" i], header button[aria-label*="nav" i], header button[aria-expanded]'
  );
  for (let i = 0; i < (await ariaToggle.count()); i += 1) {
    const btn = ariaToggle.nth(i);
    const text = ((await btn.textContent()) ?? '').trim();
    const ariaLabel = (await btn.getAttribute('aria-label')) ?? '';
    if (isLangButtonCandidate(text, ariaLabel)) continue;
    if (await btn.isVisible()) return btn;
  }
  return null;
}

export async function findVisibleNavLink(page, href) {
  const links = page.locator(`header a[href="${href}"], nav a[href="${href}"]`);
  const count = await links.count();
  for (let i = 0; i < count; i += 1) {
    const link = links.nth(i);
    if (await link.isVisible()) return link;
  }
  return null;
}

export async function findLanguageToggle(page) {
  const direct = page.locator('header, nav').getByRole('button', {
    name: LANG_TOGGLE_NAME_RX,
  });
  for (let i = 0; i < (await direct.count()); i += 1) {
    const btn = direct.nth(i);
    if (await btn.isVisible()) return btn;
  }
  const aria = page.locator(
    'button[aria-label*="bahasa" i], button[aria-label*="language" i], button[aria-label*="english" i], button[aria-label*="indonesia" i], button[aria-label*="inggris" i], [aria-label*="bahasa" i] button, [aria-label*="language" i] button, [aria-label*="bahasa" i] [role="switch"], [aria-label*="language" i] [role="switch"]'
  );
  for (let i = 0; i < (await aria.count()); i += 1) {
    const btn = aria.nth(i);
    if (await btn.isVisible()) return btn;
  }
  const anyVisible = page.getByRole('button', {
    name: LANG_TOGGLE_NAME_RX,
  });
  for (let i = 0; i < (await anyVisible.count()); i += 1) {
    const btn = anyVisible.nth(i);
    if (await btn.isVisible()) return btn;
  }
  return null;
}

export async function toggleLanguage(page) {
  const before = await getHtmlLang(page);
  let toggle = await findLanguageToggle(page);
  let openedDrawer = false;
  if (!toggle) {
    const menuBtn = await findMobileMenuToggle(page);
    if (menuBtn) {
      await menuBtn.click();
      openedDrawer = true;
      await page.waitForTimeout(150);
      toggle = await findLanguageToggle(page);
    }
  }
  assert.ok(toggle, 'Language toggle button must be present and reachable');
  await toggle.click();
  await page.waitForTimeout(150);
  if (openedDrawer) {
    const menuBtn = await findMobileMenuToggle(page);
    if (menuBtn) {
      const expanded = await menuBtn.getAttribute('aria-expanded');
      if (expanded === 'true') {
        await menuBtn.click();
        await page.waitForTimeout(150);
      }
    }
  }
  const after = await getHtmlLang(page);
  assert.notEqual(after, before, `Expected html[lang] to toggle from "${before}"`);
  return after;
}

export async function ensureLang(page, targetLang) {
  const current = await getHtmlLang(page);
  if (current === targetLang) return current;
  return toggleLanguage(page);
}

export async function assertNoHorizontalOverflow(page, maxWidth = null, label = 'viewport') {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  assert.ok(
    metrics.scrollWidth <= metrics.innerWidth,
    `[${label}] Horizontal overflow detected: scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`
  );
  if (maxWidth !== null) {
    assert.ok(
      metrics.scrollWidth <= maxWidth,
      `[${label}] scrollWidth=${metrics.scrollWidth} exceeds expected maxWidth=${maxWidth}`
    );
  }
}

export async function assertAllVisibleImagesLoaded(page, label = 'page') {
  const results = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    return imgs.map((img) => {
      const rect = img.getBoundingClientRect();
      const style = window.getComputedStyle(img);
      const visible =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        (rect.width > 0 || rect.height > 0 || img.getClientRects().length > 0);
      return {
        src: img.getAttribute('src') ?? '',
        alt: img.getAttribute('alt') ?? '',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        visible,
      };
    });
  });

  for (const img of results) {
    if (!img.visible) continue;
    assert.ok(
      img.complete && img.naturalWidth > 0,
      `[${label}] Broken image detected: src="${img.src}" complete=${img.complete} naturalWidth=${img.naturalWidth}`
    );
  }
  return results;
}

export async function measureContrastAndLuminance(page) {
  return page.evaluate(() => {
    function parseRgba(str) {
      if (!str || str === 'transparent') return [0, 0, 0, 0];
      let match = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+%?))?\s*\)/i
      );
      if (!match) {
        match = str.match(
          /rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/i
        );
      }
      if (!match) return null;
      let alpha = 1;
      if (match[4] !== undefined) {
        alpha = match[4].endsWith('%') ? parseFloat(match[4]) / 100 : Number(match[4]);
      }
      return [Number(match[1]), Number(match[2]), Number(match[3]), alpha];
    }

    function compositeOver(fg, bg) {
      const a = Math.min(1, Math.max(0, fg[3]));
      if (a >= 0.999) return [fg[0], fg[1], fg[2], 1];
      return [
        fg[0] * a + bg[0] * (1 - a),
        fg[1] * a + bg[1] * (1 - a),
        fg[2] * a + bg[2] * (1 - a),
        1,
      ];
    }

    function effectiveOpacity(el) {
      let op = 1;
      let cur = el;
      while (cur && cur.nodeType === Node.ELEMENT_NODE) {
        const val = parseFloat(window.getComputedStyle(cur).opacity);
        if (Number.isFinite(val)) {
          op *= Math.min(1, Math.max(0, val));
        }
        cur = cur.parentElement;
      }
      return op;
    }

    function resolveBackground(el) {
      const chain = [];
      let cur = el;
      while (cur && cur.nodeType === Node.ELEMENT_NODE) {
        const bg = parseRgba(window.getComputedStyle(cur).backgroundColor);
        if (bg && bg[3] > 0) chain.push(bg);
        cur = cur.parentElement;
      }
      let result = [255, 255, 255, 1];
      for (let i = chain.length - 1; i >= 0; i -= 1) {
        result = compositeOver(chain[i], result);
      }
      return result;
    }

    function relLuminance([r, g, b]) {
      const toLin = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
    }

    function contrastRatio(l1, l2) {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    const bodyBg = resolveBackground(document.body);
    const rawBodyFg = parseRgba(window.getComputedStyle(document.body).color) ?? [0, 0, 0, 1];
    const bodyOp = effectiveOpacity(document.body);
    const bodyFg = compositeOver([rawBodyFg[0], rawBodyFg[1], rawBodyFg[2], rawBodyFg[3] * bodyOp], bodyBg);
    const bodyBgLum = relLuminance(bodyBg);
    const bodyFgLum = relLuminance(bodyFg);

    const selectors = 'main h1, main h2, main p, nav a';
    const samples = [...document.querySelectorAll(selectors)]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) > 0.01 &&
          (el.innerText ?? '').trim().length > 0
        );
      })
      .slice(0, 20)
      .map((el) => {
        const style = window.getComputedStyle(el);
        const bg = resolveBackground(el);
        const rawFg = parseRgba(style.color) ?? [0, 0, 0, 1];
        const op = effectiveOpacity(el);
        const fg = compositeOver([rawFg[0], rawFg[1], rawFg[2], rawFg[3] * op], bg);
        const lFg = relLuminance(fg);
        const lBg = relLuminance(bg);
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = parseInt(style.fontWeight, 10) || 400;
        const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.innerText ?? '').trim().slice(0, 40),
          ratio: contrastRatio(lFg, lBg),
          minRequired: isLarge ? 3.0 : 4.5,
          fontSize,
        };
      });

    return { bodyBgLum, bodyFgLum, samples };
  });
}

const MARKER_IN_SVG_SELECTOR = [
  '[role="button"]:not([role="button"] *)',
  'a[href]:not([role="button"] *):not(a *)',
  'button:not([role="button"] *)',
  '[data-slug]:not([role="button"] *):not(a *):not(button *)',
  'circle[tabindex]:not([role="button"] *):not(a *):not(button *):not([data-slug] *)',
  'g[tabindex]:not([role="button"] *):not(a *):not(button *):not([data-slug] *)',
].join(', ');

export async function getInteractiveMapInfo(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-e2e-map-container], [data-e2e-map-preview]').forEach((el) => {
      el.removeAttribute('data-e2e-map-container');
      el.removeAttribute('data-e2e-map-preview');
    });
  });

  const svgs = page.locator('main svg');
  const count = await svgs.count();
  for (let i = 0; i < count; i += 1) {
    const svg = svgs.nth(i);
    if (!(await svg.isVisible())) continue;
    const box = await svg.boundingBox();
    if (!box || box.width < 150 || box.height < 100) continue;

    const markersInSvg = svg.locator(MARKER_IN_SVG_SELECTOR);
    const svgMarkerCount = await markersInSvg.count();

    const immediateWrapper = svg.locator('xpath=parent::*');
    const wrapperHasNonMapControls = await immediateWrapper.evaluate((el) =>
      Boolean(
        el.querySelector('article, input[type="search"], [role="searchbox"], select')
      )
    );
    const overlayMarkers = immediateWrapper.locator(
      'button[data-slug], [role="button"]:not(svg *), button[aria-label]'
    );
    const overlayMarkerCount = wrapperHasNonMapControls ? 0 : await overlayMarkers.count();

    if (svgMarkerCount >= 2 || overlayMarkerCount >= 2) {
      const hasPreviewSibling = await svg.evaluate((svgEl) => {
        const mainEl = svgEl.closest('main');
        let cur = svgEl.parentElement;
        let best = cur;
        while (cur && cur !== mainEl && cur.tagName !== 'BODY') {
          const hasSearch = Boolean(
            cur.querySelector('input[type="search"], [role="searchbox"], select')
          );
          const curArticles = cur.querySelectorAll('article').length;
          const bestArticles = best ? best.querySelectorAll('article').length : 0;
          const bestHasSvg = Boolean(best && best.querySelector('svg'));
          const hasArticleOutsideAside = [...cur.querySelectorAll('article')].some(
            (art) => !art.closest('aside')
          );
          if (
            hasSearch ||
            curArticles >= 2 ||
            (bestHasSvg &&
              curArticles >= 1 &&
              (curArticles > bestArticles || hasArticleOutsideAside))
          ) {
            break;
          }
          best = cur;
          cur = cur.parentElement;
        }
        if (best) {
          best.setAttribute('data-e2e-map-container', 'true');
          const next = best.nextElementSibling;
          if (
            !best.querySelector('a[href^="/story/"]') &&
            next &&
            next.tagName !== 'ARTICLE' &&
            !next.querySelector('input[type="search"], [role="searchbox"], select') &&
            next.querySelectorAll('article').length === 0 &&
            next.querySelector('a[href^="/story/"]')
          ) {
            next.setAttribute('data-e2e-map-preview', 'true');
            return true;
          }
        }
        return false;
      });

      const container = page.locator('[data-e2e-map-container="true"]').first();
      const previewScope = hasPreviewSibling
        ? page.locator('[data-e2e-map-container="true"], [data-e2e-map-preview="true"]')
        : container;

      return {
        svg,
        box,
        markers: svgMarkerCount >= 2 ? markersInSvg : overlayMarkers,
        markerCount: svgMarkerCount >= 2 ? svgMarkerCount : overlayMarkerCount,
        container,
        previewScope,
      };
    }
  }
  return null;
}

export async function getMapPreviewCtaLink(mapInfo) {
  assert.ok(mapInfo?.previewScope, 'Map info must include previewScope');
  const storyLinks = mapInfo.previewScope.locator('a[href^="/story/"]:not(svg *)');
  const cta = storyLinks
    .filter({
      hasText: /buka\s+kisah|open\s+(full\s+)?story|baca\s+kisah|read\s+story|selengkapnya/i,
    })
    .first();
  if ((await cta.count()) > 0) {
    return cta;
  }
  return storyLinks.last();
}

export async function getDirectoryStoryLinks(page) {
  await getInteractiveMapInfo(page);
  return page.locator(
    'main a[href^="/story/"]:not([data-e2e-map-container="true"] *):not([data-e2e-map-preview="true"] *):not(svg *):not(nav *):not([aria-label*="breadcrumb" i] *)'
  );
}

export async function getDirectoryStoryHrefs(page) {
  const mapInfo = await getInteractiveMapInfo(page);
  const links = page.locator(
    'main a[href^="/story/"]:not([data-e2e-map-container="true"] *):not([data-e2e-map-preview="true"] *):not(svg *):not(nav *):not([aria-label*="breadcrumb" i] *)'
  );
  return links.evaluateAll((els, mapBox) => {
    const out = new Set();
    for (const a of els) {
      const s = window.getComputedStyle(a);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      if (mapBox) {
        const r = a.getBoundingClientRect();
        if (
          r.width > 0 &&
          r.height > 0 &&
          r.left >= mapBox.x - 2 &&
          r.right <= mapBox.x + mapBox.width + 2 &&
          r.top >= mapBox.y - 2 &&
          r.bottom <= mapBox.y + mapBox.height + 2
        ) {
          continue;
        }
      }
      const href = a.getAttribute('href');
      if (href) out.add(href);
    }
    return [...out];
  }, mapInfo?.box ?? null);
}
