import assert from 'node:assert/strict';
import {
  VIEWPORTS,
  assertAllVisibleImagesLoaded,
  assertNoHorizontalOverflow,
  assertNoRuntimeErrors,
  createTrackedPage,
  ensureLang,
  getDirectoryStoryHrefs,
  getHtmlLang,
  getInteractiveMapInfo,
  getMapPreviewCtaLink,
  gotoRoute,
  toggleLanguage,
} from '../lib/browser.mjs';
import {
  ALLOWED_RELATIONS,
  FAKE_CONTACT_EMAIL_REGEX,
  FAKE_PHONE_REGEX,
  PLACEHOLDER_PROSE_REGEX,
  PROHIBITED_BLOAT_SDKS,
  PROHIBITED_UI_KITS,
  PROTECTED_GUIDEBOOK_BYTES,
  RELATION_BILINGUAL_REGEX,
  TEAM_MEMBERS,
  TEAM_NAME_PLACEHOLDER,
  VALID_FACT_TYPES,
  categoryRegexForKey,
  collectStoryClaimRefs,
  getGuidebookStat,
  loadIndexHtmlContract,
  loadPackageJsonContract,
  loadReadmeContract,
  loadStoriesContract,
  publicImageExists,
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

function collectBilingualNodes(node, trail = '', out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((item, idx) => collectBilingualNodes(item, `${trail}[${idx}]`, out));
    return out;
  }
  const keys = Object.keys(node);
  if (keys.includes('id') && keys.includes('en') && typeof node.id === 'string' && typeof node.en === 'string') {
    out.push({ path: trail, id: node.id, en: node.en });
  }
  for (const key of keys) {
    if (key === 'id' || key === 'en') continue;
    collectBilingualNodes(node[key], trail ? `${trail}.${key}` : key, out);
  }
  return out;
}

export function getTier2Tests() {
  return [
    // =========================================================================
    // F01 (P0-1) — App Shell, Routing & Navigation Boundary Cases (5 tests)
    // =========================================================================
    {
      id: 'T2-F01-01',
      tier: 2,
      feature: 'F01',
      name: 'Zero console/page/network errors across all routes & languages',
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
              assertNoRuntimeErrors(tracker, `T2-F01-01 ${lang} ${route}`);
            }
          }
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F01-02',
      tier: 2,
      feature: 'F01',
      name: 'Unknown top-level route renders graceful 404 fallback',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/non-existent-page-404');
          const main = tracker.page.locator('main').first();
          assert.ok(await main.isVisible(), '404 route must still render visible <main>');
          const text = normalizeText(await main.innerText());
          assert.match(text, /404|tidak\s+ditemukan|not\s+found|halaman/i, `Expected graceful 404 text, got "${text}"`);
          const recovery = main.locator('a[href="/"], a[href="/explore"]').first();
          assert.ok(await recovery.isVisible(), '404 fallback must offer recovery link to / or /explore');
          assertNoRuntimeErrors(tracker, 'T2-F01-02', { allowHttp404: true });
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F01-03',
      tier: 2,
      feature: 'F01',
      name: 'Deep nested unknown route recovers cleanly to Home',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore/deep/unknown/segment');
          const recovery = tracker.page.locator('main a[href="/"], main a[href="/explore"]').first();
          assert.ok(await recovery.isVisible(), 'Deep unknown route must offer recovery link');
          await recovery.click();
          await tracker.page.waitForFunction(
            () => window.location.pathname === '/' || window.location.pathname === '/explore',
            null,
            { timeout: 5000 }
          );
          assert.ok(await tracker.page.locator('main h1').first().isVisible(), 'Recovered route must display <h1>');
          assertNoRuntimeErrors(tracker, 'T2-F01-03', { allowHttp404: true });
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F01-04',
      tier: 2,
      feature: 'F01',
      name: 'Zero broken internal links across entire site',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const seedRoutes = ['/', '/explore', `/story/${slugs[0]}`, '/about', '/contact'];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const collected = new Set();
          for (const route of seedRoutes) {
            await gotoRoute(tracker.page, baseUrl, route);
            const hrefs = await tracker.page
              .locator('a[href^="/"]')
              .evaluateAll((els) => els.map((a) => a.getAttribute('href')).filter(Boolean));
            for (const h of hrefs) {
              collected.add(h.split('#')[0] || '/');
            }
          }
          assert.ok(collected.size >= 5, 'Expected >= 5 unique internal links');
          for (const target of collected) {
            await gotoRoute(tracker.page, baseUrl, target);
            const h1 = normalizeText(await tracker.page.locator('main h1').first().innerText());
            assert.doesNotMatch(h1, /\b404\b|not\s+found|tidak\s+ditemukan/i, `Broken internal link target: ${target}`);
          }
          assertNoRuntimeErrors(tracker, 'T2-F01-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F01-05',
      tier: 2,
      feature: 'F01',
      name: 'Hard browser reload on sub-routes works cleanly',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const route of ['/explore', `/story/${slugs[0]}`, '/about', '/contact']) {
            await gotoRoute(tracker.page, baseUrl, route);
            await tracker.page.reload({ waitUntil: 'load' });
            await tracker.page.locator('main h1').first().waitFor({ state: 'visible', timeout: 10000 });
            assertNoRuntimeErrors(tracker, `T2-F01-05 reload ${route}`);
          }
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F02 (P0-2) — Bilingual Engine Boundary/Error Cases (5 tests)
    // =========================================================================
    {
      id: 'T2-F02-01',
      tier: 2,
      feature: 'F02',
      name: 'Invalid localStorage language value falls back safely',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, {
          viewport: VIEWPORTS.desktop,
          initScript: () => {
            try {
              localStorage.setItem('igee_lang', 'xx-invalid');
            } catch {
              // ignore
            }
          },
        });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const lang = await getHtmlLang(tracker.page);
          assert.ok(lang === 'id' || lang === 'en', `Invalid igee_lang must fallback to id/en, got "${lang}"`);
          assertNoRuntimeErrors(tracker, 'T2-F02-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F02-02',
      tier: 2,
      feature: 'F02',
      name: 'Rapid 5x language toggle stress test',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          await ensureLang(tracker.page, 'id');
          for (let i = 0; i < 5; i += 1) {
            await toggleLanguage(tracker.page);
          }
          const finalLang = await getHtmlLang(tracker.page);
          assert.equal(finalLang, 'en', '5 toggles starting from id must end at en');
          const stored = await tracker.page.evaluate(() => localStorage.getItem('igee_lang'));
          assert.equal(stored, 'en', 'localStorage must match final language after rapid toggles');
          assertNoRuntimeErrors(tracker, 'T2-F02-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F02-03',
      tier: 2,
      feature: 'F02',
      name: 'Zero raw i18n key leaks or undefined/[object Object]',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const routes = ['/', '/explore', `/story/${slugs[0]}`, '/about', '/contact'];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const lang of ['id', 'en']) {
            await gotoRoute(tracker.page, baseUrl, '/');
            await ensureLang(tracker.page, lang);
            for (const route of routes) {
              await gotoRoute(tracker.page, baseUrl, route);
              const text = await tracker.page.evaluate(() => {
                const parts = [...document.querySelectorAll('header, nav, main, footer')].map(
                  (el) => el.innerText ?? ''
                );
                return parts.join('\n');
              });
              assert.doesNotMatch(
                text,
                /\b(undefined|NaN)\b|\[object Object\]/,
                `[${lang} ${route}] Detected undefined/NaN/[object Object] leak`
              );
              assert.doesNotMatch(
                text,
                /\b(site|nav|footer|epistemic|notFound|stubs|home|explore|story|about|contact|common)\.[a-zA-Z0-9_.]+\b/,
                `[${lang} ${route}] Detected raw i18n key leak`
              );
            }
          }
          assertNoRuntimeErrors(tracker, 'T2-F02-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F02-04',
      tier: 2,
      feature: 'F02',
      name: 'Browser Back/Forward preserves active language',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          await ensureLang(tracker.page, 'en');
          await tracker.page.locator('header nav a[href="/explore"]').first().click();
          await tracker.page.waitForFunction(() => window.location.pathname === '/explore', null, { timeout: 5000 });
          await tracker.page.goBack();
          await tracker.page.waitForFunction(() => window.location.pathname === '/', null, { timeout: 5000 });
          assert.equal(await getHtmlLang(tracker.page), 'en', 'Language must persist across goBack()');
          await tracker.page.goForward();
          await tracker.page.waitForFunction(() => window.location.pathname === '/explore', null, { timeout: 5000 });
          assert.equal(await getHtmlLang(tracker.page), 'en', 'Language must persist across goForward()');
          assertNoRuntimeErrors(tracker, 'T2-F02-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F02-05',
      tier: 2,
      feature: 'F02',
      name: 'Storage-restricted environment resilience (SecurityError)',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, {
          viewport: VIEWPORTS.desktop,
          initScript: () => {
            Storage.prototype.getItem = () => {
              throw new DOMException('Blocked', 'SecurityError');
            };
            Storage.prototype.setItem = () => {
              throw new DOMException('Blocked', 'SecurityError');
            };
          },
        });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const lang = await getHtmlLang(tracker.page);
          assert.ok(lang === 'id' || lang === 'en', 'App must mount safely when localStorage throws SecurityError');
          await toggleLanguage(tracker.page);
          assert.equal(tracker.errors.pageErrors.length, 0, 'Language toggle must not crash when localStorage throws');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F03 (P0-9) — Design System Boundary & Integrity Cases (5 tests)
    // =========================================================================
    {
      id: 'T2-F03-01',
      tier: 2,
      feature: 'F03',
      name: 'Zero broken images globally across desktop & mobile (390x844)',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const routes = ['/', '/explore', ...slugs.map((s) => `/story/${s}`), '/about', '/contact'];
        for (const [vpName, viewport] of [
          ['desktop', VIEWPORTS.desktop],
          ['mobile', VIEWPORTS.mobile],
        ]) {
          const tracker = await createTrackedPage(browser, { viewport });
          try {
            for (const route of routes) {
              await gotoRoute(tracker.page, baseUrl, route);
              await assertAllVisibleImagesLoaded(tracker.page, `T2-F03-01 ${vpName} ${route}`);
            }
            assertNoRuntimeErrors(tracker, `T2-F03-01-${vpName}`);
          } finally {
            await tracker.close();
          }
        }
      },
    },
    {
      id: 'T2-F03-02',
      tier: 2,
      feature: 'F03',
      name: 'Zero off-screen or clipped interactive elements on mobile (390x844)',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.mobile });
        try {
          for (const route of ['/', '/explore', `/story/${slugs[0]}`, '/about', '/contact']) {
            await gotoRoute(tracker.page, baseUrl, route);
            const clipped = await tracker.page.evaluate((maxW) => {
              return [...document.querySelectorAll('header a, header button, main a, main button, main input, main select')]
                .filter((el) => {
                  const r = el.getBoundingClientRect();
                  const s = window.getComputedStyle(el);
                  return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
                })
                .map((el) => {
                  const r = el.getBoundingClientRect();
                  return { text: (el.innerText || el.getAttribute('aria-label') || '').trim(), left: r.left, right: r.right };
                })
                .filter((r) => r.left < -1 || r.right > maxW + 1);
            }, VIEWPORTS.mobile.width);
            assert.equal(clipped.length, 0, `[${route}] Off-screen controls on 390x844: ${JSON.stringify(clipped)}`);
          }
          assertNoRuntimeErrors(tracker, 'T2-F03-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F03-03',
      tier: 2,
      feature: 'F03',
      name: 'Sticky header never occludes primary <h1> on load',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        for (const [vpName, viewport] of [
          ['desktop', VIEWPORTS.desktop],
          ['mobile', VIEWPORTS.mobile],
        ]) {
          const tracker = await createTrackedPage(browser, { viewport });
          try {
            for (const route of ['/', '/explore', `/story/${slugs[0]}`, '/about', '/contact']) {
              await gotoRoute(tracker.page, baseUrl, route);
              const boxes = await tracker.page.evaluate(() => {
                const header = document.querySelector('header');
                const h1 = document.querySelector('main h1');
                if (!header || !h1) return null;
                return {
                  headerBottom: header.getBoundingClientRect().bottom,
                  h1Top: h1.getBoundingClientRect().top,
                };
              });
              assert.ok(boxes, `Header and main h1 must exist on ${vpName} ${route}`);
              assert.ok(
                boxes.h1Top >= boxes.headerBottom - 2,
                `[${vpName} ${route}] Sticky header (bottom=${boxes.headerBottom}) occludes h1 (top=${boxes.h1Top})`
              );
            }
            assertNoRuntimeErrors(tracker, `T2-F03-03-${vpName}`);
          } finally {
            await tracker.close();
          }
        }
      },
    },
    {
      id: 'T2-F03-04',
      tier: 2,
      feature: 'F03',
      name: 'Ultra-narrow 320x568 viewport zero horizontal overflow',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.narrow });
        try {
          for (const route of ['/', '/explore', `/story/${slugs[0]}`]) {
            await gotoRoute(tracker.page, baseUrl, route);
            await assertNoHorizontalOverflow(tracker.page, VIEWPORTS.narrow.width, `320x568 ${route}`);
          }
          assertNoRuntimeErrors(tracker, 'T2-F03-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F03-05',
      tier: 2,
      feature: 'F03',
      name: 'Text legibility & non-empty computed geometry guard',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const issues = await tracker.page.evaluate(() => {
            return [...document.querySelectorAll('main h1, main h2, main p')]
              .filter((el) => (el.innerText ?? '').trim().length > 0)
              .map((el) => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return {
                  tag: el.tagName,
                  fontSize: parseFloat(style.fontSize),
                  opacity: parseFloat(style.opacity),
                  height: rect.height,
                };
              })
              .filter((x) => x.fontSize < 12 || x.opacity <= 0 || x.height <= 0);
          });
          assert.equal(issues.length, 0, `Legibility/geometry violations: ${JSON.stringify(issues)}`);
          assertNoRuntimeErrors(tracker, 'T2-F03-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F04 (P0-3) — Local Story Dataset & Scientific Integrity Cases (6 tests)
    // =========================================================================
    {
      id: 'T2-F04-01',
      tier: 2,
      feature: 'F04',
      name: 'Story ID/slug uniqueness & URL-safety validation',
      async run() {
        const { stories, slugs } = loadStoriesContract();
        assert.ok(stories.length >= 3 && stories.length <= 5, `Expected 3–5 stories, got ${stories.length}`);
        assert.equal(new Set(slugs).size, stories.length, 'Duplicate story slugs detected');
        for (const s of stories) {
          assert.equal(s.id, s.slug, `Story id "${s.id}" must equal slug "${s.slug}"`);
          assert.match(s.slug, /^[a-z0-9-]+$/, `Slug "${s.slug}" is not URL-safe lowercase kebab-case`);
        }
      },
    },
    {
      id: 'T2-F04-02',
      tier: 2,
      feature: 'F04',
      name: 'Relationship graph referential & verb integrity (no self-loops)',
      async run() {
        const { stories, slugs } = loadStoriesContract();
        for (const s of stories) {
          for (const rel of s.relatedStories) {
            assert.ok(ALLOWED_RELATIONS.includes(rel.relationType), `Disallowed relationType "${rel.relationType}" on ${s.slug}`);
            assert.ok(slugs.includes(rel.targetSlug), `Dangling targetSlug "${rel.targetSlug}" on ${s.slug}`);
            assert.notEqual(rel.targetSlug, s.slug, `Self-loop detected on ${s.slug}`);
            assert.ok(rel.rationale?.id?.trim() && rel.rationale?.en?.trim(), `Missing bilingual rationale on ${s.slug}`);
          }
        }
      },
    },
    {
      id: 'T2-F04-03',
      tier: 2,
      feature: 'F04',
      name: 'Claim-level factType & sourceIds referential integrity',
      async run() {
        const { stories } = loadStoriesContract();
        for (const s of stories) {
          const validIds = new Set(s.sources.map((src) => src.id));
          const claimItems = collectStoryClaimRefs(s);
          assert.ok(claimItems.length >= 5, `Expected >=5 claim items in ${s.slug}`);
          for (const item of claimItems) {
            if (!item.skipFactTypeCheck) {
              assert.ok(
                VALID_FACT_TYPES.includes(item.factType),
                `Invalid factType "${item.factType}" (${item.kind}) in ${s.slug}`
              );
            }
            assert.ok(
              Array.isArray(item.sourceIds) && item.sourceIds.length >= 1,
              `Missing sourceIds (${item.kind}) in ${s.slug}`
            );
            for (const sid of item.sourceIds) {
              assert.ok(validIds.has(sid), `Unknown sourceId "${sid}" (${item.kind}) referenced in ${s.slug}`);
            }
          }
        }
      },
    },
    {
      id: 'T2-F04-04',
      tier: 2,
      feature: 'F04',
      name: 'Anti-fabrication & valid reference formatting in sources',
      async run() {
        const { stories } = loadStoriesContract();
        for (const s of stories) {
          for (const src of s.sources) {
            assert.ok(src.title?.trim(), `Source ${src.id} in ${s.slug} missing title`);
            assert.ok(src.authorOrInstitution?.trim(), `Source ${src.id} in ${s.slug} missing authorOrInstitution`);
            assert.ok(String(src.year ?? '').trim(), `Source ${src.id} in ${s.slug} missing year`);
            assert.ok(src.supportedClaim?.id?.trim() && src.supportedClaim?.en?.trim(), `Source ${src.id} missing bilingual supportedClaim`);
            assert.match(src.urlOrDoi ?? '', /^(https?:\/\/|10\.\d{4,9}\/)/i, `Invalid urlOrDoi "${src.urlOrDoi}" in ${s.slug}`);
            assert.doesNotMatch(`${src.title} ${src.urlOrDoi}`, /(example\.com|\btodo\b|\btbd\b|lorem|fake)/i);
          }
        }
      },
    },
    {
      id: 'T2-F04-05',
      tier: 2,
      feature: 'F04',
      name: 'Visual asset license, attribution & local file existence',
      async run() {
        const { stories } = loadStoriesContract();
        for (const s of stories) {
          const img = s.heroImage;
          assert.ok(img?.src?.startsWith('/images/'), `${s.slug} heroImage.src must start with /images/`);
          assert.ok(publicImageExists(img.src), `Missing public asset for ${s.slug}: public${img.src}`);
          assert.ok(img.author?.trim() && img.license?.trim() && img.attribution?.trim(), `${s.slug} missing image credit fields`);
          assert.match(img.sourceUrl ?? '', /^https:\/\//i, `${s.slug} heroImage.sourceUrl must use https://`);
        }
      },
    },
    {
      id: 'T2-F04-06',
      tier: 2,
      feature: 'F04',
      name: 'Bilingual completeness & placeholder scan across entire stories.json',
      async run() {
        const { stories } = loadStoriesContract();
        const nodes = collectBilingualNodes(stories);
        assert.ok(nodes.length >= 20, 'Expected rich bilingual nodes across stories.json');
        for (const n of nodes) {
          assert.ok(n.id.trim().length > 0, `Empty .id string at ${n.path}`);
          assert.ok(n.en.trim().length > 0, `Empty .en string at ${n.path}`);
          assert.doesNotMatch(`${n.id} ${n.en}`, PLACEHOLDER_PROSE_REGEX, `Placeholder prose found at ${n.path}`);
        }
      },
    },

    // =========================================================================
    // F05 (P0-4) — Home Page (/) Boundary & Integrity Cases (5 tests)
    // =========================================================================
    {
      id: 'T2-F05-01',
      tier: 2,
      feature: 'F05',
      name: 'Zero dead links across all Home sections',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const hrefs = await tracker.page
            .locator('main a[href^="/"]')
            .evaluateAll((els) => [...new Set(els.map((a) => a.getAttribute('href')).filter(Boolean))]);
          assert.ok(hrefs.length >= 4, 'Home must contain multiple internal links');
          for (const href of hrefs) {
            await gotoRoute(tracker.page, baseUrl, href);
            const h1 = normalizeText(await tracker.page.locator('main h1').first().innerText());
            assert.doesNotMatch(h1, /\b404\b|not\s+found|tidak\s+ditemukan/i, `Dead link on Home: ${href}`);
          }
          assertNoRuntimeErrors(tracker, 'T2-F05-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F05-02',
      tier: 2,
      feature: 'F05',
      name: 'Connected Stories preview enforces allowed verbs only',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const connHeading = tracker.page
            .locator('main h2, main h3')
            .filter({ hasText: /(cerita|kisah)\s+(terhubung|terkait)|koneksi|connected\s+stories|keterhubungan/i })
            .first();
          const sectionText = normalizeText(await connHeading.locator('xpath=ancestor::section[1]').innerText());
          assert.match(sectionText, RELATION_BILINGUAL_REGEX, 'Connected section must use allowed relationship verbs');
          assert.doesNotMatch(sectionText, /\b(Causes|Destroys|Kills|Blames)\b/, 'Disallowed relationship verb found on Home');
          assertNoRuntimeErrors(tracker, 'T2-F05-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F05-03',
      tier: 2,
      feature: 'F05',
      name: 'Home Earth visual fits cleanly on mobile (390x844)',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.mobile });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const visuals = await tracker.page.evaluate(() =>
            [...document.querySelectorAll('main svg, main img')].map((el) => {
              const r = el.getBoundingClientRect();
              return { width: r.width, height: r.height, left: r.left, right: r.right };
            })
          );
          assert.ok(visuals.some((v) => v.width > 80 && v.height > 80), 'Expected Earth visual on mobile');
          for (const v of visuals) {
            assert.ok(v.right <= VIEWPORTS.mobile.width + 1, `Home visual overflows 390px: right=${v.right}`);
          }
          assertNoRuntimeErrors(tracker, 'T2-F05-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F05-04',
      tier: 2,
      feature: 'F05',
      name: 'Navigating Home -> Story -> Back preserves clean Home state',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const h1CountBefore = await tracker.page.locator('main h1').count();
          await tracker.page.locator('main a[href^="/story/"]').first().click();
          await tracker.page.waitForFunction(() => window.location.pathname.startsWith('/story/'), null, { timeout: 5000 });
          await tracker.page.goBack();
          await tracker.page.waitForFunction(() => window.location.pathname === '/', null, { timeout: 5000 });
          const h1CountAfter = await tracker.page.locator('main h1').count();
          assert.equal(h1CountAfter, h1CountBefore, 'Returning to Home must not duplicate DOM mounts');
          assertNoRuntimeErrors(tracker, 'T2-F05-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F05-05',
      tier: 2,
      feature: 'F05',
      name: 'Anti-overclaiming / no prohibited live-telemetry or donation widgets',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const text = normalizeText(await tracker.page.locator('main').innerText());
          assert.doesNotMatch(
            text,
            /\b(live\s+stream|real-?time\s+satellite\s+feed|donate\s+now|donasi\s+sekarang)\b/i,
            'Home must not fabricate live telemetry feeds or donation widgets'
          );
          assertNoRuntimeErrors(tracker, 'T2-F05-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F06 (P0-5) — Explore Directory (/explore) Boundary Cases (5 tests)
    // =========================================================================
    {
      id: 'T2-F06-01',
      tier: 2,
      feature: 'F06',
      name: 'Invalid ?category=nonexistent-cat resilience',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore?category=nonexistent-cat');
          const text = normalizeText(await tracker.page.locator('main').innerText());
          assert.doesNotMatch(text, /\b(undefined|NaN)\b|\[object Object\]/);
          assert.ok(text.length > 20, 'Explore must display graceful empty state or safe fallback');
          assertNoRuntimeErrors(tracker, 'T2-F06-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F06-02',
      tier: 2,
      feature: 'F06',
      name: 'Invalid ?region=unknown-region resilience',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore?region=unknown-region');
          const text = normalizeText(await tracker.page.locator('main').innerText());
          assert.doesNotMatch(text, /\b(undefined|NaN)\b|\[object Object\]/);
          assert.ok(text.length > 20, 'Explore must handle unknown region gracefully');
          assertNoRuntimeErrors(tracker, 'T2-F06-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F06-03',
      tier: 2,
      feature: 'F06',
      name: 'Combined invalid query parameters recovery',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore?category=bad&region=bad&q=nope');
          await getInteractiveMapInfo(tracker.page);
          const dedicatedReset = findExploreResetButton(tracker.page);
          const fallbackAll = tracker.page
            .locator('main button:not([data-e2e-map-container="true"] *)')
            .filter({ hasText: /\b(semua|all)\b/i });
          const resetBtn =
            (await dedicatedReset.count()) > 0 && (await dedicatedReset.first().isVisible())
              ? dedicatedReset.first()
              : fallbackAll.last();
          assert.ok(await resetBtn.isVisible(), 'Combined invalid query must expose working Reset/Clear button');
          await resetBtn.click();
          await tracker.page.waitForTimeout(150);
          const restored = await getDirectoryStoryHrefs(tracker.page);
          assert.equal(restored.length, stories.length, 'Resetting invalid filters must restore all directory stories');
          assertNoRuntimeErrors(tracker, 'T2-F06-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F06-04',
      tier: 2,
      feature: 'F06',
      name: 'XSS payload in ?q= query param & search input does not execute',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore?q=%3Cscript%3Ewindow.__xss%3D1%3C%2Fscript%3E');
          assert.equal(await tracker.page.evaluate(() => window.__xss), undefined, 'URL XSS payload must not execute');
          const searchInput = tracker.page
            .locator('main input[type="search"], main [role="searchbox"], main input[placeholder*="cari" i], main input[placeholder*="search" i]')
            .first();
          if ((await searchInput.count()) > 0 && (await searchInput.isVisible())) {
            await searchInput.fill('<img src=x onerror="window.__xss=1">');
            await tracker.page.waitForTimeout(150);
            assert.equal(await tracker.page.evaluate(() => window.__xss), undefined, 'Input XSS payload must not execute');
          }
          assertNoRuntimeErrors(tracker, 'T2-F06-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F06-05',
      tier: 2,
      feature: 'F06',
      name: 'Extreme 250-character search query layout resilience',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.mobile });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const searchInput = tracker.page
            .locator('main input[type="search"], main [role="searchbox"], main input[placeholder*="cari" i], main input[placeholder*="search" i]')
            .first();
          await searchInput.fill('a'.repeat(250));
          await tracker.page.waitForTimeout(150);
          await assertNoHorizontalOverflow(tracker.page, VIEWPORTS.mobile.width, '250-char search');
          assertNoRuntimeErrors(tracker, 'T2-F06-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F07 (P1-1..P1-3) — Filters, Search & Map Boundary Cases (6 tests)
    // =========================================================================
    {
      id: 'T2-F07-01',
      tier: 2,
      feature: 'F07',
      name: 'Gibberish search -> empty state -> reset restoration',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const { page } = tracker;
          const searchInput = page
            .locator('main input[type="search"], main [role="searchbox"], main input[placeholder*="cari" i], main input[placeholder*="search" i]')
            .first();
          await searchInput.fill('xqzv999nonexistent');
          await page.waitForTimeout(150);

          const emptyHrefs = await getDirectoryStoryHrefs(page);
          assert.equal(emptyHrefs.length, 0, 'Gibberish search must show 0 directory story cards');
          const dedicatedReset = findExploreResetButton(page);
          const fallbackAll = page
            .locator('main button:not([data-e2e-map-container="true"] *)')
            .filter({ hasText: /\b(semua|all)\b/i });
          const resetBtn =
            (await dedicatedReset.count()) > 0 && (await dedicatedReset.first().isVisible())
              ? dedicatedReset.first()
              : fallbackAll.last();
          assert.ok(await resetBtn.isVisible(), 'Empty state must display Reset/Clear button');
          await resetBtn.click();
          await page.waitForTimeout(150);
          const restored = await getDirectoryStoryHrefs(page);
          assert.equal(restored.length, stories.length, 'Reset must restore all directory stories');
          assertNoRuntimeErrors(tracker, 'T2-F07-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F07-02',
      tier: 2,
      feature: 'F07',
      name: 'Case-insensitive & partial keyword search',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const { page } = tracker;
          const searchInput = page
            .locator('main input[type="search"], main [role="searchbox"], main input[placeholder*="cari" i], main input[placeholder*="search" i]')
            .first();
          await searchInput.fill('HARIMAU');
          await page.waitForTimeout(150);
          const hrefs1 = await getDirectoryStoryHrefs(page);
          assert.ok(hrefs1.includes('/story/sumatran-tiger-conservation'), 'Uppercase HARIMAU must match tiger story');
          assert.ok(hrefs1.length < stories.length, 'Uppercase HARIMAU search must narrow directory results');

          await searchInput.fill('mangrov');
          await page.waitForTimeout(150);
          const hrefs2 = await getDirectoryStoryHrefs(page);
          assert.ok(hrefs2.includes('/story/indonesia-mangrove-blue-carbon'), 'Partial "mangrov" must match mangrove story');
          assert.ok(hrefs2.length < stories.length, 'Partial "mangrov" search must narrow directory results');
          assertNoRuntimeErrors(tracker, 'T2-F07-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F07-03',
      tier: 2,
      feature: 'F07',
      name: 'Whitespace-only search query treated as empty',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const searchInput = tracker.page
            .locator('main input[type="search"], main [role="searchbox"], main input[placeholder*="cari" i], main input[placeholder*="search" i]')
            .first();
          await searchInput.fill('     ');
          await tracker.page.waitForTimeout(150);
          const hrefs = await getDirectoryStoryHrefs(tracker.page);
          assert.equal(hrefs.length, stories.length, 'Whitespace-only query must not hide directory stories');
          assertNoRuntimeErrors(tracker, 'T2-F07-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F07-04',
      tier: 2,
      feature: 'F07',
      name: 'Cross-filter intersection (category + non-matching query) yields 0 results',
      async run({ browser, baseUrl }) {
        const { categories } = loadStoriesContract();
        const cat = categories.includes('climate-fires') ? 'climate-fires' : categories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const controls = await getExploreFilterControls(tracker.page);
          const catBtn = controls.filter({ hasText: categoryRegexForKey(cat) }).first();
          await catBtn.click();
          const searchInput = tracker.page
            .locator('main input[type="search"], main [role="searchbox"], main input[placeholder*="cari" i], main input[placeholder*="search" i]')
            .first();
          await searchInput.fill('xqzv_no_match_cross');
          await tracker.page.waitForTimeout(150);
          const hrefs = await getDirectoryStoryHrefs(tracker.page);
          assert.equal(hrefs.length, 0, 'Cross-filter mismatch must yield 0 directory results');
          assertNoRuntimeErrors(tracker, 'T2-F07-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F07-05',
      tier: 2,
      feature: 'F07',
      name: 'Map interaction resilience across language switches',
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
          await ensureLang(tracker.page, 'id');
          await mapInfo.markers.first().click();
          await toggleLanguage(tracker.page);
          await mapInfo.markers.nth(1).click();
          const previewLink = await getMapPreviewCtaLink(mapInfo);
          assert.ok(await previewLink.isVisible(), 'Map marker preview must stay responsive after language toggle');
          assertNoRuntimeErrors(tracker, 'T2-F07-05');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F07-06',
      tier: 2,
      feature: 'F07',
      name: 'Rapid filter chip switching stress test',
      async run({ browser, baseUrl }) {
        const { stories, categories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/explore');
          const { page } = tracker;
          const controls = await getExploreFilterControls(page);
          for (const cat of categories) {
            const btn = controls.filter({ hasText: categoryRegexForKey(cat) }).first();
            if ((await btn.count()) > 0 && (await btn.isVisible())) {
              await btn.click();
            }
          }
          const allBtn = controls.filter({ hasText: /\b(semua|all)\b/i }).first();
          if ((await allBtn.count()) > 0 && (await allBtn.isVisible())) {
            await allBtn.click();
          } else {
            await findExploreResetButton(page).first().click();
          }
          await page.waitForTimeout(150);
          const restored = await getDirectoryStoryHrefs(page);
          assert.equal(restored.length, stories.length, 'Final "All" click must reflect full dataset after rapid switches');
          assertNoRuntimeErrors(tracker, 'T2-F07-06');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F08 (P0-6) — Dynamic Story Detail Boundary & Error Cases (6 tests)
    // =========================================================================
    {
      id: 'T2-F08-01',
      tier: 2,
      feature: 'F08',
      name: 'Non-existent story slug /story/non-existent-slug renders recovery UI',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/story/non-existent-slug');
          const text = normalizeText(await tracker.page.locator('main').innerText());
          assert.match(text, /404|tidak\s+ditemukan|not\s+found/i, 'Missing slug must show story-not-found UI');
          const recovery = tracker.page.locator('main a[href="/explore"], main a[href="/"]').first();
          assert.ok(await recovery.isVisible(), 'Missing slug must offer recovery link');
          assertNoRuntimeErrors(tracker, 'T2-F08-01', { allowHttp404: true });
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F08-02',
      tier: 2,
      feature: 'F08',
      name: 'Malformed/special-char slug /story/%3Cscript%3E handles safely',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/story/%3Cscript%3E');
          assert.ok(await tracker.page.locator('main').first().isVisible(), 'Malformed slug must still render <main>');
          assert.equal(await tracker.page.evaluate(() => window.__xss), undefined, 'Malformed slug XSS payload must not execute');
          assertNoRuntimeErrors(tracker, 'T2-F08-02', { allowHttp404: true });
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F08-03',
      tier: 2,
      feature: 'F08',
      name: 'Multi-hop navigation /story/A -> /story/B avoids stale state',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const storyA = stories[0];
        const targetSlug = storyA.relatedStories[0].targetSlug;
        const storyB = stories.find((s) => s.slug === targetSlug) ?? stories[1];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${storyA.slug}`);
          const lang = (await getHtmlLang(tracker.page)) || 'id';
          await tracker.page.locator(`main a[href="/story/${storyB.slug}"]`).first().click();
          await tracker.page.waitForFunction(
            (slug) => window.location.pathname === `/story/${slug}`,
            storyB.slug,
            { timeout: 5000 }
          );
          const h1 = normalizeText(await tracker.page.locator('main h1').first().innerText());
          assert.ok(h1.includes(storyB.title[lang]), `Expected h1 "${storyB.title[lang]}", got "${h1}"`);
          assert.ok(!h1.includes(storyA.title[lang]), 'Stale story A title remained in <h1>');
          assertNoRuntimeErrors(tracker, 'T2-F08-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F08-04',
      tier: 2,
      feature: 'F08',
      name: 'Browser Back restores previous story /story/B -> /story/A',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const storyA = stories[0];
        const targetSlug = storyA.relatedStories[0].targetSlug;
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${storyA.slug}`);
          const lang = (await getHtmlLang(tracker.page)) || 'id';
          await tracker.page.locator(`main a[href="/story/${targetSlug}"]`).first().click();
          await tracker.page.waitForFunction(
            (slug) => window.location.pathname === `/story/${slug}`,
            targetSlug,
            { timeout: 5000 }
          );
          await tracker.page.goBack();
          await tracker.page.waitForFunction(
            (slug) => window.location.pathname === `/story/${slug}`,
            storyA.slug,
            { timeout: 5000 }
          );
          const h1 = normalizeText(await tracker.page.locator('main h1').first().innerText());
          assert.ok(h1.includes(storyA.title[lang]), `Back navigation failed to restore story A <h1>: "${h1}"`);
          assertNoRuntimeErrors(tracker, 'T2-F08-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F08-05',
      tier: 2,
      feature: 'F08',
      name: 'External Evidence & Sources link syntax integrity',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const slug of slugs) {
            await gotoRoute(tracker.page, baseUrl, `/story/${slug}`);
            const extHrefs = await tracker.page
              .locator('main a[href^="http"]')
              .evaluateAll((els) => els.map((a) => a.getAttribute('href')));
            assert.ok(extHrefs.length >= 1, `/story/${slug} must render external source links`);
            for (const href of extHrefs) {
              const parsed = new URL(href);
              assert.ok(parsed.protocol === 'https:' || parsed.protocol === 'http:', `Invalid protocol on ${href}`);
            }
            const jsLinks = await tracker.page.locator('main a[href^="javascript:"]').count();
            assert.equal(jsLinks, 0, `Disallowed javascript: href in /story/${slug}`);
          }
          assertNoRuntimeErrors(tracker, 'T2-F08-05');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F08-06',
      tier: 2,
      feature: 'F08',
      name: 'Graceful omission of chart block when chartData is absent',
      async run({ browser, baseUrl }) {
        const { nonChartStories } = loadStoriesContract();
        assert.ok(nonChartStories.length >= 1, 'Expected at least 1 story without chartData');
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const story of nonChartStories) {
            await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
            const text = normalizeText(await tracker.page.locator('main').innerText());
            assert.doesNotMatch(text, /\b(undefined|NaN)\b|\[object Object\]/, `Unexpected undefined/NaN on ${story.slug}`);
            const hasLargeChartSvg = await tracker.page.evaluate(() =>
              [...document.querySelectorAll('main svg')].some((svg) => {
                const r = svg.getBoundingClientRect();
                return r.width > 150 && r.height > 80;
              })
            );
            assert.equal(hasLargeChartSvg, false, `Non-chart story ${story.slug} should not render a large chart <svg>`);
          }
          assertNoRuntimeErrors(tracker, 'T2-F08-06');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F09 (P1-4..P1-5) — Timeline, Relationship & Chart Integrity Cases (5 tests)
    // =========================================================================
    {
      id: 'T2-F09-01',
      tier: 2,
      feature: 'F09',
      name: 'Verified timeline dates contain no Invalid Date / NaN',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const story of stories) {
            await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
            const mainText = normalizeText(await tracker.page.locator('main').innerText());
            assert.doesNotMatch(mainText, /Invalid Date|\bNaN\b/i, `Invalid date/NaN found on /story/${story.slug}`);
            for (const t of story.timeline) {
              assert.ok(mainText.includes(t.date), `Timeline date "${t.date}" missing on /story/${story.slug}`);
            }
          }
          assertNoRuntimeErrors(tracker, 'T2-F09-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F09-02',
      tier: 2,
      feature: 'F09',
      name: 'Chart SVGs have valid finite numeric geometry on desktop & mobile',
      async run({ browser, baseUrl }) {
        const { chartStories } = loadStoriesContract();
        for (const viewport of [VIEWPORTS.desktop, VIEWPORTS.mobile]) {
          const tracker = await createTrackedPage(browser, { viewport });
          try {
            for (const story of chartStories) {
              await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
              const svgIssues = await tracker.page.evaluate(() => {
                const issues = [];
                const svgs = [...document.querySelectorAll('main svg')];
                for (const svg of svgs) {
                  const box = svg.getBoundingClientRect();
                  if (box.width < 120) continue;
                  if (box.left < -2 || box.right > window.innerWidth + 2) {
                    issues.push(`SVG overflows viewport: left=${box.left}, right=${box.right} (max=${window.innerWidth})`);
                  }
                  const shapes = [...svg.querySelectorAll('rect, circle, path, line, polyline, polygon, text')];
                  for (const sh of shapes) {
                    const attrs = ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'cx', 'cy', 'r', 'd', 'points'];
                    for (const a of attrs) {
                      const v = sh.getAttribute(a);
                      if (v && /(NaN|Infinity)/i.test(v)) {
                        issues.push(`Invalid ${a}="${v}" in SVG`);
                      }
                    }
                  }
                }
                return issues;
              });
              assert.equal(svgIssues.length, 0, `SVG geometry errors on ${story.slug}: ${svgIssues.join('; ')}`);
            }
            assertNoRuntimeErrors(tracker, 'T2-F09-02');
          } finally {
            await tracker.close();
          }
        }
      },
    },
    {
      id: 'T2-F09-03',
      tier: 2,
      feature: 'F09',
      name: 'Language toggle keeps SVG charts & timeline visible',
      async run({ browser, baseUrl }) {
        const { chartStories } = loadStoriesContract();
        const story = chartStories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
          await ensureLang(tracker.page, 'id');
          await toggleLanguage(tracker.page);
          const enTitle = story.chartData.title.en;
          const mainTextEn = normalizeText(await tracker.page.locator('main').innerText());
          assert.ok(mainTextEn.includes(enTitle), 'Chart title failed to update to EN');
          const hasChart = await tracker.page.evaluate(() =>
            [...document.querySelectorAll('main svg')].some((svg) => {
              const r = svg.getBoundingClientRect();
              return r.width > 100 && r.height > 50;
            })
          );
          assert.ok(hasChart, 'SVG chart disappeared after language toggle');
          const tlHeading = tracker.page
            .locator('main h2, main h3')
            .filter({ hasText: /linimasa|lini\s+masa|timeline|kronologi/i })
            .first();
          assert.ok(await tlHeading.isVisible(), 'Timeline heading disappeared after language toggle');
          assert.ok(
            mainTextEn.includes(story.timeline[0].title.en),
            'Timeline title failed to update to EN after language toggle'
          );
          assertNoRuntimeErrors(tracker, 'T2-F09-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F09-04',
      tier: 2,
      feature: 'F09',
      name: 'Relationship strip contains zero self-referential links',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const validSet = new Set(slugs);
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const slug of slugs) {
            await gotoRoute(tracker.page, baseUrl, `/story/${slug}`);
            const hrefs = await tracker.page
              .locator('main a[href^="/story/"]')
              .evaluateAll((els) => els.map((a) => a.getAttribute('href')));
            for (const h of hrefs) {
              const target = h.replace('/story/', '');
              assert.notEqual(target, slug, `Self-referential related link found on /story/${slug}`);
              assert.ok(validSet.has(target), `Invalid story target "${target}" linked on /story/${slug}`);
            }
          }
          assertNoRuntimeErrors(tracker, 'T2-F09-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F09-05',
      tier: 2,
      feature: 'F09',
      name: 'Chart values match verified stories.json series',
      async run({ browser, baseUrl }) {
        const { chartStories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const story of chartStories) {
            await gotoRoute(tracker.page, baseUrl, `/story/${story.slug}`);
            await ensureLang(tracker.page, 'en');
            const chartHeading = tracker.page
              .locator('main h2, main h3, main figcaption')
              .filter({ hasText: story.chartData.title.en.slice(0, 24) })
              .first();
            assert.ok(await chartHeading.isVisible(), `Chart heading missing for ${story.slug}`);
            const chartScope = chartHeading.locator('xpath=ancestor::*[self::figure or self::section][1]');
            const chartText = normalizeText(await chartScope.innerText());
            for (const point of story.chartData.series) {
              assert.ok(
                chartText.includes(point.label),
                `Chart block missing series label "${point.label}" on /story/${story.slug}`
              );
            }
            const barOrMarkCount = await chartScope.locator('svg rect, svg circle, svg path[d]').count();
            assert.ok(
              barOrMarkCount >= story.chartData.series.length,
              `Chart SVG missing data elements on /story/${story.slug} (${barOrMarkCount} < ${story.chartData.series.length})`
            );
          }
          assertNoRuntimeErrors(tracker, 'T2-F09-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F10 (P0-7) — About Page (/about) Boundary & Integrity Cases (5 tests)
    // =========================================================================
    {
      id: 'T2-F10-01',
      tier: 2,
      feature: 'F10',
      name: 'Zero placeholder/draft copy on /about',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/about');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const text = normalizeText(await tracker.page.locator('main').innerText());
            assert.doesNotMatch(text, PLACEHOLDER_PROSE_REGEX, `Placeholder copy found on /about (${lang})`);
          }
          assertNoRuntimeErrors(tracker, 'T2-F10-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F10-02',
      tier: 2,
      feature: 'F10',
      name: 'Honest limitations disclosure (no false real-time sensor claims)',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/about');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const text = normalizeText(await tracker.page.locator('main').innerText());
            assert.match(text, /keterbatasan|batasan|limitations|statis|static/i, `Missing limitations disclosure (${lang})`);
            assert.doesNotMatch(text, /\b(live\s+IoT\s+sensor|24\/7\s+real-?time\s+monitoring)\b/i);
          }
          assertNoRuntimeErrors(tracker, 'T2-F10-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F10-03',
      tier: 2,
      feature: 'F10',
      name: 'Zero broken internal/external links on /about',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/about');
          const links = await tracker.page
            .locator('main a[href]')
            .evaluateAll((els) => els.map((a) => a.getAttribute('href')).filter(Boolean));
          for (const href of links) {
            if (href.startsWith('http')) {
              const u = new URL(href);
              assert.equal(u.protocol, 'https:', `External link on /about should use https: ${href}`);
            } else if (href.startsWith('/')) {
              await gotoRoute(tracker.page, baseUrl, href);
              const h1 = normalizeText(await tracker.page.locator('main h1').first().innerText());
              assert.doesNotMatch(h1, /\b404\b|not\s+found/i, `Broken internal link on /about: ${href}`);
            }
          }
          assertNoRuntimeErrors(tracker, 'T2-F10-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F10-04',
      tier: 2,
      feature: 'F10',
      name: 'Mobile (390x844) zero overflow & zero errors on /about in id/en',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.mobile });
        try {
          await gotoRoute(tracker.page, baseUrl, '/about');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            await assertNoHorizontalOverflow(tracker.page, VIEWPORTS.mobile.width, `/about ${lang}`);
          }
          assertNoRuntimeErrors(tracker, 'T2-F10-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F10-05',
      tier: 2,
      feature: 'F10',
      name: 'Full translation delta between id and en on /about',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/about');
          await ensureLang(tracker.page, 'id');
          const idText = normalizeText(await tracker.page.locator('main').innerText());
          await ensureLang(tracker.page, 'en');
          const enText = normalizeText(await tracker.page.locator('main').innerText());
          assert.notEqual(idText, enText, '/about content must fully translate between id and en');
          assertNoRuntimeErrors(tracker, 'T2-F10-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F11 (P0-8) — Contact & Team Page Anti-Fabrication Cases (5 tests)
    // =========================================================================
    {
      id: 'T2-F11-01',
      tier: 2,
      feature: 'F11',
      name: 'Strict Anti-Fake-Form Check on /contact',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/contact');
          assert.equal(await tracker.page.locator('main form').count(), 0, 'Contact must have 0 <form> elements');
          assert.equal(
            await tracker.page.locator('main input, main textarea').count(),
            0,
            'Contact must have 0 input/textarea elements'
          );
          const mainText = normalizeText(await tracker.page.locator('main').innerText());
          assert.doesNotMatch(mainText, /\b(kirim\s+pesan|send\s+message|submit\s+form)\b/i, 'Fake submit button found');
          assertNoRuntimeErrors(tracker, 'T2-F11-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F11-02',
      tier: 2,
      feature: 'F11',
      name: 'Strict Anti-Fabricated-Email/Phone Check on /contact',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/contact');
          const mainText = normalizeText(await tracker.page.locator('main').innerText());
          const hrefs = await tracker.page
            .locator('main a[href]')
            .evaluateAll((els) => els.map((a) => a.getAttribute('href')).join(' '));
          const combined = `${mainText} ${hrefs}`;
          assert.doesNotMatch(combined, FAKE_CONTACT_EMAIL_REGEX, 'Fabricated email or mailto: found on /contact');
          assert.doesNotMatch(combined, FAKE_PHONE_REGEX, 'Fabricated phone number or tel: found on /contact');
          assertNoRuntimeErrors(tracker, 'T2-F11-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F11-03',
      tier: 2,
      feature: 'F11',
      name: 'Exact 3 GitHub URLs with zero typos or swaps',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/contact');
          const hrefs = await tracker.page
            .locator('main a[href*="github.com"]')
            .evaluateAll((els) => [...new Set(els.map((a) => a.getAttribute('href')).filter(Boolean))]);
          const expected = TEAM_MEMBERS.map((m) => m.github).sort();
          assert.deepEqual([...hrefs].sort(), expected, `GitHub links mismatch: ${JSON.stringify(hrefs)}`);
          assertNoRuntimeErrors(tracker, 'T2-F11-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F11-04',
      tier: 2,
      feature: 'F11',
      name: 'Exact 3-member roster compliance (Guidebook max 3)',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/contact');
          const mainText = normalizeText(await tracker.page.locator('main').innerText());
          for (const member of TEAM_MEMBERS) {
            assert.ok(mainText.includes(member.name), `Missing roster member "${member.name}"`);
          }
          const ghCount = await tracker.page.locator('main a[href*="github.com"]').count();
          assert.equal(ghCount, 3, `Expected exactly 3 team GitHub links, got ${ghCount}`);
          assertNoRuntimeErrors(tracker, 'T2-F11-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F11-05',
      tier: 2,
      feature: 'F11',
      name: 'Team name placeholder preserved verbatim on /contact',
      async run({ browser, baseUrl }) {
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/contact');
          for (const lang of ['id', 'en']) {
            await ensureLang(tracker.page, lang);
            const mainText = normalizeText(await tracker.page.locator('main').innerText());
            assert.ok(
              mainText.includes(TEAM_NAME_PLACEHOLDER),
              `Contact (${lang}) must preserve verbatim placeholder "${TEAM_NAME_PLACEHOLDER}"`
            );
          }
          assertNoRuntimeErrors(tracker, 'T2-F11-05');
        } finally {
          await tracker.close();
        }
      },
    },

    // =========================================================================
    // F12 (P0-10) — Submission README.md & Guidebook Compliance (5 tests)
    // =========================================================================
    {
      id: 'T2-F12-01',
      tier: 2,
      feature: 'F12',
      name: 'Zero Paid Templates / Prohibited UI Kits (opaque-box contract + DOM/assets)',
      async run({ browser, baseUrl }) {
        const pkg = loadPackageJsonContract();
        const indexHtml = loadIndexHtmlContract();
        const allDeps = [
          ...Object.keys(pkg.dependencies ?? {}),
          ...Object.keys(pkg.devDependencies ?? {}),
        ].join(' ');
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          await gotoRoute(tracker.page, baseUrl, '/');
          const runtimeAssetSummary = await tracker.page.evaluate(() => {
            const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href') ?? '');
            const scripts = [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src') ?? '');
            return `${links.join(' ')} ${scripts.join(' ')} ${document.documentElement.innerHTML.slice(0, 4000)}`;
          });
          const haystack = `${allDeps} ${indexHtml} ${runtimeAssetSummary}`.toLowerCase();
          for (const kit of PROHIBITED_UI_KITS) {
            assert.ok(!haystack.includes(kit.toLowerCase()), `Prohibited paid UI kit signature found: ${kit}`);
          }
          assertNoRuntimeErrors(tracker, 'T2-F12-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T2-F12-02',
      tier: 2,
      feature: 'F12',
      name: 'Protected Guidebook PDF file integrity (74,073,708 bytes)',
      async run() {
        const stat = getGuidebookStat();
        assert.ok(stat.exists, `Protected guidebook missing: ${stat.path}`);
        assert.equal(
          stat.size,
          PROTECTED_GUIDEBOOK_BYTES,
          `Guidebook size altered! Expected ${PROTECTED_GUIDEBOOK_BYTES}, got ${stat.size}`
        );
      },
    },
    {
      id: 'T2-F12-03',
      tier: 2,
      feature: 'F12',
      name: 'README.md Anti-Fabrication Check',
      async run() {
        const readme = loadReadmeContract();
        assert.doesNotMatch(readme, FAKE_CONTACT_EMAIL_REGEX, 'README.md must not contain fabricated emails');
        assert.doesNotMatch(readme, FAKE_PHONE_REGEX, 'README.md must not contain fabricated phone numbers');
        assert.ok(readme.includes(TEAM_NAME_PLACEHOLDER), `README.md must keep "${TEAM_NAME_PLACEHOLDER}" intact`);
      },
    },
    {
      id: 'T2-F12-04',
      tier: 2,
      feature: 'F12',
      name: 'README.md Command Consistency with package.json',
      async run() {
        const pkg = loadPackageJsonContract();
        const readme = loadReadmeContract();
        const scripts = Object.keys(pkg.scripts ?? {});
        assert.ok(scripts.includes('dev') && scripts.includes('build'), 'package.json must define dev and build');
        assert.match(readme, /npm\s+install/i, 'README.md must document npm install');
        assert.match(readme, /npm\s+run\s+dev/i, 'README.md must document npm run dev');
        assert.match(readme, /npm\s+run\s+build/i, 'README.md must document npm run build');
        const mentionedScripts = [...readme.matchAll(/\bnpm\s+run\s+([a-zA-Z0-9:_-]+)/g)].map((m) => m[1]);
        for (const scriptName of mentionedScripts) {
          assert.ok(
            scripts.includes(scriptName),
            `README.md documents "npm run ${scriptName}" which is missing from package.json`
          );
        }
      },
    },
    {
      id: 'T2-F12-05',
      tier: 2,
      feature: 'F12',
      name: 'Scope Boundary Compliance (No Auth/Backend/Tracker/Three.js Bloat)',
      async run({ browser, baseUrl }) {
        const pkg = loadPackageJsonContract();
        const allDeps = new Set([
          ...Object.keys(pkg.dependencies ?? {}),
          ...Object.keys(pkg.devDependencies ?? {}),
        ]);
        for (const sdk of PROHIBITED_BLOAT_SDKS) {
          assert.ok(!allDeps.has(sdk), `Prohibited out-of-scope dependency found in package.json: ${sdk}`);
        }
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          for (const route of ['/', '/explore', '/about', '/contact']) {
            await gotoRoute(tracker.page, baseUrl, route);
            assert.equal(
              await tracker.page.locator('input[type="password"]').count(),
              0,
              `Prohibited password/auth input found on ${route}`
            );
          }
          assertNoRuntimeErrors(tracker, 'T2-F12-05');
        } finally {
          await tracker.close();
        }
      },
    },
  ];
}
