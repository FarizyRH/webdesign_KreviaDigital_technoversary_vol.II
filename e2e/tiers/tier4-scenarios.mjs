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
  FAKE_CONTACT_EMAIL_REGEX,
  FAKE_PHONE_REGEX,
  PLACEHOLDER_PROSE_REGEX,
  PROHIBITED_BLOAT_SDKS,
  PROHIBITED_UI_KITS,
  README_REQUIRED_SECTION_PATTERNS,
  TEAM_MEMBERS,
  TEAM_NAME_PLACEHOLDER,
  categoryRegexForKey,
  epistemicRegexForLang,
  loadPackageJsonContract,
  loadReadmeContract,
  loadStoriesContract,
  relationRegexForLang,
} from '../lib/contracts.mjs';

function normalizeText(str) {
  return (str ?? '').replace(/\s+/g, ' ').trim();
}

export function getTier4Tests() {
  return [
    {
      id: 'T4-01',
      tier: 4,
      feature: 'Scenario-Journalist',
      name: 'Journalist / Researcher: Deforestation -> Affects -> Tiger Conservation -> Mid-Article EN->ID',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const deforest = stories.find((s) => s.slug === 'sumatra-rainforest-deforestation') ?? stories[0];
        const tiger = stories.find((s) => s.slug === 'sumatran-tiger-conservation') ?? stories[1];

        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          await ensureLang(page, 'en');

          await gotoRoute(page, baseUrl, `/story/${deforest.slug}`);
          const deforestText = normalizeText(await page.locator('main').innerText());
          assert.ok(deforestText.includes(deforest.title.en), 'Expected Sumatra deforestation EN title');

          const edgeLink = page.locator(`main a[href="/story/${tiger.slug}"]`).first();
          assert.ok(await edgeLink.isVisible(), `Expected link to /story/${tiger.slug} on deforestation story`);
          const edgeContext = await edgeLink.evaluate((a) => {
            const card = a.closest('li, article') ?? a;
            return (card.innerText ?? '').replace(/\s+/g, ' ').trim();
          });
          assert.match(edgeContext, /\baffects\b/i, `Expected "Affects" relation verb near /story/${tiger.slug}`);
          await edgeLink.click();
          await page.waitForFunction(
            (slug) => window.location.pathname === `/story/${slug}`,
            tiger.slug,
            { timeout: 5000 }
          );

          const tigerEnText = normalizeText(await page.locator('main').innerText());
          assert.match(tigerEnText, /IUCN|Goodrich/i, 'Tiger story must cite IUCN/Goodrich');
          assert.match(tigerEnText, /Luskin/i, 'Tiger story must cite Luskin et al.');
          assert.ok(
            tigerEnText.includes(tiger.sections.limitations.en.slice(0, 24)),
            'Tiger story must render EN limitations prose from stories.json'
          );

          await toggleLanguage(page);
          assert.equal(await getHtmlLang(page), 'id', 'Mid-article switch must set html[lang]="id"');
          const tigerIdText = normalizeText(await page.locator('main').innerText());
          const tigerIdH1 = normalizeText(await page.locator('main h1').first().innerText());
          assert.ok(tigerIdH1.includes(tiger.title.id), `Expected ID title "${tiger.title.id}", got "${tigerIdH1}"`);
          assert.ok(
            tigerIdText.includes(tiger.sections.limitations.id.slice(0, 24)),
            'Mid-article EN->ID switch must translate limitations prose'
          );
          assert.match(tigerIdText, epistemicRegexForLang('id'), 'Mid-article EN->ID switch must translate epistemic badges');
          assertNoRuntimeErrors(tracker, 'T4-01');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T4-02',
      tier: 4,
      feature: 'Scenario-Student',
      name: 'Environmental Student: Explore Peatland Fires -> SiPongi Chart/Timeline -> Related Mangrove Blue Carbon',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const fires = stories.find((s) => s.slug === 'indonesia-peatland-fires') ?? stories[0];
        const mangrove = stories.find((s) => s.slug === 'indonesia-mangrove-blue-carbon') ?? stories[stories.length - 1];

        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/explore');
          const searchInput = page
            .locator('main input[type="search"], main [role="searchbox"], main input[placeholder*="cari" i], main input[placeholder*="search" i]')
            .first();
          await searchInput.fill('gambut');
          await page.waitForTimeout(150);

          const dirHrefs = await getDirectoryStoryHrefs(page);
          assert.ok(dirHrefs.includes(`/story/${fires.slug}`), 'Search "gambut" must surface peatland fires directory card');
          assert.ok(dirHrefs.length < stories.length, 'Search "gambut" must narrow directory cards');
          const dirLinks = await getDirectoryStoryLinks(page);
          const firesCard = dirLinks.filter({ hasText: fires.title.id.slice(0, 12) }).first();
          const fallbackCard = page.locator(`main a[href="/story/${fires.slug}"]:not([data-e2e-map-container="true"] *)`).first();
          const targetCard = (await firesCard.count()) > 0 ? firesCard : fallbackCard;
          assert.ok(await targetCard.isVisible(), 'Peatland fires directory card link must be visible');
          await targetCard.click();
          await page.waitForFunction(
            (slug) => window.location.pathname === `/story/${slug}`,
            fires.slug,
            { timeout: 5000 }
          );

          const lang = (await getHtmlLang(page)) || 'id';
          const chartHeading = page
            .locator('main h2, main h3, main figcaption')
            .filter({ hasText: fires.chartData.title[lang].slice(0, 24) })
            .first();
          assert.ok(await chartHeading.isVisible(), 'Expected SiPongi chart title on peatland fires story');
          const chartScope = chartHeading.locator('xpath=ancestor::*[self::figure or self::section][1]');
          const chartText = normalizeText(await chartScope.innerText());
          for (const pt of fires.chartData.series) {
            assert.ok(chartText.includes(pt.label), `Chart block missing series label "${pt.label}"`);
          }
          assert.match(chartText, /SiPongi|KLHK/i, 'Expected SiPongi/KLHK source attribution inside chart block');
          const chartMarkCount = await chartScope.locator('svg rect, svg circle, svg path[d]').count();
          assert.ok(chartMarkCount >= fires.chartData.series.length, 'Expected embedded SVG chart data bars/points');

          const tlHeading = page
            .locator('main h2, main h3')
            .filter({ hasText: /linimasa|lini\s+masa|timeline|kronologi/i })
            .first();
          assert.ok(await tlHeading.isVisible(), 'Expected Timeline section heading on peatland fires story');
          const tlText = normalizeText(await tlHeading.locator('xpath=ancestor::section[1]').innerText());
          assert.ok(tlText.includes(fires.timeline[0].date), 'Timeline section must display dated events');

          const mangroveLink = page.locator(`main a[href="/story/${mangrove.slug}"]`).first();
          assert.ok(await mangroveLink.isVisible(), `Expected link to /story/${mangrove.slug}`);
          const relContext = await mangroveLink.evaluate((a) => {
            const card = a.closest('li, article, div, section');
            return (card?.innerText ?? a.innerText ?? '').replace(/\s+/g, ' ').trim();
          });
          assert.match(relContext, relationRegexForLang(lang), 'Mangrove link must display allowed relationship verb');
          await mangroveLink.click();
          await page.waitForFunction(
            (slug) => window.location.pathname === `/story/${slug}`,
            mangrove.slug,
            { timeout: 5000 }
          );
          const mangroveText = normalizeText(await page.locator('main').innerText());
          assert.match(mangroveText, /Murdiyarso|Arifanti|BRGM/i, 'Mangrove story must cite Murdiyarso/Arifanti/BRGM');
          assertNoRuntimeErrors(tracker, 'T4-02');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T4-03',
      tier: 4,
      feature: 'Scenario-Educator',
      name: 'Conservation Educator: Earth Map -> Orangutan Leuser -> Deforestation -> About',
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

          let leuserMarker = null;
          for (let i = 0; i < mapInfo.markerCount; i += 1) {
            const candidate = mapInfo.markers.nth(i);
            const meta = await candidate.evaluate((el) =>
              `${el.textContent ?? ''} ${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('title') ?? ''} ${el.getAttribute('data-slug') ?? ''}`
            );
            if (/leuser|orangutan|aceh/i.test(meta)) {
              leuserMarker = candidate;
              break;
            }
          }
          assert.ok(leuserMarker, 'Interactive map must expose an Orangutan / Leuser marker');
          await leuserMarker.click();
          await page.waitForTimeout(150);

          const previewLink = await getMapPreviewCtaLink(mapInfo);
          assert.ok(await previewLink.isVisible(), 'Map preview CTA link must appear');
          await previewLink.click();
          await page.waitForFunction(
            () => window.location.pathname === '/story/sumatran-orangutan-leuser',
            null,
            { timeout: 5000 }
          );
          const hop1Path = new URL(page.url()).pathname;
          await assertAllVisibleImagesLoaded(page, 'T4-03-story');

          const deforestLink = page.locator('main a[href="/story/sumatra-rainforest-deforestation"]').first();
          const hop2Link = (await deforestLink.count()) > 0 ? deforestLink : page.locator('main a[href^="/story/"]').first();
          await hop2Link.click();
          await page.waitForFunction(
            (prev) => window.location.pathname.startsWith('/story/') && window.location.pathname !== prev,
            hop1Path,
            { timeout: 5000 }
          );
          assert.notEqual(new URL(page.url()).pathname, hop1Path, 'Hop 2 must navigate away from Leuser story');

          await page.locator('header nav a[href="/about"]').first().click();
          await page.waitForFunction(() => window.location.pathname === '/about', null, { timeout: 5000 });
          const aboutText = normalizeText(await page.locator('main').innerText());
          assert.match(aboutText, /keterbatasan|limitations|statis|static/i, 'About must explain static dataset scope');
          assertNoRuntimeErrors(tracker, 'T4-03');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T4-04',
      tier: 4,
      feature: 'Scenario-MobileReader',
      name: 'Bilingual Non-Linear Mobile Reader (390x844 drawer -> Explore filter -> Story Detail -> EN reload)',
      async run({ browser, baseUrl }) {
        const { stories, categories } = loadStoriesContract();
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.mobile });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          await ensureLang(page, 'id');

          const menuBtn = await findMobileMenuToggle(page);
          assert.ok(menuBtn, 'Mobile menu toggle must be visible at 390x844');
          await menuBtn.click();
          await page.waitForTimeout(150);
          const exploreLink = await findVisibleNavLink(page, '/explore');
          assert.ok(exploreLink && (await exploreLink.isVisible()), 'Mobile drawer must expose visible /explore link');
          await exploreLink.click();
          await page.waitForFunction(() => window.location.pathname === '/explore', null, { timeout: 5000 });
          await assertNoHorizontalOverflow(page, VIEWPORTS.mobile.width, 'T4-04 explore');

          await getInteractiveMapInfo(page);
          const filterBtn = page
            .locator('main button:not([data-e2e-map-container="true"] *), main [role="tab"]:not([data-e2e-map-container="true"] *)')
            .filter({ hasText: categoryRegexForKey(categories[0]) })
            .first();
          assert.ok(await filterBtn.isVisible(), `Mobile Explore must expose category filter for ${categories[0]}`);
          await filterBtn.click();
          await page.waitForTimeout(150);
          const filteredHrefs = await getDirectoryStoryHrefs(page);
          assert.ok(filteredHrefs.length >= 1 && filteredHrefs.length < stories.length, 'Mobile category filter must narrow directory');

          const dirLinks = await getDirectoryStoryLinks(page);
          await dirLinks.first().click();
          await page.waitForFunction(() => window.location.pathname.startsWith('/story/'), null, { timeout: 5000 });
          const storyUrl = new URL(page.url()).pathname;
          const activeStory = stories.find((s) => `/story/${s.slug}` === storyUrl);
          assert.ok(activeStory, `Unknown story route ${storyUrl}`);
          await assertNoHorizontalOverflow(page, VIEWPORTS.mobile.width, 'T4-04 story');
          await assertAllVisibleImagesLoaded(page, 'T4-04 story');

          await ensureLang(page, 'en');
          await page.reload({ waitUntil: 'load' });
          await page.locator('main').first().waitFor({ state: 'visible', timeout: 10000 });
          assert.equal(await getHtmlLang(page), 'en', 'EN must persist after mobile reload');
          assert.equal(new URL(page.url()).pathname, storyUrl, 'Story URL must persist after reload');
          const reloadedH1 = normalizeText(await page.locator('main h1').first().innerText());
          assert.ok(
            reloadedH1.includes(activeStory.title.en),
            `Reloaded mobile story <h1> must render in EN ("${activeStory.title.en}"), got "${reloadedH1}"`
          );
          assertNoRuntimeErrors(tracker, 'T4-04');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T4-05',
      tier: 4,
      feature: 'Scenario-JuryRubric',
      name: 'Competition Jury Online Evaluation — Full Guidebook Rubric, Contact, README & OSS Compliance',
      async run({ browser, baseUrl }) {
        const { slugs } = loadStoriesContract();
        const readme = loadReadmeContract();
        const pkg = loadPackageJsonContract();

        const allDeps = new Set([
          ...Object.keys(pkg.dependencies ?? {}),
          ...Object.keys(pkg.devDependencies ?? {}),
        ]);
        const joinedDeps = [...allDeps].join(' ').toLowerCase();
        for (const kit of PROHIBITED_UI_KITS) {
          assert.ok(!joinedDeps.includes(kit.toLowerCase()), `Prohibited kit in package.json: ${kit}`);
        }
        for (const sdk of PROHIBITED_BLOAT_SDKS) {
          assert.ok(!allDeps.has(sdk), `Prohibited out-of-scope SDK in package.json: ${sdk}`);
        }

        for (const rx of README_REQUIRED_SECTION_PATTERNS) {
          assert.match(readme, rx, `README missing required R4 section matching ${rx}`);
        }
        assert.ok(readme.includes(TEAM_NAME_PLACEHOLDER), 'README missing team placeholder');
        assert.ok(readme.includes('webdesign_namaTim_technoversary_vol.II'), 'README missing folder naming note');
        for (const m of TEAM_MEMBERS) {
          assert.ok(readme.includes(m.name) && readme.includes(m.github), `README missing ${m.name}`);
        }

        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;
          await gotoRoute(page, baseUrl, '/');
          for (const requiredNav of ['/', '/explore', '/about', '/contact']) {
            assert.ok(
              (await page.locator(`header nav a[href="${requiredNav}"]`).count()) >= 1,
              `Primary <nav> missing mandatory page link ${requiredNav}`
            );
          }

          for (const lang of ['id', 'en']) {
            await gotoRoute(page, baseUrl, '/');
            await ensureLang(page, lang);
            const homeAllText = normalizeText(await page.locator('body').innerText());
            assert.match(
              homeAllText,
              /ecodigital\s+for\s+environment|lingkungan|environmental/i,
              `Home (${lang}) must reflect EcoDigital For Environment theme`
            );

            for (const route of ['/', '/explore', ...slugs.map((s) => `/story/${s}`), '/about', '/contact']) {
              await gotoRoute(page, baseUrl, route);
              await assertAllVisibleImagesLoaded(page, `T4-05 ${lang} ${route}`);
              const text = normalizeText(await page.locator('main').innerText());
              assert.doesNotMatch(text, PLACEHOLDER_PROSE_REGEX, `Placeholder prose on ${route} (${lang})`);
            }

            await gotoRoute(page, baseUrl, '/about');
            const aboutText = normalizeText(await page.locator('main').innerText());
            assert.match(
              aboutText,
              /lingkungan|environmental|ekosistem|ecosystem/i,
              `About (${lang}) must reflect environmental exploration theme`
            );

            await gotoRoute(page, baseUrl, '/contact');
            assert.equal(await page.locator('form').count(), 0, `Contact (${lang}) must not have fake <form>`);
            assert.equal(
              await page.locator('main input, main textarea').count(),
              0,
              `Contact (${lang}) must not have input/textarea`
            );
            assert.equal(
              await page.locator('a[href^="mailto:"], a[href^="tel:"]').count(),
              0,
              `Contact (${lang}) must not have mailto/tel`
            );
            const contactText = normalizeText(await page.locator('main').innerText());
            assert.doesNotMatch(contactText, FAKE_CONTACT_EMAIL_REGEX);
            assert.doesNotMatch(contactText, FAKE_PHONE_REGEX);
            assert.ok(contactText.includes(TEAM_NAME_PLACEHOLDER));
            for (const m of TEAM_MEMBERS) {
              assert.ok(contactText.includes(m.name));
              assert.ok(await page.locator(`main a[href="${m.github}"]`).first().isVisible());
            }
          }
          assertNoRuntimeErrors(tracker, 'T4-05');
        } finally {
          await tracker.close();
        }
      },
    },
    {
      id: 'T4-06',
      tier: 4,
      feature: 'Scenario-DeepLinkRecovery',
      name: 'Resilient Deep-Link & Recovery Journey (cold /story/:slug, missing slug, unknown 404)',
      async run({ browser, baseUrl }) {
        const { stories } = loadStoriesContract();
        const mangrove = stories.find((s) => s.slug === 'indonesia-mangrove-blue-carbon') ?? stories[0];
        const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
        try {
          const { page } = tracker;

          // 1. Cold deep-link to valid story
          await gotoRoute(page, baseUrl, `/story/${mangrove.slug}`);
          const h1 = normalizeText(await page.locator('main h1').first().innerText());
          assert.ok(
            h1.includes(mangrove.title.id) || h1.includes(mangrove.title.en),
            `Cold deep-link failed to render ${mangrove.slug}`
          );
          assertNoRuntimeErrors(tracker, 'T4-06-valid');

          // 2. Cold deep-link to non-existent story slug -> recover to /explore (in id & en)
          for (const lang of ['id', 'en']) {
            await gotoRoute(page, baseUrl, '/');
            await ensureLang(page, lang);
            await gotoRoute(page, baseUrl, '/story/does-not-exist');
            const missingText = normalizeText(await page.locator('main').innerText());
            assert.match(missingText, /404|tidak\s+ditemukan|not\s+found/i);
            const exploreRecovery = page.locator('main a[href="/explore"], main a[href="/"]').first();
            await exploreRecovery.click();
            await page.waitForFunction(
              () => window.location.pathname === '/explore' || window.location.pathname === '/',
              null,
              { timeout: 5000 }
            );
            const recoveredH1 = normalizeText(await page.locator('main h1').first().innerText());
            assert.ok(recoveredH1.length > 0, `Recovered route after missing slug (${lang}) must have <h1>`);
            assert.doesNotMatch(recoveredH1, /\b404\b|not\s+found|tidak\s+ditemukan/i);
          }

          // 3. Cold unknown route /foo/bar -> recover to /
          await gotoRoute(page, baseUrl, '/foo/bar');
          const notFoundText = normalizeText(await page.locator('main').innerText());
          assert.match(notFoundText, /404|tidak\s+ditemukan|not\s+found/i);
          const homeRecovery = page.locator('main a[href="/"], header a[href="/"]').first();
          await homeRecovery.click();
          await page.waitForFunction(() => window.location.pathname === '/', null, { timeout: 5000 });
          const homeH1 = normalizeText(await page.locator('main h1').first().innerText());
          assert.ok(homeH1.length > 0, 'Recovered Home must render <h1>');
          assert.doesNotMatch(homeH1, /\b404\b|not\s+found|tidak\s+ditemukan/i);
          assertNoRuntimeErrors(tracker, 'T4-06', { allowHttp404: true });
        } finally {
          await tracker.close();
        }
      },
    },
  ];
}
