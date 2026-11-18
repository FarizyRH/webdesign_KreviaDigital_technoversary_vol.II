import assert from 'node:assert/strict';
import {
  VIEWPORTS,
  assertAllVisibleImagesLoaded,
  assertNoHorizontalOverflow,
  assertNoRuntimeErrors,
  createTrackedPage,
  ensureLang,
  findMobileMenuToggle,
  findVisibleNavLink,
  getDirectoryStoryHrefs,
  getDirectoryStoryLinks,
  getHtmlLang,
  getInteractiveMapInfo,
  getMapPreviewCtaLink,
  gotoRoute,
  toggleLanguage,
} from '../lib/browser.mjs';
import {
  categoryRegexForKey,
  epistemicRegexForLang,
  loadStoriesContract,
  regionRegexForKey,
  relationRegexForLang,
} from '../lib/contracts.mjs';

function normalizeText(str) {
  return (str ?? '').replace(/\s+/g, ' ').trim();
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

export function getTier3Tests() {
  return [
    {
      id: 'T3-01',
      tier: 3,
      feature: 'P0-1+P0-2',
      name: 'Full-Route Language Persistence & Reload (id <-> en)',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          await ensureLang(page, 'id');
          await ensureLang(page, 'en');

          const hops = [
            { href: '/explore', path: '/explore' },
            { href: `/story/${slugs[0]}`, path: `/story/${slugs[0]}` },
            { href: '/about', path: '/about' },
            { href: '/contact', path: '/contact' },
          ];
          for (const hop of hops) {
            const navLink = page.locator(`header a[href="${hop.href}"], main a[href="${hop.href}"]`).first();
            await navLink.click();
            await page.waitForFunction((p) => window.location.pathname === p, hop.path, { timeout: 5000 });
            assert.equal(await getHtmlLang(page), 'en', `Language lost on ${hop.path}`);
            const navTextEn = normalizeText(await page.locator('header nav').first().innerText());
            assert.match(navTextEn, /home|explore|about|contact/i, `Nav must render English labels on ${hop.path}`);
            const text = `${navTextEn} ${await page.locator('main').innerText()}`;
            assert.doesNotMatch(text, /\b(undefined|NaN)\b|\bnav\.[a-z]+/i);
          }

          await page.reload({ waitUntil: 'load' });
          await page.locator('main').first().waitFor({ state: 'visible', timeout: 10000 });
          assert.equal(await getHtmlLang(page), 'en', 'Language en must survive reload on /contact');
          assert.match(
            normalizeText(await page.locator('header nav').first().innerText()),
            /home|explore|about|contact/i,
            'English nav labels must survive reload on /contact'
          );

          await page.locator('header a[href="/explore"]').first().click();
          await page.waitForFunction(() => window.location.pathname === '/explore', null, { timeout: 5000 });
          await ensureLang(page, 'id');
          await page.reload({ waitUntil: 'load' });
          await page.locator('main').first().waitFor({ state: 'visible', timeout: 10000 });
          assert.equal(await getHtmlLang(page), 'id', 'Language id must survive reload on /explore');
          assert.match(
            normalizeText(await page.locator('header nav').first().innerText()),
            /beranda|jelajah|tentang|kontak/i,
            'Indonesian nav labels must survive reload on /explore'
          );
          assertNoRuntimeErrors(tracker, 'T3-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-02',
      tier: 3,
      feature: 'P0-2+P0-6+P0-5',
      name: 'Mid-Article Language Switch & Reverse Back-Propagation',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const story = stories.find((s) => s.slug === 'sumatran-tiger-conservation') ?? stories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, `/story/${story.slug}`);
          await ensureLang(page, 'en');
          const h1En = normalizeText(await page.locator('main h1').first().innerText());
          assert.ok(h1En.includes(story.title.en), `Expected EN story title "${story.title.en}", got "${h1En}"`);

          await toggleLanguage(page);
          assert.equal(new URL(page.url()).pathname, `/story/${story.slug}`, 'Mid-article toggle must keep URL');
          assert.equal(await getHtmlLang(page), 'id');
          const mainIdText = normalizeText(await page.locator('main').innerText());
          assert.ok(mainIdText.includes(story.title.id), `Expected ID story title "${story.title.id}", got "${mainIdText.slice(0, 80)}"`);
          assert.ok(
            mainIdText.includes(story.sections.limitations.id.slice(0, 24)),
            'Story body sections must translate to Indonesian after mid-article toggle'
          );
          assert.match(mainIdText, epistemicRegexForLang('id'), 'Epistemic badges must switch to Indonesian');
          assert.match(mainIdText, relationRegexForLang('id'), 'Relationship verbs must switch to Indonesian');

          await page.locator('header nav a[href="/explore"]').first().click();
          await page.waitForFunction(() => window.location.pathname === '/explore', null, { timeout: 5000 });
          assert.equal(await getHtmlLang(page), 'id');
          const exploreText = normalizeText(await page.locator('main').innerText());
          assert.ok(exploreText.includes(story.title.id), 'Explore must render stories in Indonesian after back-navigation');
          assertNoRuntimeErrors(tracker, 'T3-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-03',
      tier: 3,
      feature: 'P0-4+P1-1+P0-5+P0-6+P0-1',
      name: 'Home Category Card -> Pre-Filtered Explore -> Multi-Hop Story Graph -> Navbar Return',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          const catLink = page.locator('main a[href*="/explore"][href*="category="]').first();
          assert.ok(await catLink.isVisible(), 'Home Explore by Category link must be visible');
          const catHref = await catLink.getAttribute('href');
          const selectedCat = new URL(catHref, baseUrl).searchParams.get('category');
          await catLink.click();
          await page.waitForFunction(() => window.location.pathname === '/explore', null, { timeout: 5000 });
          assert.equal(new URL(page.url()).searchParams.get('category'), selectedCat);

          const expectedHrefs = stories
            .filter((s) => s.category === selectedCat)
            .map((s) => `/story/${s.slug}`)
            .sort();
          const visibleStoryHrefs = (await getDirectoryStoryHrefs(page)).sort();
          assert.deepEqual(
            visibleStoryHrefs,
            expectedHrefs,
            `Pre-filtered Explore must show exact category subset for ${selectedCat}`
          );

          const dirLinks = await getDirectoryStoryLinks(page);
          await dirLinks.first().click();
          await page.waitForFunction(() => window.location.pathname.startsWith('/story/'), null, { timeout: 5000 });
          const hop1Url = new URL(page.url()).pathname;
          const hop1Slug = hop1Url.replace('/story/', '');
          const hop1Story = stories.find((s) => s.slug === hop1Slug);
          assert.ok(hop1Story, `Navigated to unknown story slug ${hop1Slug}`);
          const validTargets = hop1Story.relatedStories.map((r) => `/story/${r.targetSlug}`);

          await page.locator('main a[href^="/story/"]').first().click();
          await page.waitForFunction(
            (prev) => window.location.pathname.startsWith('/story/') && window.location.pathname !== prev,
            hop1Url,
            { timeout: 5000 }
          );
          const hop2Url = new URL(page.url()).pathname;
          assert.notEqual(hop2Url, hop1Url, 'Multi-hop graph must reach a distinct story');
          assert.ok(validTargets.includes(hop2Url), `Hop 2 (${hop2Url}) must be a connected story of ${hop1Slug}`);
          const hop2Story = stories.find((s) => `/story/${s.slug}` === hop2Url);
          const hop2H1 = normalizeText(await page.locator('main h1').first().innerText());
          assert.ok(
            hop2H1.includes(hop2Story.title.id) || hop2H1.includes(hop2Story.title.en),
            `Expected hop2 h1 to match "${hop2Story.title.id}"/"${hop2Story.title.en}", got "${hop2H1}"`
          );

          await page.locator('header nav a[href="/"]').first().click();
          await page.waitForFunction(() => window.location.pathname === '/', null, { timeout: 5000 });
          assertNoRuntimeErrors(tracker, 'T3-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-04',
      tier: 3,
      feature: 'P0-4+P1-1+P1-2+P0-5',
      name: 'Home Location Card -> Pre-Filtered Explore -> Search Combination -> Empty & Reset',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          const locLink = page.locator('main a[href*="region="], main a[href*="location="]').first();
          assert.ok(await locLink.isVisible(), 'Home Location card/link to /explore must be visible');
          await locLink.click();
          await page.waitForFunction(() => window.location.pathname === '/explore', null, { timeout: 5000 });
          const params = new URL(page.url()).searchParams;
          assert.ok(params.has('region') || params.has('location'), 'Location link must pre-filter /explore');

          const searchInput = page
            .locator('main input[type="search"], main [role="searchbox"], main input[placeholder*="cari" i], main input[placeholder*="search" i]')
            .first();
          await searchInput.fill('zzznonexistent999');
          await page.waitForTimeout(150);
          assert.equal((await getDirectoryStoryHrefs(page)).length, 0, 'Non-matching search must show 0 directory cards');

          const dedicatedReset = findExploreResetButton(page);
          const fallbackAll = page
            .locator('main button:not([data-e2e-map-container="true"] *)')
            .filter({ hasText: /\b(semua|all)\b/i });
          const resetBtn =
            (await dedicatedReset.count()) > 0 && (await dedicatedReset.first().isVisible())
              ? dedicatedReset.first()
              : fallbackAll.last();
          await resetBtn.click();
          await page.waitForTimeout(150);
          const restored = await getDirectoryStoryHrefs(page);
          assert.equal(restored.length, stories.length, 'Reset must restore all directory stories');
          assert.equal(await searchInput.inputValue(), '', 'Reset must clear search input');
          const resetParams = new URL(page.url()).searchParams;
          assert.ok(
            !resetParams.get('category') && !resetParams.get('region') && !resetParams.get('q'),
            `Reset must clear filter URL query params, got ${page.url()}`
          );
          assertNoRuntimeErrors(tracker, 'T3-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-05',
      tier: 3,
      feature: 'P0-2+P1-1+P1-2',
      name: 'Bilingual Cross-Filter Matrix (Category + Location + Search in id & en)',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const multiStoryCategory =
          stories.some((s) => s.category === 'endangered-species')
            ? 'endangered-species'
            : stories[0].category;
        const catStories = stories.filter((s) => s.category === multiStoryCategory);
        const target =
          catStories.find((s) => s.slug === 'sumatran-tiger-conservation') ?? catStories[0];
        const expectedCatHrefs = catStories.map((s) => `/story/${s.slug}`).sort();
        const mismatchedRegion =
          stories.find((s) => s.category !== multiStoryCategory)?.region ?? 'riau-south-sumatra';

        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/explore');
          await ensureLang(page, 'id');

          const controls = await getExploreFilterControls(page);
          const catBtn = controls.filter({ hasText: categoryRegexForKey(target.category) }).first();
          await catBtn.click();
          await page.waitForTimeout(150);

          const catHrefs = (await getDirectoryStoryHrefs(page)).sort();
          if (catStories.length >= 2) {
            assert.ok(
              catHrefs.length >= 2,
              `Category ${target.category} must return >= 2 stories before region/search narrowing, got ${JSON.stringify(catHrefs)}`
            );
          }
          assert.deepEqual(
            catHrefs,
            expectedCatHrefs,
            `Category ${target.category} must return exact category subset`
          );

          const regBtn = controls.filter({ hasText: regionRegexForKey(target.region) }).first();
          const regSelect = page.locator('main select').first();
          if ((await regBtn.count()) > 0 && (await regBtn.isVisible())) {
            await regBtn.click();
          } else if ((await regSelect.count()) > 0 && (await regSelect.isVisible())) {
            await regSelect.selectOption({ value: target.region });
          } else {
            assert.fail(`No visible region filter control found for ${target.region}`);
          }
          await page.waitForTimeout(150);

          const searchInput = page
            .locator('main input[type="search"], main [role="searchbox"], main input[placeholder*="cari" i], main input[placeholder*="search" i]')
            .first();
          const idKeyword = target.slug.includes('tiger')
            ? 'harimau'
            : target.title.id.split(/\s+/).find((w) => w.length >= 5 && !/indonesia/i.test(w)) ?? 'harimau';
          await searchInput.fill(idKeyword);
          await page.waitForTimeout(150);
          const idHrefs = await getDirectoryStoryHrefs(page);
          assert.deepEqual(
            idHrefs,
            [`/story/${target.slug}`],
            `ID cross-filter must match only /story/${target.slug}, got ${JSON.stringify(idHrefs)}`
          );

          await ensureLang(page, 'en');
          const enKeyword = target.slug.includes('tiger')
            ? 'tiger'
            : target.title.en.split(/\s+/).find((w) => w.length >= 5 && !/indonesia|story/i.test(w)) ?? 'tiger';
          await searchInput.fill(enKeyword);
          await page.waitForTimeout(150);
          const enHrefs = await getDirectoryStoryHrefs(page);
          assert.deepEqual(
            enHrefs,
            [`/story/${target.slug}`],
            `EN cross-filter must match only /story/${target.slug}, got ${JSON.stringify(enHrefs)}`
          );

          // Combined multi-param cold URL round-trip (category + region + q in EN)
          await gotoRoute(
            page,
            baseUrl,
            `/explore?category=${encodeURIComponent(target.category)}&region=${encodeURIComponent(target.region)}&q=${encodeURIComponent(enKeyword)}`
          );
          const coldMultiHrefs = await getDirectoryStoryHrefs(page);
          assert.deepEqual(
            coldMultiHrefs,
            [`/story/${target.slug}`],
            'Combined ?category=&region=&q= cold URL must filter directory accurately'
          );

          // Cold mismatched category + region URL must yield empty directory
          await gotoRoute(
            page,
            baseUrl,
            `/explore?category=${encodeURIComponent(target.category)}&region=${encodeURIComponent(mismatchedRegion)}`
          );
          const coldMismatchHrefs = await getDirectoryStoryHrefs(page);
          assert.deepEqual(
            coldMismatchHrefs,
            [],
            `Mismatched ?category=${target.category}&region=${mismatchedRegion} must yield []`
          );
          assertNoRuntimeErrors(tracker, 'T3-05');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-06',
      tier: 3,
      feature: 'P1-3+P0-2+P0-4+P0-6',
      name: 'Interactive Earth Map Pointer Selection <-> Preview Card <-> Story Detail (id & en)',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          let mapInfo = await getInteractiveMapInfo(page);
          if (!mapInfo || mapInfo.markerCount < stories.length) {
            await gotoRoute(page, baseUrl, '/explore');
            mapInfo = await getInteractiveMapInfo(page);
          }
          assert.ok(mapInfo, 'Interactive map must exist');

          await ensureLang(page, 'id');
          await mapInfo.markers.nth(0).click();
          await page.waitForTimeout(150);
          const href1 = await (await getMapPreviewCtaLink(mapInfo)).getAttribute('href');

          await mapInfo.markers.nth(1).click();
          await page.waitForTimeout(150);
          const previewTextId = normalizeText(await mapInfo.previewScope.innerText());
          const href2 = await (await getMapPreviewCtaLink(mapInfo)).getAttribute('href');
          assert.notEqual(href2, href1, 'Clicking different map markers must update preview target');

          await ensureLang(page, 'en');
          await mapInfo.markers.nth(1).click();
          await page.waitForTimeout(150);
          const previewTextEn = normalizeText(await mapInfo.previewScope.innerText());
          assert.notEqual(previewTextEn, previewTextId, 'Map preview card text must translate between id and en');

          const markerIdx = mapInfo.markerCount > 2 ? 2 : 0;
          await mapInfo.markers.nth(markerIdx).click();
          await page.waitForTimeout(150);
          const previewLink = await getMapPreviewCtaLink(mapInfo);
          const targetHref = await previewLink.getAttribute('href');
          await previewLink.click();
          await page.waitForFunction((h) => window.location.pathname === h, targetHref, { timeout: 5000 });
          assertNoRuntimeErrors(tracker, 'T3-06');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-07',
      tier: 3,
      feature: 'P1-3+P0-1+P0-6',
      name: 'Interactive Earth Map Keyboard Activation & Focus Synchrony',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          let mapInfo = await getInteractiveMapInfo(page);
          if (!mapInfo || mapInfo.markerCount < stories.length) {
            await gotoRoute(page, baseUrl, '/explore');
            mapInfo = await getInteractiveMapInfo(page);
          }
          assert.ok(mapInfo, 'Interactive map must exist');

          const marker0 = mapInfo.markers.nth(0);
          await marker0.focus();
          await page.keyboard.press('Space');
          await page.waitForTimeout(150);
          const href0 = await (await getMapPreviewCtaLink(mapInfo)).getAttribute('href');

          const marker1 = mapInfo.markers.nth(1);
          await marker1.focus();
          await page.keyboard.press('Enter');
          await page.waitForTimeout(150);

          const previewLink = await getMapPreviewCtaLink(mapInfo);
          assert.ok(await previewLink.isVisible(), 'Keyboard Enter on map marker must show preview link');
          const targetHref = await previewLink.getAttribute('href');
          assert.notEqual(targetHref, href0, 'Keyboard Enter on second marker must select a distinct story');
          await previewLink.focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction((h) => window.location.pathname === h, targetHref, { timeout: 5000 });
          assertNoRuntimeErrors(tracker, 'T3-07');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-08',
      tier: 3,
      feature: 'P0-9+P0-1+P0-3',
      name: 'Desktop (1280x800) Responsive Integrity Across All Routes (id & en)',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const routes = ['/', '/explore', ...slugs.map((s) => `/story/${s}`), '/about', '/contact'];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const lang of ['id', 'en']) {
            await gotoRoute(tracker.page, baseUrl, '/');
            await ensureLang(tracker.page, lang);
            for (const route of routes) {
              await gotoRoute(tracker.page, baseUrl, route);
              assert.equal(await getHtmlLang(tracker.page), lang, `Expected html[lang]="${lang}" on desktop ${route}`);
              await assertNoHorizontalOverflow(tracker.page, VIEWPORTS.desktop.width, `desktop ${lang} ${route}`);
              await assertAllVisibleImagesLoaded(tracker.page, `desktop ${lang} ${route}`);
              assert.ok((await tracker.page.locator('header, [role="banner"]').count()) >= 1);
              assert.ok((await tracker.page.locator('main, [role="main"]').count()) >= 1);
              assert.ok((await tracker.page.locator('footer, [role="contentinfo"]').count()) >= 1);
            }
          }
          assertNoRuntimeErrors(tracker, 'T3-08');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-09',
      tier: 3,
      feature: 'P0-9+P0-6+P1-5',
      name: 'Mobile (390x844) Responsive Containment & Zero Overflow Across All Routes',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const routes = ['/', '/explore', ...slugs.map((s) => `/story/${s}`), '/about', '/contact'];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.mobile });
        try {
          for (const lang of ['id', 'en']) {
            await gotoRoute(tracker.page, baseUrl, '/');
            await ensureLang(tracker.page, lang);
            for (const route of routes) {
              await gotoRoute(tracker.page, baseUrl, route);
              assert.equal(await getHtmlLang(tracker.page), lang, `Expected html[lang]="${lang}" on mobile ${route}`);
              await assertNoHorizontalOverflow(tracker.page, VIEWPORTS.mobile.width, `mobile ${lang} ${route}`);
              await assertAllVisibleImagesLoaded(tracker.page, `mobile ${lang} ${route}`);
              const svgOverflow = await tracker.page.evaluate((maxW) =>
                [...document.querySelectorAll('main svg')]
                  .map((s) => s.getBoundingClientRect().right)
                  .filter((r) => r > maxW + 2)
              , VIEWPORTS.mobile.width);
              assert.equal(svgOverflow.length, 0, `[${lang} ${route}] SVG exceeds 390px width`);
            }
          }
          assertNoRuntimeErrors(tracker, 'T3-09');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-10',
      tier: 3,
      feature: 'P0-1+P0-2+P0-9',
      name: 'Mobile (390x844) Navigation Drawer Open -> Switch Language -> Navigate -> Clean Close',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.mobile });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          await ensureLang(page, 'id');
          const menuBtn = await findMobileMenuToggle(page);
          assert.ok(menuBtn, 'Mobile menu toggle must be visible at 390x844');
          await menuBtn.click();
          await page.waitForTimeout(150);
          assert.equal(await menuBtn.getAttribute('aria-expanded'), 'true', 'Drawer must set aria-expanded="true"');

          await toggleLanguage(page);
          assert.equal(await getHtmlLang(page), 'en');

          const aboutLink = await findVisibleNavLink(page, '/about');
          assert.ok(aboutLink && (await aboutLink.isVisible()), 'Mobile drawer must expose visible /about link');
          await aboutLink.click();
          await page.waitForFunction(() => window.location.pathname === '/about', null, { timeout: 5000 });
          await page.waitForTimeout(150);
          const expanded = await menuBtn.getAttribute('aria-expanded');
          if (expanded !== null) {
            assert.equal(expanded, 'false', 'Mobile drawer must close after navigation');
          }
          assert.equal(
            await aboutLink.isVisible(),
            false,
            'Mobile drawer navigation links must not remain visible after navigation'
          );
          assert.ok(await page.locator('main h1').first().isVisible());
          assertNoRuntimeErrors(tracker, 'T3-10');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-11',
      tier: 3,
      feature: 'P0-1+P0-2+P0-9',
      name: 'Keyboard End-to-End Accessibility: Skip Link -> Header Nav -> Language Toggle',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          if ((await getHtmlLang(page)) !== 'id') {
            await ensureLang(page, 'id');
            await gotoRoute(page, baseUrl, '/');
          }

          await page.keyboard.press('Tab');
          const firstFocused = await page.evaluate(() => {
            const el = document.activeElement;
            const r = el?.getBoundingClientRect();
            return {
              href: el?.getAttribute('href') ?? '',
              width: r?.width ?? 0,
              height: r?.height ?? 0,
            };
          });
          assert.ok(firstFocused.href.startsWith('#'), `First Tab should focus skip link, got "${firstFocused.href}"`);
          assert.ok(firstFocused.width > 0 && firstFocused.height > 0, 'Skip link must be visible when focused');
          const targetId = firstFocused.href.slice(1);

          // 1. Verify keyboard Tab traversal from skip link through <header nav> links to language toggle
          let reachedNavLink = false;
          let toggledByKeyboard = false;
          for (let i = 0; i < 16; i += 1) {
            await page.keyboard.press('Tab');
            const info = await page.evaluate(() => {
              const el = document.activeElement;
              if (!el) return { isNavLink: false, isLangBtn: false };
              const isNavLink = Boolean(el.closest('header nav') && el.tagName === 'A');
              const isLangBtn =
                el.tagName === 'BUTTON' &&
                /\b(id|en|indonesia|indonesian|english|inggris|bahasa|language)\b/i.test(
                  `${el.innerText} ${el.getAttribute('aria-label') ?? ''}`
                );
              return { isNavLink, isLangBtn };
            });
            if (info.isNavLink) reachedNavLink = true;
            if (info.isLangBtn) {
              await page.keyboard.press('Enter');
              await page.waitForTimeout(150);
              toggledByKeyboard = (await getHtmlLang(page)) === 'en';
              break;
            }
          }
          assert.ok(reachedNavLink, 'Keyboard Tab must traverse at least one <header nav> link');
          assert.ok(toggledByKeyboard, 'Must reach and activate language toggle via keyboard Tab + Enter');

          // 2. Return to top of /, Tab to skip link, activate via Enter -> must focus #main-content
          await gotoRoute(page, baseUrl, '/');
          await page.keyboard.press('Tab');
          const skipBeforeEnter = await page.evaluate(() => document.activeElement?.getAttribute('href') ?? '');
          assert.equal(skipBeforeEnter, firstFocused.href, 'First Tab after navigation must focus skip link');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(50);
          const skipResult = await page.evaluate((id) => ({
            activeId: document.activeElement?.id ?? '',
            hash: window.location.hash,
            targetExists: Boolean(id && document.getElementById(id)),
          }), targetId);
          assert.ok(skipResult.targetExists, `Skip link target #${targetId} must exist in DOM`);
          assert.ok(
            skipResult.activeId === targetId || skipResult.hash === firstFocused.href,
            `Enter on skip link must focus #${targetId} or set hash ${firstFocused.href}, got activeId="${skipResult.activeId}", hash="${skipResult.hash}"`
          );
          assertNoRuntimeErrors(tracker, 'T3-11');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-12',
      tier: 3,
      feature: 'P0-5+P0-6+P1-3+P1-4+P1-5',
      name: 'Keyboard End-to-End Exploration: Story Card -> Story Detail -> Related Story',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/explore');
          const dirLinks = await getDirectoryStoryLinks(page);
          const firstCard = dirLinks.first();
          const baselineShadow = await firstCard.evaluate((el) => window.getComputedStyle(el).boxShadow);
          // Enter keyboard focus modality via Tab, then focus card to trigger :focus-visible
          await page.keyboard.press('Tab');
          await firstCard.focus();
          const focusState = await firstCard.evaluate((el) => {
            const s = window.getComputedStyle(el);
            return {
              focusVisible: el.matches(':focus-visible'),
              outlineWidth: parseFloat(s.outlineWidth) || 0,
              outlineStyle: s.outlineStyle,
              boxShadow: s.boxShadow,
            };
          });
          assert.ok(focusState.focusVisible, 'Keyboard-focused story card must match :focus-visible');
          assert.ok(
            (focusState.outlineWidth > 0 && focusState.outlineStyle !== 'none') ||
              focusState.boxShadow !== baselineShadow,
            `Focused story card link must show a visible focus indicator delta (${JSON.stringify(focusState)})`
          );

          await page.keyboard.press('Enter');
          await page.waitForFunction(() => window.location.pathname.startsWith('/story/'), null, { timeout: 5000 });
          const firstUrl = new URL(page.url()).pathname;

          const relatedLink = page.locator('main a[href^="/story/"]').first();
          await relatedLink.focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction((u) => window.location.pathname.startsWith('/story/') && window.location.pathname !== u, firstUrl, { timeout: 5000 });
          assertNoRuntimeErrors(tracker, 'T3-12');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-13',
      tier: 3,
      feature: 'P0-9+P1-6+P0-6',
      name: 'prefers-reduced-motion: reduce Emulation Across Routes & Interactions',
      async run({ browser, baseUrl }) {
        const { slugs, categories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, {
          viewport: VIEWPORTS.desktop,
          reducedMotion: 'reduce',
        });
        try {
          for (const route of ['/', '/explore', `/story/${slugs[0]}`, '/about', '/contact']) {
            await gotoRoute(tracker.page, baseUrl, route);
            const issues = await tracker.page.evaluate(() => {
              const hidden = [...document.querySelectorAll('main h1, main section, footer')]
                .map((el) => parseFloat(window.getComputedStyle(el).opacity))
                .filter((op) => op < 0.9);
              const longDurations = [...document.querySelectorAll('main a, main button, main section')]
                .slice(0, 20)
                .map((el) => parseFloat(window.getComputedStyle(el).transitionDuration) || 0)
                .filter((d) => d > 0.05);
              return { hiddenCount: hidden.length, longDurations };
            });
            assert.equal(issues.hiddenCount, 0, `[${route}] Elements stuck below 0.9 opacity under reduced-motion`);
            assert.equal(
              issues.longDurations.length,
              0,
              `[${route}] Long transition durations under reduced-motion: ${JSON.stringify(issues.longDurations)}`
            );
          }

          // Exercise interactive controls under reduced-motion
          await gotoRoute(tracker.page, baseUrl, '/');
          await toggleLanguage(tracker.page);
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const controls = await getExploreFilterControls(tracker.page);
          const catBtn = controls.filter({ hasText: categoryRegexForKey(categories[0]) }).first();
          if ((await catBtn.count()) > 0 && (await catBtn.isVisible())) {
            await catBtn.click();
            await tracker.page.waitForTimeout(100);
          }
          assertNoRuntimeErrors(tracker, 'T3-13');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T3-14',
      tier: 3,
      feature: 'P0-3+P0-6+P1-4',
      name: 'Pairwise Scientific Integrity: Credits + Epistemic Badges + Citations Across All Stories (id & en)',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const lang of ['id', 'en']) {
            await gotoRoute(tracker.page, baseUrl, '/');
            await ensureLang(tracker.page, lang);
            for (const story of stories) {
              await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
              await assertAllVisibleImagesLoaded(tracker.page, `T3-14 ${lang} ${story.slug}`);
              const mainText = normalizeText(await tracker.page.locator('main').innerText());
              assert.ok(
                mainText.includes(story.heroImage.author) || mainText.includes(story.heroImage.license),
                `[${lang} ${story.slug}] Missing heroImage attribution`
              );
              assert.match(mainText, epistemicRegexForLang(lang), `[${lang} ${story.slug}] Missing ${lang} epistemic markers`);
              assert.match(mainText, relationRegexForLang(lang), `[${lang} ${story.slug}] Missing ${lang} relation verbs`);
              assert.ok(
                mainText.includes(story.sections.limitations[lang].slice(0, 24)),
                `[${lang} ${story.slug}] Missing ${lang} limitations prose`
              );
              for (const rel of story.relatedStories) {
                assert.ok(
                  mainText.includes(rel.rationale[lang].slice(0, 20)),
                  `[${lang} ${story.slug}] Missing ${lang} rationale for ${rel.targetSlug}`
                );
              }
              for (const src of story.sources) {
                assert.ok(mainText.includes(src.title), `[${lang} ${story.slug}] Missing source "${src.title}"`);
                assert.ok(mainText.includes(src.authorOrInstitution), `[${lang} ${story.slug}] Missing institution "${src.authorOrInstitution}"`);
                assert.ok(
                  mainText.includes(src.supportedClaim[lang].slice(0, 20)),
                  `[${lang} ${story.slug}] Missing ${lang} supportedClaim for "${src.id}"`
                );
              }
            }
          }
          assertNoRuntimeErrors(tracker, 'T3-14');
        } finally {
          await tracker.close();
        }
      },
    },
  ];
}
