import assert from 'node:assert/strict';
import {
  VIEWPORTS,
  assertAllVisibleImagesLoaded,
  assertNoHorizontalOverflow,
  assertNoRuntimeErrors,
  createTrackedPage,
  ensureLang,
  findLanguageToggle,
  findMobileMenuToggle,
  findVisibleNavLink,
  getDirectoryStoryHrefs,
  getHtmlLang,
  getInteractiveMapInfo,
  getMapPreviewCtaLink,
  gotoRoute,
  measureContrastAndLuminance,
  toggleLanguage,
} from '../lib/browser.mjs';
import {
  ALLOWED_RELATIONS,
  EPISTEMIC_BILINGUAL_REGEX,
  README_REQUIRED_SECTION_PATTERNS,
  RELATION_BILINGUAL_REGEX,
  TEAM_MEMBERS,
  TEAM_NAME_PLACEHOLDER,
  categoryRegexForKey,
  epistemicRegexForLang,
  loadPackageJsonContract,
  loadReadmeContract,
  loadStoriesContract,
  publicImageExists,
  regionRegexForKey,
} from '../lib/contracts.mjs';

function normalizeText(str) {
  return (str ?? '').replace(/\s+/g, ' ').trim();
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findExploreResetButton(page) {
  return page
    .locator('main button:not([data-e2e-map-container="true"] *)')
    .filter({ hasText: /\b(reset|atur\s+ulang|hapus\s+filter|bersihkan|clear(\s+filters?)?)\b/i });
}

async function getExploreFilterControls(page) {
  await getInteractiveMapInfo(page);
  return page.locator(
    'main button:not([data-e2e-map-container="true"] *), main [role="tab"]:not([data-e2e-map-container="true"] *), main [role="radio"]:not([data-e2e-map-container="true"] *)'
  );
}

export function getTier1Tests() {
  return [
    // =========================================================================
    // F01 (P0-1) — App Shell, Routing & Navigation (6 tests)
    // =========================================================================
    {
      id: 'T1-F01-01',
      tier: 1,
      feature: 'F01',
      name: 'Core semantic landmark shell & skip link on /',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;

          assert.ok((await page.locator('header, [role="banner"]').count()) >= 1, 'Missing banner/header landmark');
          assert.ok((await page.locator('nav, [role="navigation"]').count()) >= 1, 'Missing navigation landmark');
          const main = page.locator('main, [role="main"]').first();
          assert.ok(await main.isVisible(), 'Main landmark must be visible');
          const footer = page.locator('footer, [role="contentinfo"]').first();
          assert.ok(await footer.isVisible(), 'Footer landmark must be visible');

          const skipLinks = page.locator('a[href^="#"]');
          assert.ok((await skipLinks.count()) >= 1, 'Skip-to-content anchor link must exist');
          const firstHref = await skipLinks.first().getAttribute('href');
          assert.ok(firstHref && firstHref.length > 1, `Skip link href must target an ID, got "${firstHref}"`);
          const targetId = firstHref.slice(1);
          assert.ok(
            (await page.locator(`[id="${targetId}"]`).count()) >= 1,
            `Skip link target #${targetId} must exist in DOM`
          );
          assertNoRuntimeErrors(tracker, 'T1-F01-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F01-02',
      tier: 1,
      feature: 'F01',
      name: 'Desktop primary navigation across 4 mandatory pages',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          const nav = page.locator('header nav, [role="navigation"]').first();
          const routes = ['/', '/explore', '/about', '/contact'];
          const seenH1 = new Set();

          for (const route of routes) {
            const link = nav.locator(`a[href="${route}"]`).first();
            assert.ok(await link.isVisible(), `Desktop nav link a[href="${route}"] must be visible`);
            await link.click();
            await page.waitForFunction(
              (expected) => window.location.pathname === expected,
              route,
              { timeout: 5000 }
            );
            const h1Text = normalizeText(await page.locator('main h1').first().textContent());
            assert.ok(h1Text.length > 0, `Route ${route} must render a non-empty <h1>`);
            seenH1.add(h1Text.toLowerCase());
          }
          assert.equal(seenH1.size, 4, 'All 4 mandatory pages must render distinct <h1> headings');
          assertNoRuntimeErrors(tracker, 'T1-F01-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F01-03',
      tier: 1,
      feature: 'F01',
      name: 'Mobile navigation drawer opens, routes cleanly, and closes (390x844)',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.mobile });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          const menuBtn = await findMobileMenuToggle(page);
          assert.ok(menuBtn, 'Mobile menu toggle button must be visible at 390x844');
          await menuBtn.click();
          await page.waitForTimeout(200);

          for (const route of ['/', '/explore', '/about', '/contact']) {
            const link = await findVisibleNavLink(page, route);
            assert.ok(link && (await link.isVisible()), `Opened mobile drawer must expose visible link ${route}`);
          }

          const exploreLink = await findVisibleNavLink(page, '/explore');
          assert.ok(exploreLink, 'Mobile drawer must expose visible /explore link');
          await exploreLink.click();
          await page.waitForFunction(() => window.location.pathname === '/explore', null, { timeout: 5000 });
          await page.waitForTimeout(200);

          const expandedAfter = await menuBtn.getAttribute('aria-expanded');
          if (expandedAfter !== null) {
            assert.equal(expandedAfter, 'false', 'Mobile drawer should close after navigation');
          }
          assertNoRuntimeErrors(tracker, 'T1-F01-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F01-04',
      tier: 1,
      feature: 'F01',
      name: 'Every dynamic /story/<slug> route renders',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          const lang = (await getHtmlLang(page)) || 'id';

          for (const story of stories) {
            await gotoRoute(page, baseUrl, `/story/${story.slug}`);
            const h1 = normalizeText(await page.locator('main h1').first().textContent());
            const expected = story.title[lang] || story.title.en || story.title.id;
            assert.ok(
              h1.toLowerCase().includes(expected.toLowerCase().slice(0, 12)),
              `Expected /story/${story.slug} h1 "${h1}" to match "${expected}"`
            );
          }
          assertNoRuntimeErrors(tracker, 'T1-F01-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F01-05',
      tier: 1,
      feature: 'F01',
      name: 'Active navigation state & persistent Footer across routes',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          const routes = ['/', '/explore', `/story/${slugs[0]}`, '/about', '/contact'];
          for (const route of routes) {
            await gotoRoute(page, baseUrl, route);
            const footer = page.locator('footer, [role="contentinfo"]').first();
            assert.ok(await footer.isVisible(), `Footer must remain visible on ${route}`);
            assert.ok(
              (await footer.locator('a[href^="/"]').count()) >= 1,
              `Footer must contain internal navigation links on ${route}`
            );

            if (!route.startsWith('/story/')) {
              const activeLink = page.locator(`header nav a[href="${route}"]`).first();
              const ariaCurrent = await activeLink.getAttribute('aria-current');
              const className = (await activeLink.getAttribute('class')) ?? '';
              assert.ok(
                ariaCurrent === 'page' || /active|current/i.test(className),
                `Active nav link for ${route} should indicate current route (aria-current="${ariaCurrent}", class="${className}")`
              );
            }
          }
          assertNoRuntimeErrors(tracker, 'T1-F01-05');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F01-06',
      tier: 1,
      feature: 'F01',
      name: 'Keyboard-only Tab traversal through header & nav',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          const reached = [];
          for (let i = 0; i < 10; i += 1) {
            await page.keyboard.press('Tab');
            const info = await page.evaluate(() => {
              const el = document.activeElement;
              if (!el || el === document.body) return null;
              const rect = el.getBoundingClientRect();
              return {
                tag: el.tagName.toLowerCase(),
                href: el.getAttribute('href') ?? '',
                text: (el.innerText || el.getAttribute('aria-label') || '').trim(),
                width: rect.width,
                height: rect.height,
              };
            });
            if (info) reached.push(info);
          }
          assert.ok(reached.length >= 4, 'Tab traversal must focus multiple header/nav controls');
          for (const item of reached) {
            assert.ok(item.width > 0 && item.height > 0, `Focused element "${item.text}" must have non-zero bounding box`);
          }
          assert.ok(
            reached.some((r) => r.href === '/explore' || /explore|jelajah/i.test(r.text)),
            'Tab traversal must reach Explore navigation link'
          );
          assertNoRuntimeErrors(tracker, 'T1-F01-06');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F02 (P0-2) — Bilingual Engine (id / en) (5 tests)
    // =========================================================================
    {
      id: 'T1-F02-01',
      tier: 1,
      feature: 'F02',
      name: "Fresh-context default language is 'id'",
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          const lang = await getHtmlLang(page);
          assert.equal(lang, 'id', `Expected fresh-context html[lang] to be 'id', got '${lang}'`);
          const navText = normalizeText(await page.locator('header nav, [role="navigation"]').first().innerText());
          assert.match(navText, /beranda|jelajah|tentang|kontak/i, `Expected Indonesian nav labels, got "${navText}"`);
          assertNoRuntimeErrors(tracker, 'T1-F02-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F02-02',
      tier: 1,
      feature: 'F02',
      name: 'Language toggle switches id -> en -> id and updates localStorage',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          await ensureLang(page, 'id');

          const afterEn = await toggleLanguage(page);
          assert.equal(afterEn, 'en', 'Toggling from id must switch html[lang] to en');
          const storedEn = await page.evaluate(() => localStorage.getItem('igee_lang'));
          assert.equal(storedEn, 'en', 'localStorage.igee_lang must update to "en"');

          const afterId = await toggleLanguage(page);
          assert.equal(afterId, 'id', 'Toggling again must restore html[lang] to id');
          const storedId = await page.evaluate(() => localStorage.getItem('igee_lang'));
          assert.equal(storedId, 'id', 'localStorage.igee_lang must update to "id"');
          assertNoRuntimeErrors(tracker, 'T1-F02-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F02-03',
      tier: 1,
      feature: 'F02',
      name: 'UI chrome & headings translate across core pages without reload',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          for (const route of ['/', '/explore', '/about', '/contact']) {
            await gotoRoute(page, baseUrl, route);
            await ensureLang(page, 'id');
            const navCountBefore = await page.evaluate(() => performance.getEntriesByType('navigation').length);
            const h1Id = normalizeText(await page.locator('main h1').first().innerText());
            const mainId = normalizeText(await page.locator('main').first().innerText());
            const navId = normalizeText(await page.locator('header nav').first().innerText());

            await toggleLanguage(page);
            const h1En = normalizeText(await page.locator('main h1').first().innerText());
            const mainEn = normalizeText(await page.locator('main').first().innerText());
            const navEn = normalizeText(await page.locator('header nav').first().innerText());
            const navCountAfter = await page.evaluate(() => performance.getEntriesByType('navigation').length);

            assert.equal(navCountAfter, navCountBefore, `Language switch on ${route} must not trigger full page reload`);
            if (route !== '/') {
              assert.notEqual(h1Id, h1En, `Expected <h1> on ${route} to translate between id and en`);
            }
            assert.notEqual(mainId, mainEn, `Expected <main> content on ${route} to translate between id and en`);
            assert.notEqual(navId, navEn, `Expected nav labels on ${route} to translate between id and en`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F02-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F02-04',
      tier: 1,
      feature: 'F02',
      name: 'Story Detail prose switches to exact id/en JSON text',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, `/story/${story.slug}`);
          await ensureLang(page, 'id');
          const h1Id = normalizeText(await page.locator('main h1').first().innerText());
          assert.ok(h1Id.includes(story.title.id), `Expected ID title "${story.title.id}", got "${h1Id}"`);

          await toggleLanguage(page);
          const h1En = normalizeText(await page.locator('main h1').first().innerText());
          assert.ok(h1En.includes(story.title.en), `Expected EN title "${story.title.en}", got "${h1En}"`);
          assertNoRuntimeErrors(tracker, 'T1-F02-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F02-05',
      tier: 1,
      feature: 'F02',
      name: 'Selected language persists across navigation and page.reload()',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          await ensureLang(page, 'en');

          await page.locator('header nav a[href="/about"]').first().click();
          await page.waitForFunction(() => window.location.pathname === '/about', null, { timeout: 5000 });
          assert.equal(await getHtmlLang(page), 'en', 'Language must persist across client navigation');

          await page.reload({ waitUntil: 'load' });
          await page.locator('main').first().waitFor({ state: 'visible', timeout: 10000 });
          assert.equal(await getHtmlLang(page), 'en', 'Language must persist across page.reload()');
          assertNoRuntimeErrors(tracker, 'T1-F02-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F03 (P0-9) — Dark Scientific Editorial Design System (5 tests)
    // =========================================================================
    {
      id: 'T1-F03-01',
      tier: 1,
      feature: 'F03',
      name: 'Dark navy/charcoal editorial background & light foreground luminance',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const metrics = await measureContrastAndLuminance(tracker.page);
          assert.ok(
            metrics.bodyBgLum < 0.15,
            `Expected dark editorial background luminance < 0.15, got ${metrics.bodyBgLum.toFixed(4)}`
          );
          assert.ok(
            metrics.bodyFgLum > 0.5,
            `Expected light foreground text luminance > 0.50, got ${metrics.bodyFgLum.toFixed(4)}`
          );
          assertNoRuntimeErrors(tracker, 'T1-F03-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F03-02',
      tier: 1,
      feature: 'F03',
      name: 'WCAG AA contrast across headings, body & nav links',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const routes = ['/', '/explore', `/story/${slugs[0]}`, '/about', '/contact'];
          for (const route of routes) {
            await gotoRoute(tracker.page, baseUrl, route);
            const { samples } = await measureContrastAndLuminance(tracker.page);
            assert.ok(samples.length >= 3, `Expected visible text samples on ${route}`);
            for (const s of samples) {
              assert.ok(
                s.ratio >= s.minRequired,
                `[${route}] Low WCAG contrast on <${s.tag}> "${s.text}": ${s.ratio.toFixed(2)} < ${s.minRequired}`
              );
            }
          }
          assertNoRuntimeErrors(tracker, 'T1-F03-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F03-03',
      tier: 1,
      feature: 'F03',
      name: 'Responsive zero horizontal overflow across desktop, tablet, mobile (390x844)',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const routes = ['/', '/explore', `/story/${slugs[0]}`, '/about', '/contact'];
        for (const [vpName, viewport] of [
          ['desktop', VIEWPORTS.desktop],
          ['tablet', VIEWPORTS.tablet],
          ['mobile', VIEWPORTS.mobile],
        ]) {
          const tracker = await createTrackedPage(browser, { viewport });
          try {
            for (const route of routes) {
              await gotoRoute(tracker.page, baseUrl, route);
              await assertNoHorizontalOverflow(tracker.page, viewport.width, `${vpName} ${route}`);
            }
            assertNoRuntimeErrors(tracker, `T1-F03-03-${vpName}`);
          } finally {
            await tracker.close();
          }
        }
      },
    },
    {
      id: 'T1-F03-04',
      tier: 1,
      feature: 'F03',
      name: 'Editorial typographic scale (h1 > h2 >= p >= 14px)',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const sizes = await tracker.page.evaluate(() => {
            const getSize = (sel) => {
              const el = document.querySelector(sel);
              return el ? parseFloat(window.getComputedStyle(el).fontSize) : null;
            };
            return {
              h1: getSize('main h1'),
              h2: getSize('main h2'),
              p: getSize('main p'),
            };
          });
          assert.ok(sizes.h1 && sizes.p, 'Main h1 and p must exist');
          assert.ok(sizes.p >= 14, `Body paragraph font-size must be >= 14px, got ${sizes.p}`);
          if (sizes.h2) {
            assert.ok(sizes.h1 > sizes.h2, `Expected h1 (${sizes.h1}px) > h2 (${sizes.h2}px)`);
            assert.ok(sizes.h2 >= sizes.p, `Expected h2 (${sizes.h2}px) >= p (${sizes.p}px)`);
          } else {
            assert.ok(sizes.h1 > sizes.p, `Expected h1 (${sizes.h1}px) > p (${sizes.p}px)`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F03-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F03-05',
      tier: 1,
      feature: 'F03',
      name: 'prefers-reduced-motion: reduce compatibility',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, {
          viewport: VIEWPORTS.desktop,
          reducedMotion: 'reduce',
        });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const opacities = await tracker.page.evaluate(() =>
            [...document.querySelectorAll('main section, main h1, footer')].map((el) => ({
              tag: el.tagName,
              opacity: parseFloat(window.getComputedStyle(el).opacity),
            }))
          );
          assert.ok(opacities.length >= 2, 'Expected main sections and h1');
          for (const item of opacities) {
            assert.ok(item.opacity > 0.9, `Element <${item.tag}> hidden under reduced-motion: opacity=${item.opacity}`);
          }
          await toggleLanguage(tracker.page);
          assertNoRuntimeErrors(tracker, 'T1-F03-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F04 (P0-3) — Local Story Dataset & Integrity Layer (5 tests)
    // =========================================================================
    {
      id: 'T1-F04-01',
      tier: 1,
      feature: 'F04',
      name: 'stories.json contract count (3–5) reflected in /explore UI',
      async run({ browser, baseUrl }) {
        const { stories, slugs } = loadStoriesContract();
        assert.ok(stories.length >= 3 && stories.length <= 5, `Expected 3–5 stories, got ${stories.length}`);
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const hrefs = await getDirectoryStoryHrefs(tracker.page);
          for (const slug of slugs) {
            assert.ok(hrefs.includes(`/story/${slug}`), `Explore page missing directory link to /story/${slug}`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F04-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F04-02',
      tier: 1,
      feature: 'F04',
      name: 'Bilingual completeness in stories.json & rendered UI',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        for (const s of stories) {
          assert.ok(s.title?.id?.trim() && s.title?.en?.trim(), `Missing bilingual title on ${s.slug}`);
          assert.ok(s.subtitle?.id?.trim() && s.subtitle?.en?.trim(), `Missing bilingual subtitle on ${s.slug}`);
          assert.ok(s.summary?.id?.trim() && s.summary?.en?.trim(), `Missing bilingual summary on ${s.slug}`);
          assert.ok(
            s.location?.name?.id?.trim() && s.location?.name?.en?.trim(),
            `Missing bilingual location.name on ${s.slug}`
          );
        }
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const text = normalizeText(await tracker.page.locator('main').innerText());
            for (const s of stories) {
              assert.ok(
                text.toLowerCase().includes(s.title[lang].toLowerCase()),
                `Explore (${lang}) missing story title "${s.title[lang]}"`
              );
            }
          }
          assertNoRuntimeErrors(tracker, 'T1-F04-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F04-03',
      tier: 1,
      feature: 'F04',
      name: 'Locally cached images in public/images/ load in browser',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        for (const s of stories) {
          assert.ok(s.heroImage?.src?.startsWith('/images/'), `${s.slug} heroImage.src must start with /images/`);
          assert.ok(publicImageExists(s.heroImage.src), `Local image file missing on disk: public${s.heroImage.src}`);
        }
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const route of ['/', '/explore', ...stories.map((s) => `/story/${s.slug}`)]) {
            await gotoRoute(tracker.page, baseUrl, route);
            await assertAllVisibleImagesLoaded(tracker.page, `T1-F04-03 ${route}`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F04-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F04-04',
      tier: 1,
      feature: 'F04',
      name: 'Epistemic status distinction visible in Story Detail',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        const badgeLabelRegex =
          /\b(fakta\s+terukur|measurable\s+fact|estimasi\s+ilmiah|scientific\s+estimate|interpretasi\s+kausal|causal\s+interpretation|ketidakpastian\s*(&|dan)\s*batasan|uncertainty\s*(&|and)\s*limitations)\b/gi;
        try {
          for (const slug of slugs) {
            await gotoRoute(tracker.page, baseUrl, `/story/${slug}`);
            const lang = (await getHtmlLang(tracker.page)) || 'id';
            const mainText = normalizeText(await tracker.page.locator('main').innerText());
            const matches = mainText.match(badgeLabelRegex) ?? [];
            assert.ok(
              matches.length >= 2,
              `Story /story/${slug} must render >=2 visible epistemic status labels (got ${matches.length})`
            );
            assert.match(
              mainText,
              epistemicRegexForLang(lang),
              `Story /story/${slug} epistemic labels must match active lang "${lang}"`
            );
          }
          assertNoRuntimeErrors(tracker, 'T1-F04-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F04-05',
      tier: 1,
      feature: 'F04',
      name: 'Connected story graph & sources contract completeness',
      async run() {
        const { stories, slugs } = loadStoriesContract();
        for (const s of stories) {
          assert.ok(Array.isArray(s.sources) && s.sources.length >= 1, `${s.slug} must have >=1 source`);
          assert.ok(Array.isArray(s.relatedStories) && s.relatedStories.length >= 1, `${s.slug} must have >=1 related story`);
          for (const rel of s.relatedStories) {
            assert.ok(slugs.includes(rel.targetSlug), `${s.slug} points to unknown targetSlug "${rel.targetSlug}"`);
            assert.ok(ALLOWED_RELATIONS.includes(rel.relationType), `${s.slug} uses invalid relationType "${rel.relationType}"`);
          }
        }
      },
    },

    // =========================================================================
    // F05 (P0-4) — Home Page (/) (6 tests)
    // =========================================================================
    {
      id: 'T1-F05-01',
      tier: 1,
      feature: 'F05',
      name: 'Home Hero section with title, mission, CTA & Earth visual',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          const h1Text = normalizeText(await page.locator('main h1').first().innerText());
          assert.ok(h1Text.length >= 8, `Expected informative hero <h1>, got "${h1Text}"`);
          const cta = page.locator('main a[href="/explore"], main a[href^="/explore"]').first();
          assert.ok(await cta.isVisible(), 'Hero must provide CTA link to /explore');

          const hasEarthVisual = await page.evaluate(() => {
            const visuals = [...document.querySelectorAll('main svg, main img')];
            return visuals.some((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 100 && r.height > 100;
            });
          });
          assert.ok(hasEarthVisual, 'Home must display an Earth <svg> or <img> visual (>100x100)');
          assertNoRuntimeErrors(tracker, 'T1-F05-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F05-02',
      tier: 1,
      feature: 'F05',
      name: 'Featured Environmental Stories section links to story detail',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const featured = stories.filter((s) => s.featured);
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          const featuredHeading = page
            .locator('main h2, main h3')
            .filter({ hasText: /cerita\s+(pilihan|unggulan)|kisah\s+(pilihan|unggulan)|unggulan|featured/i })
            .first();
          assert.ok(await featuredHeading.isVisible(), 'Featured Environmental Stories heading must be visible');

          const featuredSection = featuredHeading.locator('xpath=ancestor::section[1]');
          const storyLinks = featuredSection.locator('a[href^="/story/"]');
          assert.ok((await storyLinks.count()) >= Math.min(2, featured.length), 'Featured story links must appear in Featured section on /');
          const targetHref = await storyLinks.first().getAttribute('href');
          await storyLinks.first().click();
          await page.waitForFunction((h) => window.location.pathname === h, targetHref, { timeout: 5000 });
          assert.ok(await page.locator('main h1').first().isVisible(), 'Clicked featured story must render detail <h1>');
          assertNoRuntimeErrors(tracker, 'T1-F05-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F05-03',
      tier: 1,
      feature: 'F05',
      name: 'Explore by Category section links to filtered Explore',
      async run({ browser, baseUrl }) {
        const { categories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          const catHeading = page.locator('main h2, main h3').filter({ hasText: /kategori|category/i }).first();
          assert.ok(await catHeading.isVisible(), 'Explore by Category heading must be visible on /');

          const catLinks = page.locator('main a[href*="/explore"][href*="category="]');
          assert.ok((await catLinks.count()) >= Math.min(2, categories.length), 'Home must link categories to /explore?category=...');
          await catLinks.first().click();
          await page.waitForFunction(() => window.location.pathname === '/explore', null, { timeout: 5000 });
          assert.ok(new URL(page.url()).searchParams.get('category'), 'Clicking category link must set category query param');
          assertNoRuntimeErrors(tracker, 'T1-F05-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F05-04',
      tier: 1,
      feature: 'F05',
      name: 'Explore by Location section links to filtered location/story',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          const locHeading = page.locator('main h2, main h3').filter({ hasText: /lokasi|wilayah|location|region/i }).first();
          assert.ok(await locHeading.isVisible(), 'Explore by Location heading must be visible on /');

          const locSection = locHeading.locator('xpath=ancestor::section[1]');
          const locLinks = locSection.locator('a[href*="region="], a[href*="location="], a[href^="/story/"]');
          assert.ok((await locLinks.count()) >= 1, 'Explore by Location section must contain >=1 location/story link');
          await locLinks.first().click();
          await page.waitForFunction(
            () => window.location.pathname === '/explore' || window.location.pathname.startsWith('/story/'),
            null,
            { timeout: 5000 }
          );
          if (new URL(page.url()).pathname === '/explore') {
            const params = new URL(page.url()).searchParams;
            assert.ok(params.has('region') || params.has('location'), 'Location link must navigate to filtered /explore');
          }
          assertNoRuntimeErrors(tracker, 'T1-F05-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F05-05',
      tier: 1,
      feature: 'F05',
      name: 'Connected Stories preview section displays allowed relation verbs',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          const connHeading = page
            .locator('main h2, main h3')
            .filter({ hasText: /(cerita|kisah)\s+(terhubung|terkait)|koneksi|connected\s+stories|keterhubungan/i })
            .first();
          assert.ok(await connHeading.isVisible(), 'Connected Stories preview heading must be visible on /');

          const sectionText = await connHeading.locator('xpath=ancestor::section[1]').innerText();
          assert.match(sectionText, RELATION_BILINGUAL_REGEX, 'Connected Stories section must show allowed relationship verbs');
          assertNoRuntimeErrors(tracker, 'T1-F05-05');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F05-06',
      tier: 1,
      feature: 'F05',
      name: 'About This Project preview section links to /about',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const { page } = tracker;
          const aboutHeading = page
            .locator('main h2, main h3')
            .filter({ hasText: /tentang\s+proyek|tentang\s+eksplorer|about\s+this\s+project|tentang/i })
            .first();
          assert.ok(await aboutHeading.isVisible(), 'About This Project preview heading must be visible on /');
          const aboutLink = page.locator('main a[href="/about"]').first();
          assert.ok(await aboutLink.isVisible(), 'Home must include link to /about inside main');
          await aboutLink.click();
          await page.waitForFunction(() => window.location.pathname === '/about', null, { timeout: 5000 });
          assertNoRuntimeErrors(tracker, 'T1-F05-06');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F06 (P0-5) — Explore / Stories Directory (/explore) (5 tests)
    // =========================================================================
    {
      id: 'T1-F06-01',
      tier: 1,
      feature: 'F06',
      name: 'Explore lists all dataset stories',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const hrefs = await getDirectoryStoryHrefs(tracker.page);
          for (const slug of slugs) {
            assert.ok(hrefs.includes(`/story/${slug}`), `/explore missing /story/${slug}`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F06-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F06-02',
      tier: 1,
      feature: 'F06',
      name: 'Story cards show title, summary, category, location & valid image',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const lang = (await getHtmlLang(tracker.page)) || 'id';
          const mainText = normalizeText(await tracker.page.locator('main').innerText());
          for (const s of stories) {
            assert.ok(mainText.includes(s.title[lang]), `Explore missing title for ${s.slug}`);
            assert.ok(
              mainText.includes(s.summary[lang].slice(0, 32)),
              `Explore missing summary snippet for ${s.slug}`
            );
            assert.ok(
              mainText.includes(s.location.name[lang]) || regionRegexForKey(s.region).test(mainText),
              `Explore missing location/region indicator for ${s.slug}`
            );
            assert.match(mainText, categoryRegexForKey(s.category), `Explore missing category label for ${s.slug}`);
          }
          const imgs = await assertAllVisibleImagesLoaded(tracker.page, 'T1-F06-02');
          assert.ok(imgs.length >= stories.length, 'Expected story card images on /explore');
          for (const img of imgs) {
            assert.ok(img.alt.trim().length > 0, `Image ${img.src} must have non-empty alt attribute`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F06-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F06-03',
      tier: 1,
      feature: 'F06',
      name: 'Story connection counts displayed consistently on /explore',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const mainText = normalizeText(await tracker.page.locator('main').innerText());
          assert.match(
            mainText,
            /\d+\s*(?:cerita|kisah)?\s*(koneksi|terhubung|terkait|keterkaitan|connections?|related|links?)/i,
            'Expected story connection count indicator on /explore'
          );
          assertNoRuntimeErrors(tracker, 'T1-F06-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F06-04',
      tier: 1,
      feature: 'F06',
      name: 'URL query ?category=<validCategory> pre-filters directory',
      async run({ browser, baseUrl }) {
        const { stories, categories } = loadStoriesContract();
        const targetCategory = categories[0];
        const expectedSlugs = stories.filter((s) => s.category === targetCategory).map((s) => `/story/${s.slug}`);
        const excludedSlugs = stories.filter((s) => s.category !== targetCategory).map((s) => `/story/${s.slug}`);

        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/explore?category=${encodeURIComponent(targetCategory)}`);
          const cardHrefs = await getDirectoryStoryHrefs(tracker.page);
          for (const href of expectedSlugs) {
            assert.ok(cardHrefs.includes(href), `Filtered /explore?category=${targetCategory} missing ${href}`);
          }
          for (const href of excludedSlugs) {
            assert.ok(!cardHrefs.includes(href), `Filtered /explore?category=${targetCategory} failed to exclude ${href}`);
          }
          if (excludedSlugs.length > 0) {
            assert.ok(cardHrefs.length < stories.length, 'Category filter must strictly narrow directory');
          }
          assertNoRuntimeErrors(tracker, 'T1-F06-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F06-05',
      tier: 1,
      feature: 'F06',
      name: 'URL query ?region=<validRegion> pre-filters directory',
      async run({ browser, baseUrl }) {
        const { stories, regions } = loadStoriesContract();
        const targetRegion = regions[0];
        const expectedSlugs = stories.filter((s) => s.region === targetRegion).map((s) => `/story/${s.slug}`);
        const excludedSlugs = stories.filter((s) => s.region !== targetRegion).map((s) => `/story/${s.slug}`);

        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/explore?region=${encodeURIComponent(targetRegion)}`);
          const hrefs = await getDirectoryStoryHrefs(tracker.page);
          assert.equal(hrefs.length, expectedSlugs.length, `Expected ${expectedSlugs.length} stories for region=${targetRegion}, got ${hrefs.length}`);
          for (const href of expectedSlugs) {
            assert.ok(hrefs.includes(href), `Filtered /explore?region=${targetRegion} missing ${href}`);
          }
          for (const href of excludedSlugs) {
            assert.ok(!hrefs.includes(href), `Filtered /explore?region=${targetRegion} failed to exclude ${href}`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F06-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F07 (P1-1..P1-3) — Explore Filters, Search & Interactive 2D SVG Map (6 tests)
    // =========================================================================
    {
      id: 'T1-F07-01',
      tier: 1,
      feature: 'F07',
      name: 'Category filter chips filter and "All" restores',
      async run({ browser, baseUrl }) {
        const { stories, categories } = loadStoriesContract();
        const cat = categories[0];
        const catRegex = categoryRegexForKey(cat);
        const expectedSlugs = stories.filter((s) => s.category === cat).map((s) => `/story/${s.slug}`);
        const excludedSlugs = stories.filter((s) => s.category !== cat).map((s) => `/story/${s.slug}`);
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const { page } = tracker;
          const controls = await getExploreFilterControls(page);
          const catBtn = controls.filter({ hasText: catRegex }).first();
          assert.ok(await catBtn.isVisible(), `Category filter chip matching ${cat} must be visible`);
          await catBtn.click();
          await page.waitForTimeout(150);

          const filtered = await getDirectoryStoryHrefs(page);
          for (const href of expectedSlugs) {
            assert.ok(filtered.includes(href), `Category filter ${cat} missing ${href}`);
          }
          for (const href of excludedSlugs) {
            assert.ok(!filtered.includes(href), `Category filter ${cat} failed to exclude ${href}`);
          }
          assert.ok(filtered.length < stories.length, 'Category chip must narrow visible directory stories');

          const resetBtn = findExploreResetButton(page).first();
          const allBtn = controls.filter({ hasText: /\b(semua|all)\b/i }).first();
          if ((await allBtn.count()) > 0 && (await allBtn.isVisible())) {
            await allBtn.click();
          } else {
            assert.ok(await resetBtn.isVisible(), 'All/Semua or Reset button must be visible');
            await resetBtn.click();
          }
          await page.waitForTimeout(150);

          const restored = await getDirectoryStoryHrefs(page);
          assert.equal(restored.length, stories.length, 'Clicking All/Reset must restore all directory stories');
          assertNoRuntimeErrors(tracker, 'T1-F07-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F07-02',
      tier: 1,
      feature: 'F07',
      name: 'Location/Region filter controls filter and reset',
      async run({ browser, baseUrl }) {
        const { stories, regions } = loadStoriesContract();
        const targetRegion = regions.find((r) => stories.filter((s) => s.region === r).length < stories.length) ?? regions[0];
        const expectedSlugs = stories.filter((s) => s.region === targetRegion).map((s) => `/story/${s.slug}`);
        const excludedSlugs = stories.filter((s) => s.region !== targetRegion).map((s) => `/story/${s.slug}`);
        const regRegex = regionRegexForKey(targetRegion);
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const { page } = tracker;
          const controls = await getExploreFilterControls(page);
          const select = page.locator('main select').first();
          const chip = controls.filter({ hasText: regRegex }).first();

          if ((await chip.count()) > 0 && (await chip.isVisible())) {
            await chip.click();
          } else if ((await select.count()) > 0 && (await select.isVisible())) {
            await select.selectOption({ value: targetRegion });
          } else {
            assert.fail(`No visible region filter control found for ${targetRegion}`);
          }
          await page.waitForTimeout(150);

          const filtered = await getDirectoryStoryHrefs(page);
          for (const href of expectedSlugs) {
            assert.ok(filtered.includes(href), `Region filter ${targetRegion} missing ${href}`);
          }
          for (const href of excludedSlugs) {
            assert.ok(!filtered.includes(href), `Region filter ${targetRegion} failed to exclude ${href}`);
          }
          if (excludedSlugs.length > 0) {
            assert.ok(filtered.length < stories.length, 'Region filter must narrow visible directory stories');
          }

          const dedicatedReset = findExploreResetButton(page);
          const allBtns = controls.filter({ hasText: /\b(semua|all|reset)\b/i });
          if ((await dedicatedReset.count()) > 0 && (await dedicatedReset.first().isVisible())) {
            await dedicatedReset.first().click();
          } else if ((await allBtns.count()) > 0) {
            await allBtns.last().click();
          } else if ((await select.count()) > 0) {
            await select.selectOption({ index: 0 });
          }
          await page.waitForTimeout(150);
          const restored = await getDirectoryStoryHrefs(page);
          assert.equal(restored.length, stories.length, 'Resetting region filter must restore all directory stories');
          assertNoRuntimeErrors(tracker, 'T1-F07-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F07-03',
      tier: 1,
      feature: 'F07',
      name: 'Bilingual keyword search filters stories accurately',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const { page } = tracker;
          const searchInput = page
            .locator('main input[type="search"], main [role="searchbox"], main input[placeholder*="cari" i], main input[placeholder*="search" i]')
            .first();
          assert.ok(await searchInput.isVisible(), 'Search input must be visible on /explore');

          await ensureLang(page, 'id');
          await searchInput.fill('harimau');
          await page.waitForTimeout(150);
          const idMatches = await getDirectoryStoryHrefs(page);
          assert.ok(idMatches.includes('/story/sumatran-tiger-conservation'), 'Indonesian search "harimau" must match Sumatran tiger story');
          assert.ok(idMatches.length < stories.length, 'Indonesian search must narrow total directory results');

          await searchInput.fill('');
          await page.waitForTimeout(150);

          await ensureLang(page, 'en');
          await searchInput.fill('tiger');
          await page.waitForTimeout(150);
          const enMatches = await getDirectoryStoryHrefs(page);
          assert.ok(enMatches.includes('/story/sumatran-tiger-conservation'), 'English search "tiger" must match Sumatran tiger story');
          assert.ok(enMatches.length < stories.length, 'English search must narrow total directory results');

          await searchInput.fill('');
          await page.waitForTimeout(150);
          const restored = await getDirectoryStoryHrefs(page);
          assert.equal(restored.length, stories.length, 'Clearing search must restore all directory stories');
          assertNoRuntimeErrors(tracker, 'T1-F07-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F07-04',
      tier: 1,
      feature: 'F07',
      name: 'Interactive 2D SVG Earth/Archipelago Map renders story markers',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          let mapInfo = await getInteractiveMapInfo(tracker.page);
          if (!mapInfo || mapInfo.markerCount < stories.length) {
            await gotoRoute(tracker.page, baseUrl, '/explore');
            mapInfo = await getInteractiveMapInfo(tracker.page);
          }
          assert.ok(mapInfo, 'Interactive 2D SVG map with clickable markers must be present on / or /explore');
          assert.ok(mapInfo.box.width > 180 && mapInfo.box.height > 120, 'Map SVG must have meaningful dimensions');
          assert.ok(
            mapInfo.markerCount >= stories.length,
            `Expected >= ${stories.length} interactive map markers, found ${mapInfo.markerCount}`
          );
          assertNoRuntimeErrors(tracker, 'T1-F07-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F07-05',
      tier: 1,
      feature: 'F07',
      name: 'Activating a map marker previews story & links to detail',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          let mapInfo = await getInteractiveMapInfo(tracker.page);
          if (!mapInfo || mapInfo.markerCount < stories.length) {
            await gotoRoute(tracker.page, baseUrl, '/explore');
            mapInfo = await getInteractiveMapInfo(tracker.page);
          }
          assert.ok(mapInfo, 'Interactive map must exist');
          await mapInfo.markers.first().click();
          await tracker.page.waitForTimeout(200);

          const previewLink = await getMapPreviewCtaLink(mapInfo);
          assert.ok(await previewLink.isVisible(), 'Activating map marker must reveal preview link to /story/<slug>');
          const targetHref = await previewLink.getAttribute('href');
          await previewLink.click();
          await tracker.page.waitForFunction((h) => window.location.pathname === h, targetHref, { timeout: 5000 });
          assertNoRuntimeErrors(tracker, 'T1-F07-05');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F07-06',
      tier: 1,
      feature: 'F07',
      name: 'Filter selection syncs with URL query parameters',
      async run({ browser, baseUrl }) {
        const { stories, categories } = loadStoriesContract();
        const cat = categories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const { page } = tracker;
          const controls = await getExploreFilterControls(page);
          const catBtn = controls.filter({ hasText: categoryRegexForKey(cat) }).first();
          await catBtn.click();
          await page.waitForTimeout(200);

          const urlObj = new URL(page.url());
          assert.ok(
            urlObj.searchParams.has('category'),
            `Expected URL query to sync category param, got ${page.url()}`
          );
          const beforeHrefs = await getDirectoryStoryHrefs(page);
          assert.ok(beforeHrefs.length < stories.length, 'Category selection must narrow directory before reload');
          await page.reload({ waitUntil: 'load' });
          await page.locator('main').first().waitFor({ state: 'visible', timeout: 10000 });
          const afterHrefs = await getDirectoryStoryHrefs(page);
          assert.deepEqual(afterHrefs.sort(), beforeHrefs.sort(), 'Reloading filtered URL must preserve exact filtered stories');
          assertNoRuntimeErrors(tracker, 'T1-F07-06');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F08 (P0-6) — Dynamic Story Detail Page (/story/:slug) (6 tests)
    // =========================================================================
    {
      id: 'T1-F08-01',
      tier: 1,
      feature: 'F08',
      name: 'Story Detail Hero, metadata, key metric & image attribution',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
          const { page } = tracker;
          const lang = (await getHtmlLang(page)) || 'id';
          const mainText = normalizeText(await page.locator('main').innerText());

          assert.ok(mainText.includes(story.title[lang]), 'Story detail must display story title');
          assert.ok(mainText.includes(story.keyMetric.value), `Story detail must display keyMetric.value "${story.keyMetric.value}"`);
          assert.ok(
            mainText.includes(story.heroImage.author) || mainText.includes(story.heroImage.license),
            'Story detail must display heroImage author/license attribution'
          );
          await assertAllVisibleImagesLoaded(page, 'T1-F08-01');
          assertNoRuntimeErrors(tracker, 'T1-F08-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F08-02',
      tier: 1,
      feature: 'F08',
      name: 'All 5 core non-linear narrative sections render in id and en',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories[0];
        const sectionRegexes = [
          /pendahuluan|pengantar|introduction/i,
          /lokasi|tempat|wilayah|the\s+place|place/i,
          /apa\s+yang\s+terjadi|kondisi|situasi|perubahan|what\s+is\s+happening/i,
          /penyebab|pemicu|faktor|pendorong|causes|drivers/i,
          /dampak|konsekuensi|impacts/i,
        ];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const headingsText = (
              await tracker.page.locator('main h2, main h3').allInnerTexts()
            ).join(' | ');
            for (const rx of sectionRegexes) {
              assert.match(headingsText, rx, `Story Detail (${lang}) missing section heading matching ${rx}`);
            }
          }
          assertNoRuntimeErrors(tracker, 'T1-F08-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F08-03',
      tier: 1,
      feature: 'F08',
      name: 'Scientific Limitations / Uncertainty section renders',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
          await ensureLang(tracker.page, 'en');
          const headings = tracker.page.locator('main h2, main h3').filter({
            hasText: /keterbatasan|ketidakpastian|limitations|uncertainty/i,
          });
          assert.ok((await headings.count()) >= 1, 'Limitations section heading must render');
          const mainText = normalizeText(await tracker.page.locator('main').innerText());
          assert.ok(
            mainText.includes(story.sections.limitations.en.slice(0, 24)),
            'Limitations prose from stories.json must render'
          );
          assertNoRuntimeErrors(tracker, 'T1-F08-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F08-04',
      tier: 1,
      feature: 'F08',
      name: 'Claim-level inline citations appear near claims',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
          const citationEvidence = await tracker.page.evaluate((sources) => {
            const main = document.querySelector('main');
            if (!main) return { ok: false, sectionsWithCitations: 0, totalMarkers: 0 };
            const nonNarrativeHeadingRx =
              /bukti|sumber|referensi|evidence|sources|grafik|chart|visualisasi|(cerita|kisah)\s+(terkait|terhubung)|related|connected/i;
            const narrativeSections = [...main.querySelectorAll('section')].filter((sec) => {
              const heading = sec.querySelector('h2, h3')?.textContent ?? '';
              if (nonNarrativeHeadingRx.test(heading)) return false;
              if (sec.querySelector('figure')) return false;
              const hasLargeChartSvg = [...sec.querySelectorAll('svg')].some(
                (svg) => svg.getBoundingClientRect().width > 120
              );
              if (hasLargeChartSvg) return false;
              return true;
            });

            const citationSelector =
              'a[href^="#source"], a[href^="#evidence"], sup, cite, [data-source-id], button[aria-label*="source" i], button[aria-label*="sumber" i]';

            const countTextCitations = (root) => {
              let hits = 0;
              const proseEls = [...root.querySelectorAll('p, li')];
              for (const el of proseEls) {
                const txt = el.innerText ?? '';
                const matched = sources.some((src) => {
                  if (txt.includes(`[${src.id}]`)) return true;
                  if (txt.includes(src.authorOrInstitution)) return true;
                  const surname = src.authorOrInstitution.split(',')[0].trim();
                  return Boolean(
                    src.year &&
                      surname.length >= 3 &&
                      txt.includes(surname) &&
                      txt.includes(String(src.year).split(/[/–-]/)[0].trim())
                  );
                });
                if (matched) hits += 1;
              }
              return hits;
            };

            if (narrativeSections.length >= 2) {
              let sectionsWithCitations = 0;
              let totalMarkers = 0;
              for (const sec of narrativeSections) {
                const domCount = sec.querySelectorAll(citationSelector).length;
                const textCount = countTextCitations(sec);
                const count = domCount + textCount;
                if (count > 0) {
                  sectionsWithCitations += 1;
                  totalMarkers += count;
                }
              }
              return {
                ok: sectionsWithCitations >= 2,
                sectionsWithCitations,
                totalMarkers,
              };
            }

            const scope = narrativeSections[0] ?? main;
            const domMarkers = scope.querySelectorAll(citationSelector).length;
            const textMarkers = countTextCitations(scope);
            const totalMarkers = domMarkers + textMarkers;
            return {
              ok: totalMarkers >= 2,
              sectionsWithCitations: totalMarkers > 0 ? 1 : 0,
              totalMarkers,
            };
          }, story.sources);
          assert.ok(
            citationEvidence.ok,
            `Story Detail must render claim-level inline citations across >= 2 narrative sections (got sections=${citationEvidence.sectionsWithCitations}, markers=${citationEvidence.totalMarkers})`
          );
          assertNoRuntimeErrors(tracker, 'T1-F08-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F08-05',
      tier: 1,
      feature: 'F08',
      name: 'Evidence & Sources section lists complete verified references',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
          const evHeading = tracker.page
            .locator('main h2, main h3')
            .filter({ hasText: /bukti|sumber|referensi|evidence|sources/i })
            .first();
          assert.ok(await evHeading.isVisible(), 'Evidence & Sources heading must be visible');

          const evSection = evHeading.locator('xpath=ancestor::section[1]');
          const evText = normalizeText(await evSection.innerText());
          for (const src of story.sources) {
            assert.ok(evText.includes(src.title), `Missing source title "${src.title}" in Evidence & Sources`);
            assert.ok(
              evText.includes(src.authorOrInstitution),
              `Missing author/institution "${src.authorOrInstitution}" in Evidence & Sources`
            );
          }
          const extLinks = evSection.locator('a[href^="http"]');
          assert.ok((await extLinks.count()) >= story.sources.length, 'Expected external URL/DOI links in Evidence & Sources');
          assertNoRuntimeErrors(tracker, 'T1-F08-05');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F08-06',
      tier: 1,
      feature: 'F08',
      name: 'Related Stories section renders verbs, rationale & links',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories[0];
        const firstTarget = story.relatedStories[0].targetSlug;
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
          const relHeading = tracker.page
            .locator('main h2, main h3')
            .filter({ hasText: /(cerita|kisah)\s+(terkait|terhubung)|related\s+stories|connected/i })
            .first();
          assert.ok(await relHeading.isVisible(), 'Related Stories heading must be visible');

          const relSection = relHeading.locator('xpath=ancestor::section[1]');
          const relText = normalizeText(await relSection.innerText());
          assert.match(relText, RELATION_BILINGUAL_REGEX, 'Related Stories must display relationship verb');

          const targetLink = relSection.locator(`a[href="/story/${firstTarget}"]`).first();
          assert.ok(await targetLink.isVisible(), `Missing related story link to /story/${firstTarget}`);
          await targetLink.click();
          await tracker.page.waitForFunction(
            (slug) => window.location.pathname === `/story/${slug}`,
            firstTarget,
            { timeout: 5000 }
          );
          assertNoRuntimeErrors(tracker, 'T1-F08-06');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F09 (P1-4..P1-5) — Timeline, Relationship Strip & SVG Charts (5 tests)
    // =========================================================================
    {
      id: 'T1-F09-01',
      tier: 1,
      feature: 'F09',
      name: 'Verifiable Timeline renders dated events in /story/:slug',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
          const lang = (await getHtmlLang(tracker.page)) || 'id';
          const tlHeading = tracker.page
            .locator('main h2, main h3')
            .filter({ hasText: /linimasa|lini\s+masa|timeline|kronologi/i })
            .first();
          assert.ok(await tlHeading.isVisible(), 'Timeline section heading must be visible');
          const tlSectionText = normalizeText(await tlHeading.locator('xpath=ancestor::section[1]').innerText());
          for (const item of story.timeline) {
            assert.ok(tlSectionText.includes(item.date), `Timeline missing date "${item.date}"`);
            assert.ok(tlSectionText.includes(item.title[lang]), `Timeline missing title "${item.title[lang]}"`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F09-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F09-02',
      tier: 1,
      feature: 'F09',
      name: 'Timeline interactive inspection & bilingual update',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
          const tlSection = tracker.page
            .locator('main h2, main h3')
            .filter({ hasText: /linimasa|lini\s+masa|timeline|kronologi/i })
            .first()
            .locator('xpath=ancestor::section[1]');

          const buttons = tlSection.locator('button');
          const btnCount = await buttons.count();
          if (btnCount >= 2 && (await buttons.nth(1).isVisible())) {
            const beforeClick = normalizeText(await tlSection.innerText());
            await buttons.nth(1).click();
            await tracker.page.waitForTimeout(100);
            const afterSecond = normalizeText(await tlSection.innerText());
            assert.ok(
              afterSecond.includes(story.timeline[1].detail.id) ||
                afterSecond.includes(story.timeline[1].detail.en) ||
                afterSecond !== beforeClick,
              'Clicking second timeline item must update active detail'
            );
            await buttons.first().click();
            await tracker.page.waitForTimeout(100);
          } else if (btnCount > 0 && (await buttons.first().isVisible())) {
            await buttons.first().click();
          }

          await ensureLang(tracker.page, 'id');
          const idText = normalizeText(await tlSection.innerText());
          assert.ok(idText.includes(story.timeline[0].title.id), 'Timeline ID title missing');

          await ensureLang(tracker.page, 'en');
          const enText = normalizeText(await tlSection.innerText());
          assert.ok(enText.includes(story.timeline[0].title.en), 'Timeline EN title missing');
          assertNoRuntimeErrors(tracker, 'T1-F09-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F09-03',
      tier: 1,
      feature: 'F09',
      name: 'Relationship strip displays connected nodes & verbs',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
          const links = await tracker.page
            .locator('main a[href^="/story/"]')
            .evaluateAll((els) => [...new Set(els.map((a) => a.getAttribute('href')))]);
          for (const rel of story.relatedStories) {
            assert.ok(links.includes(`/story/${rel.targetSlug}`), `Missing connected target /story/${rel.targetSlug}`);
          }
          const mainText = await tracker.page.locator('main').innerText();
          assert.match(mainText, RELATION_BILINGUAL_REGEX, 'Expected relationship verb badge in story detail');
          assertNoRuntimeErrors(tracker, 'T1-F09-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F09-04',
      tier: 1,
      feature: 'F09',
      name: 'Verified SVG Data Chart renders on chartData stories',
      async run({ browser, baseUrl }) {
        const { chartStories } = loadStoriesContract();
        assert.ok(chartStories.length >= 1, 'Dataset must include at least 1 story with chartData');
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const story of chartStories) {
            await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
            const lang = (await getHtmlLang(tracker.page)) || 'id';
            const chartHeading = tracker.page
              .locator('main h2, main h3, main figcaption')
              .filter({ hasText: story.chartData.title[lang].slice(0, 24) })
              .first();
            assert.ok(await chartHeading.isVisible(), `Missing chart title "${story.chartData.title[lang]}"`);
            const chartScope = chartHeading.locator('xpath=ancestor::*[self::figure or self::section][1]');
            const chartText = normalizeText(await chartScope.innerText());
            const unitRx = new RegExp(`\\b${escapeRegex(story.chartData.unit)}\\b`, 'i');
            assert.match(chartText, unitRx, `Missing chart unit "${story.chartData.unit}" inside chart block`);

            const hasChartSvg = await chartScope.locator('svg').evaluateAll((svgs) =>
              svgs.some((svg) => {
                const r = svg.getBoundingClientRect();
                return r.width > 150 && r.height > 80;
              })
            );
            assert.ok(hasChartSvg, `Expected visible SVG chart (>150x80) on /story/${story.slug}`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F09-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F09-05',
      tier: 1,
      feature: 'F09',
      name: 'Chart displays uncertainty/method note & verified source citation',
      async run({ browser, baseUrl }) {
        const { chartStories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const story of chartStories) {
            await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
            const lang = (await getHtmlLang(tracker.page)) || 'id';
            const chartHeading = tracker.page
              .locator('main h2, main h3, main figcaption')
              .filter({ hasText: story.chartData.title[lang].slice(0, 24) })
              .first();
            assert.ok(await chartHeading.isVisible(), `Chart heading missing on /story/${story.slug}`);
            const chartScope = chartHeading.locator('xpath=ancestor::*[self::figure or self::section][1]');
            const chartText = normalizeText(await chartScope.innerText());
            const noteSnippet = story.chartData.note[lang].slice(0, 24);
            assert.ok(chartText.includes(noteSnippet), `Chart note missing inside chart block on /story/${story.slug}`);
            const src = story.sources.find((s) => s.id === story.chartData.sourceId);
            if (src) {
              const shortAuthor = src.authorOrInstitution.split(/[,/]/)[0].trim();
              assert.ok(
                chartText.includes(src.authorOrInstitution) || chartText.includes(shortAuthor),
                `Chart source institution "${src.authorOrInstitution}" missing inside chart block on /story/${story.slug}`
              );
            }
          }
          assertNoRuntimeErrors(tracker, 'T1-F09-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F10 (P0-7) — About Page (/about) (5 tests)
    // =========================================================================
    {
      id: 'T1-F10-01',
      tier: 1,
      feature: 'F10',
      name: 'About page renders cleanly in id and en with structured content',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/about');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const h1 = normalizeText(await tracker.page.locator('main h1').first().innerText());
            const mainText = normalizeText(await tracker.page.locator('main').innerText());
            assert.ok(h1.length > 0, `About (${lang}) must have visible <h1>`);
            assert.ok(mainText.length > 300, `About (${lang}) must provide substantial content (>300 chars)`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F10-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F10-02',
      tier: 1,
      feature: 'F10',
      name: 'About covers Project Background & Educational Purpose',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/about');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const mainText = normalizeText(await tracker.page.locator('main').innerText());
            assert.match(mainText, /latar\s+belakang|background/i, `About (${lang}) missing Background topic`);
            assert.match(mainText, /tujuan|edukasi|purpose|educational/i, `About (${lang}) missing Educational Purpose topic`);
          }
          assertNoRuntimeErrors(tracker, 'T1-F10-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F10-03',
      tier: 1,
      feature: 'F10',
      name: 'About covers Non-linear Open Exploration Model',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/about');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const mainText = normalizeText(await tracker.page.locator('main').innerText());
            assert.match(
              mainText,
              /model\s+eksplorasi|exploration\s+model|non-?linier|non-?linear|terhubung|interconnected/i,
              `About (${lang}) missing Exploration Model topic`
            );
          }
          assertNoRuntimeErrors(tracker, 'T1-F10-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F10-04',
      tier: 1,
      feature: 'F10',
      name: 'About covers Data & Scientific Source Principles',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/about');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const mainText = normalizeText(await tracker.page.locator('main').innerText());
            assert.match(
              mainText,
              /prinsip\s+data|sumber\s+ilmiah|data.*principles|scientific|fakta|estimasi|ketidakpastian|uncertainty/i,
              `About (${lang}) missing Data & Source Principles topic`
            );
          }
          assertNoRuntimeErrors(tracker, 'T1-F10-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F10-05',
      tier: 1,
      feature: 'F10',
      name: 'About covers Scope & Scientific Limitations',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/about');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const mainText = normalizeText(await tracker.page.locator('main').innerText());
            assert.match(
              mainText,
              /keterbatasan|batasan|limitations|scope|statis|static|kurasi|curated/i,
              `About (${lang}) missing Scope & Limitations topic`
            );
          }
          assertNoRuntimeErrors(tracker, 'T1-F10-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F11 (P0-8) — Contact & Team Page (/contact) (5 tests)
    // =========================================================================
    {
      id: 'T1-F11-01',
      tier: 1,
      feature: 'F11',
      name: 'Contact displays exact Team Name placeholder in id and en',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/contact');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const mainText = normalizeText(await tracker.page.locator('main').innerText());
            assert.ok(
              mainText.includes(TEAM_NAME_PLACEHOLDER),
              `Contact (${lang}) must display exact placeholder "${TEAM_NAME_PLACEHOLDER}"`
            );
          }
          assertNoRuntimeErrors(tracker, 'T1-F11-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F11-02',
      tier: 1,
      feature: 'F11',
      name: 'Contact displays Team Lead Albert Christian + GitHub link',
      async run({ browser, baseUrl }) {
        const member = TEAM_MEMBERS[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/contact');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const mainText = normalizeText(await tracker.page.locator('main').innerText());
            assert.ok(mainText.includes(member.name), `Missing team lead "${member.name}" (${lang})`);
            assert.match(mainText, member.roleRegex, `Missing Ketua / Team Lead role label (${lang})`);
          }
          const link = tracker.page.locator(`main a[href="${member.github}"]`).first();
          assert.ok(await link.isVisible(), `Missing GitHub link ${member.github}`);
          assertNoRuntimeErrors(tracker, 'T1-F11-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F11-03',
      tier: 1,
      feature: 'F11',
      name: 'Contact displays Member Ananta Firdaus + GitHub link',
      async run({ browser, baseUrl }) {
        const member = TEAM_MEMBERS[1];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/contact');
          const mainText = normalizeText(await tracker.page.locator('main').innerText());
          assert.ok(mainText.includes(member.name), `Missing member "${member.name}"`);
          assert.match(mainText, member.roleRegex, 'Missing Anggota / Member role label');
          const link = tracker.page.locator(`main a[href="${member.github}"]`).first();
          assert.ok(await link.isVisible(), `Missing GitHub link ${member.github}`);
          assertNoRuntimeErrors(tracker, 'T1-F11-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F11-04',
      tier: 1,
      feature: 'F11',
      name: 'Contact displays Member Farizy Rahman Hidayat + GitHub link',
      async run({ browser, baseUrl }) {
        const member = TEAM_MEMBERS[2];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/contact');
          const mainText = normalizeText(await tracker.page.locator('main').innerText());
          assert.ok(mainText.includes(member.name), `Missing member "${member.name}"`);
          assert.match(mainText, member.roleRegex, 'Missing Anggota / Member role label');
          const link = tracker.page.locator(`main a[href="${member.github}"]`).first();
          assert.ok(await link.isVisible(), `Missing GitHub link ${member.github}`);
          assertNoRuntimeErrors(tracker, 'T1-F11-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T1-F11-05',
      tier: 1,
      feature: 'F11',
      name: 'External GitHub link security attributes & bilingual copy',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/contact');
          const ghLinks = tracker.page.locator('main a[href^="https://github.com/"]');
          assert.equal(await ghLinks.count(), 3, 'Contact page must render exactly 3 GitHub links');
          for (let i = 0; i < 3; i += 1) {
            const target = await ghLinks.nth(i).getAttribute('target');
            const rel = (await ghLinks.nth(i).getAttribute('rel')) ?? '';
            if (target === '_blank') {
              assert.match(rel, /noopener/i, 'External target=_blank link must include rel="noopener"');
            }
          }
          await ensureLang(tracker.page, 'id');
          const idH1 = normalizeText(await tracker.page.locator('main h1').first().innerText());
          await ensureLang(tracker.page, 'en');
          const enH1 = normalizeText(await tracker.page.locator('main h1').first().innerText());
          assert.notEqual(idH1, enH1, 'Contact heading should translate between id and en');
          assertNoRuntimeErrors(tracker, 'T1-F11-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F12 (P0-10) — Submission README.md & OSS Compliance (5 tests)
    // =========================================================================
    {
      id: 'T1-F12-01',
      tier: 1,
      feature: 'F12',
      name: 'README.md contains all 12 required R4 sections',
      async run() {
        const readme = loadReadmeContract();
        for (const rx of README_REQUIRED_SECTION_PATTERNS) {
          assert.match(readme, rx, `README.md missing required section matching ${rx}`);
        }
      },
    },
    {
      id: 'T1-F12-02',
      tier: 1,
      feature: 'F12',
      name: 'README.md contains exact team placeholder & 3 GitHub URLs',
      async run() {
        const readme = loadReadmeContract();
        assert.ok(readme.includes(TEAM_NAME_PLACEHOLDER), `README.md missing "${TEAM_NAME_PLACEHOLDER}"`);
        for (const member of TEAM_MEMBERS) {
          assert.ok(readme.includes(member.name), `README.md missing member "${member.name}"`);
          assert.ok(readme.includes(member.github), `README.md missing GitHub URL "${member.github}"`);
        }
      },
    },
    {
      id: 'T1-F12-03',
      tier: 1,
      feature: 'F12',
      name: 'README.md includes Guidebook folder-naming reminder',
      async run() {
        const readme = loadReadmeContract();
        assert.ok(
          readme.includes('webdesign_namaTim_technoversary_vol.II'),
          'README.md must include competition folder naming note "webdesign_namaTim_technoversary_vol.II"'
        );
      },
    },
    {
      id: 'T1-F12-04',
      tier: 1,
      feature: 'F12',
      name: 'README.md aligns sources & visual attributions with stories.json',
      async run() {
        const readme = loadReadmeContract();
        const { stories } = loadStoriesContract();
        assert.match(readme, /Wikimedia|NASA/i, 'README.md must attribute Wikimedia/NASA visual assets');
        assert.match(readme, /CC\s*BY|Public\s*Domain/i, 'README.md must document image licenses');
        for (const s of stories) {
          assert.ok(
            readme.includes(s.heroImage.author) || readme.includes(s.sources[0].authorOrInstitution),
            `README.md missing attribution/source alignment for ${s.slug}`
          );
        }
      },
    },
    {
      id: 'T1-F12-05',
      tier: 1,
      feature: 'F12',
      name: 'Root package.json scripts & OSS runtime dependencies',
      async run() {
        const pkg = loadPackageJsonContract();
        assert.ok(pkg.scripts?.dev, 'package.json missing "dev" script');
        assert.ok(pkg.scripts?.build, 'package.json missing "build" script');
        assert.ok(pkg.scripts?.preview, 'package.json missing "preview" script');
        const deps = Object.keys(pkg.dependencies ?? {});
        const allowedRuntime = new Set(['react', 'react-dom', 'react-router-dom', 'lucide-react']);
        for (const dep of deps) {
          assert.ok(allowedRuntime.has(dep), `Unexpected root runtime dependency: ${dep}`);
        }
        assert.ok(deps.includes('react') && deps.includes('react-dom'), 'Missing react/react-dom dependencies');
      },
    },
  ];
}
