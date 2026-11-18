import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
  VIEWPORTS,
  assertAllVisibleImagesLoaded,
  assertNoHorizontalOverflow,
  assertNoRuntimeErrors,
  createTrackedPage,
  findMobileMenuToggle,
  findVisibleNavLink,
  getDirectoryStoryHrefs,
  getHtmlLang,
  getInteractiveMapInfo,
  getMapPreviewCtaLink,
  launchBrowser,
  measureContrastAndLuminance,
  toggleLanguage,
} from './lib/browser.mjs';
import {
  FAKE_CONTACT_EMAIL_REGEX,
  FAKE_PHONE_REGEX,
  RELATION_BILINGUAL_REGEX,
  REPO_ROOT,
  categoryRegexForKey,
  epistemicRegexForLang,
  regionRegexForKey,
  relationRegexForLang,
} from './lib/contracts.mjs';
import { startPreviewServer, startSelfTestServer } from './lib/server.mjs';
import { getTier1Tests } from './tiers/tier1-features.mjs';
import { getTier2Tests } from './tiers/tier2-boundaries.mjs';
import { getTier3Tests } from './tiers/tier3-pairwise.mjs';
import { getTier4Tests } from './tiers/tier4-scenarios.mjs';

const USAGE = `Usage: node run-e2e.mjs [options]

Options:
  --base-url <url>   Target an already-running preview/dev server (http/https)
  --port <num>       Port for managed Vite preview server (default: 4179)
  --tier <t>         Run specific tier: 1, 2, 3, 4, or all (default: all)
  --self-test        Verify Playwright + MS Edge harness against ephemeral HTTP fixture
  --list-tests       List all registered tests and tier counts without launching browser
  -h, --help         Show this help message
`;

function parseCli(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        'base-url': { type: 'string' },
        port: { type: 'string', default: '4179' },
        tier: { type: 'string', default: 'all' },
        'self-test': { type: 'boolean', default: false },
        'list-tests': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (err) {
    console.error(`Error: ${err.message}\n\n${USAGE}`);
    process.exit(2);
  }

  const values = parsed.values;
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const tier = String(values.tier).toLowerCase();
  if (!['1', '2', '3', '4', 'all'].includes(tier)) {
    console.error(`Error: Invalid --tier "${values.tier}". Must be 1, 2, 3, 4, or all.\n\n${USAGE}`);
    process.exit(2);
  }

  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Error: Invalid --port "${values.port}". Must be an integer between 1 and 65535.\n\n${USAGE}`);
    process.exit(2);
  }

  let baseUrl = null;
  if (values['base-url'] !== undefined) {
    try {
      const u = new URL(values['base-url']);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error('Only http:// and https:// URLs are supported');
      }
      baseUrl = u.toString().replace(/\/+$/, '');
    } catch (err) {
      console.error(`Error: Invalid --base-url "${values['base-url']}": ${err.message}\n\n${USAGE}`);
      process.exit(2);
    }
  }

  return {
    baseUrl,
    port,
    tier,
    selfTest: values['self-test'],
    listTests: values['list-tests'],
  };
}

function getAllRegisteredByTier() {
  return {
    1: getTier1Tests(),
    2: getTier2Tests(),
    3: getTier3Tests(),
    4: getTier4Tests(),
  };
}

function printRegisteredCounts(byTier) {
  const counts = {
    1: byTier[1].length,
    2: byTier[2].length,
    3: byTier[3].length,
    4: byTier[4].length,
  };
  const total = counts[1] + counts[2] + counts[3] + counts[4];
  console.log(
    `Registered tests -> Tier 1: ${counts[1]}, Tier 2: ${counts[2]}, Tier 3: ${counts[3]}, Tier 4: ${counts[4]}, Total: ${total}`
  );
  return { counts, total };
}

async function runSelfTest() {
  const byTier = getAllRegisteredByTier();
  const { counts, total } = printRegisteredCounts(byTier);
  assert.equal(counts[1], 64, `Expected 64 Tier 1 tests, got ${counts[1]}`);
  assert.equal(counts[2], 63, `Expected 63 Tier 2 tests, got ${counts[2]}`);
  assert.equal(counts[3], 14, `Expected 14 Tier 3 tests, got ${counts[3]}`);
  assert.equal(counts[4], 6, `Expected 6 Tier 4 tests, got ${counts[4]}`);
  assert.equal(total, 147, `Expected 147 total registered tests, got ${total}`);

  let server;
  let browser;
  const results = [];

  try {
    server = await startSelfTestServer();
    browser = await launchBrowser();
    const edgeVersion = browser.version();

    const checks = [
      {
        id: 'self-test:msedge-launch',
        async run() {
          assert.ok(edgeVersion && edgeVersion.length > 0, 'Expected non-empty MS Edge version');
          console.log(`  MS Edge headless version: ${edgeVersion}`);
        },
      },
      {
        id: 'self-test:dom-and-bilingual-toggle',
        async run() {
          const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
          try {
            await tracker.page.goto(`${server.baseUrl}/`, { waitUntil: 'load' });
            assert.equal(await getHtmlLang(tracker.page), 'id');
            const beforeTitle = await tracker.page.locator('main h1').innerText();
            const afterEn = await toggleLanguage(tracker.page);
            assert.equal(afterEn, 'en');
            const enTitle = await tracker.page.locator('main h1').innerText();
            assert.notEqual(enTitle, beforeTitle);
            // Reverse toggle en -> id matching M1 Navbar.jsx "Switch language to Indonesian"
            const afterId = await toggleLanguage(tracker.page);
            assert.equal(afterId, 'id');
            const restoredTitle = await tracker.page.locator('main h1').innerText();
            assert.equal(restoredTitle, beforeTitle);
            assertNoRuntimeErrors(tracker, 'self-test:dom-and-bilingual-toggle');
          } finally {
            await tracker.close();
          }
        },
      },
      {
        id: 'self-test:mobile-dual-nav-drawer',
        async run() {
          const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.mobile });
          try {
            const { page } = tracker;
            await page.goto(`${server.baseUrl}/`, { waitUntil: 'load' });
            const menuBtn = await findMobileMenuToggle(page);
            assert.ok(menuBtn, 'Expected visible mobile menu toggle at 390x844');
            assert.equal(await menuBtn.getAttribute('aria-expanded'), 'false');
            await menuBtn.click();
            await page.waitForTimeout(100);
            assert.equal(await menuBtn.getAttribute('aria-expanded'), 'true');
            const exploreLink = await findVisibleNavLink(page, '/explore');
            assert.ok(exploreLink, 'Expected visible /explore link inside mobile drawer');
            await exploreLink.click();
            await page.waitForFunction(() => window.location.pathname === '/explore', null, { timeout: 5000 });
            const menuBtnAfter = await findMobileMenuToggle(page);
            assert.equal(await menuBtnAfter.getAttribute('aria-expanded'), 'false');
            assertNoRuntimeErrors(tracker, 'self-test:mobile-dual-nav-drawer');
          } finally {
            await tracker.close();
          }
        },
      },
      {
        id: 'self-test:route-navigation',
        async run() {
          const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
          try {
            await tracker.page.goto(`${server.baseUrl}/`, { waitUntil: 'load' });
            await tracker.page.locator('a[href="/story/demo"]').click();
            await tracker.page.waitForFunction(
              () => window.location.pathname === '/story/demo',
              null,
              { timeout: 5000 }
            );
            assert.ok(await tracker.page.locator('main h1').isVisible());
            assertNoRuntimeErrors(tracker, 'self-test:route-navigation');
          } finally {
            await tracker.close();
          }
        },
      },
      {
        id: 'self-test:image-natural-width',
        async run() {
          const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
          try {
            await tracker.page.goto(`${server.baseUrl}/`, { waitUntil: 'load' });
            const imgs = await assertAllVisibleImagesLoaded(tracker.page, 'self-test:image-natural-width');
            assert.ok(imgs.length >= 1, 'Expected >=1 loaded fixture image');
            assertNoRuntimeErrors(tracker, 'self-test:image-natural-width');
          } finally {
            await tracker.close();
          }
        },
      },
      {
        id: 'self-test:contrast-and-transparent-bg',
        async run() {
          const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
          try {
            await tracker.page.goto(`${server.baseUrl}/`, { waitUntil: 'load' });
            const darkMetrics = await measureContrastAndLuminance(tracker.page);
            assert.ok(darkMetrics.bodyBgLum < 0.15, `Expected dark bg < 0.15, got ${darkMetrics.bodyBgLum}`);
            assert.ok(darkMetrics.samples.every((s) => s.ratio >= s.minRequired), 'Styled fixture should pass AA');

            await tracker.page.goto(`${server.baseUrl}/fixture-unstyled`, { waitUntil: 'load' });
            const unstyledMetrics = await measureContrastAndLuminance(tracker.page);
            assert.ok(
              unstyledMetrics.bodyBgLum >= 0.9,
              `Unstyled transparent html/body must resolve to white canvas (>= 0.9), got ${unstyledMetrics.bodyBgLum}`
            );

            await tracker.page.goto(`${server.baseUrl}/fixture-low-contrast`, { waitUntil: 'load' });
            const lowContrastMetrics = await measureContrastAndLuminance(tracker.page);
            assert.ok(lowContrastMetrics.samples.length >= 1, 'Expected sample from low-contrast fixture');
            assert.ok(
              lowContrastMetrics.samples[0].ratio < 2.0,
              `Low-alpha white text on #0b111a must score < 2.0, got ${lowContrastMetrics.samples[0].ratio}`
            );
          } finally {
            await tracker.close();
          }
        },
      },
      {
        id: 'self-test:runtime-error-detectors',
        async run() {
          // Positive check: clean fixture yields 0 errors
          const cleanTracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
          try {
            await cleanTracker.page.goto(`${server.baseUrl}/`, { waitUntil: 'load' });
            assertNoRuntimeErrors(cleanTracker, 'self-test:clean-fixture');
          } finally {
            await cleanTracker.close();
          }
          // Negative check: intentional console.error & uncaught pageerror are captured
          const probeTracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
          try {
            await probeTracker.page.goto(`${server.baseUrl}/`, { waitUntil: 'load' });
            await probeTracker.page.evaluate(() => {
              console.error('INTENTIONAL_PROBE_ERROR');
              setTimeout(() => {
                throw new Error('INTENTIONAL_PAGEERROR_PROBE');
              }, 0);
            });
            await probeTracker.page.waitForTimeout(100);
            assert.ok(
              probeTracker.errors.consoleErrors.some((e) => e.includes('INTENTIONAL_PROBE_ERROR')),
              'Error collector failed to capture intentional console.error probe'
            );
            assert.ok(
              probeTracker.errors.pageErrors.some((e) => e.includes('INTENTIONAL_PAGEERROR_PROBE')),
              'Error collector failed to capture intentional uncaught pageerror probe'
            );
          } finally {
            await probeTracker.close();
          }
        },
      },
      {
        id: 'self-test:viewports-no-overflow',
        async run() {
          for (const [label, viewport] of [
            ['desktop-1280x800', VIEWPORTS.desktop],
            ['mobile-390x844', VIEWPORTS.mobile],
          ]) {
            const tracker = await createTrackedPage(browser, { viewport });
            try {
              await tracker.page.goto(`${server.baseUrl}/`, { waitUntil: 'load' });
              await assertNoHorizontalOverflow(tracker.page, viewport.width, label);
              assertNoRuntimeErrors(tracker, label);
            } finally {
              await tracker.close();
            }
          }
        },
      },
      {
        id: 'self-test:taxonomy-and-relation-contracts',
        async run() {
          const taxonomyPath = path.join(REPO_ROOT, 'src', 'data', 'taxonomy.js');
          assert.ok(fs.existsSync(taxonomyPath), `Missing taxonomy.js at ${taxonomyPath}`);
          const tax = await import(pathToFileURL(taxonomyPath).href);
          for (const rel of tax.RELATIONSHIP_LIST) {
            assert.match(rel.label.en, RELATION_BILINGUAL_REGEX, `Missing EN relation "${rel.label.en}"`);
            assert.match(rel.label.id, RELATION_BILINGUAL_REGEX, `Missing ID relation "${rel.label.id}"`);
            assert.match(rel.label.en, relationRegexForLang('en'), `Strict EN relation mismatch "${rel.label.en}"`);
            assert.match(rel.label.id, relationRegexForLang('id'), `Strict ID relation mismatch "${rel.label.id}"`);
          }
          assert.doesNotMatch('Caused by', RELATION_BILINGUAL_REGEX, 'Disallowed verb must not match');
          assert.doesNotMatch('Measured Fact', relationRegexForLang('en'));
          assert.match('Fakta Terukur', epistemicRegexForLang('id'));
          assert.doesNotMatch('Measurable Fact', epistemicRegexForLang('id'));
          assert.doesNotMatch('Berdasarkan fakta dan perkiraan', epistemicRegexForLang('id'));
          assert.match('Measurable Fact', epistemicRegexForLang('en'));
          assert.doesNotMatch('Fakta Terukur', epistemicRegexForLang('en'));
          assert.doesNotMatch('This is in fact an estimate', epistemicRegexForLang('en'));

          for (const cat of tax.CATEGORY_LIST) {
            const rx = categoryRegexForKey(cat.id);
            assert.match(cat.label.en, rx, `Category ${cat.id} failed EN label "${cat.label.en}"`);
            assert.match(cat.label.id, rx, `Category ${cat.id} failed ID label "${cat.label.id}"`);
          }
          for (const reg of tax.REGION_LIST) {
            const rx = regionRegexForKey(reg.id);
            assert.match(reg.label.en, rx, `Region ${reg.id} failed EN label "${reg.label.en}"`);
            assert.match(reg.label.id, rx, `Region ${reg.id} failed ID label "${reg.label.id}"`);
          }
          assert.doesNotMatch('Riau & South Sumatra Peat Belt', regionRegexForKey('sumatra'));
          assert.doesNotMatch('Sabuk Gambut Riau & Sumatra Selatan', regionRegexForKey('sumatra'));
        },
      },
      {
        id: 'self-test:anti-fabrication-regexes',
        async run() {
          assert.match('tel:+628123456789', FAKE_PHONE_REGEX);
          assert.match('+62 812-3456-7890', FAKE_PHONE_REGEX);
          assert.match('0812-3456-7890', FAKE_PHONE_REGEX);
          assert.doesNotMatch('File size 74081234 bytes', FAKE_PHONE_REGEX);
          assert.doesNotMatch('Nature Climate Change, 5, pp. 1089-1092', FAKE_PHONE_REGEX);

          assert.match('mailto:team@example.com', FAKE_CONTACT_EMAIL_REGEX);
          assert.match('contact@uniku.ac.id', FAKE_CONTACT_EMAIL_REGEX);
          assert.match('team@proton.me', FAKE_CONTACT_EMAIL_REGEX);
          assert.doesNotMatch('@Albertchristiann14', FAKE_CONTACT_EMAIL_REGEX);
          assert.doesNotMatch('react@19.3.1', FAKE_CONTACT_EMAIL_REGEX);
        },
      },
      {
        id: 'self-test:explore-filter-and-map-disambiguation',
        async run() {
          const tracker = await createTrackedPage(browser, { viewport: VIEWPORTS.desktop });
          try {
            const { page } = tracker;
            await page.goto(`${server.baseUrl}/explore`, { waitUntil: 'load' });
            const mapInfo = await getInteractiveMapInfo(page);
            assert.ok(mapInfo, 'Expected interactive map on /explore fixture');
            assert.equal(mapInfo.markerCount, 2, 'Expected 2 deduplicated map markers (no nested <circle> double-count)');
            await mapInfo.markers.nth(1).click();
            const ctaLink = await getMapPreviewCtaLink(mapInfo);
            const previewHref = await ctaLink.getAttribute('href');
            assert.equal(
              previewHref,
              '/story/beta',
              'getMapPreviewCtaLink must select "Buka Kisah Lengkap" CTA instead of preceding outgoing relation pill'
            );

            const allHrefs = await getDirectoryStoryHrefs(page);
            assert.deepEqual(allHrefs, ['/story/alpha', '/story/beta']);

            await page.locator('main button').filter({ hasText: categoryRegexForKey('forest-loss') }).first().click();
            const filteredHrefs = await getDirectoryStoryHrefs(page);
            assert.deepEqual(
              filteredHrefs,
              ['/story/alpha'],
              'Forest Loss chip must narrow directory to 1 card without shared <section> swallowing it'
            );

            await page.locator('main input[type="search"]').fill('zzznonexistent');
            const emptyHrefs = await getDirectoryStoryHrefs(page);
            assert.deepEqual(emptyHrefs, [], 'Empty search must yield 0 directory cards even while map preview link remains');
            assert.ok(await (await getMapPreviewCtaLink(mapInfo)).isVisible());
            assertNoRuntimeErrors(tracker, 'self-test:explore-filter-and-map-disambiguation');
          } finally {
            await tracker.close();
          }
        },
      },
    ];

    for (const check of checks) {
      const start = Date.now();
      try {
        await check.run();
        const ms = Date.now() - start;
        console.log(`[SELF-TEST] PASS ${check.id} (${ms}ms)`);
        results.push({ id: check.id, status: 'PASS' });
      } catch (err) {
        const ms = Date.now() - start;
        console.error(`[SELF-TEST] FAIL ${check.id} (${ms}ms): ${err?.stack ?? err}`);
        results.push({ id: check.id, status: 'FAIL', error: err });
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await server.stop().catch(() => {});
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== SELF-TEST SUMMARY ===`);
  console.log(`Self-Test: ${passed}/${results.length} passed (${failed} failed)`);
  process.exit(failed === 0 && results.length > 0 ? 0 : 1);
}

async function runSuite(cli) {
  const byTier = getAllRegisteredByTier();
  const tiersToRun = cli.tier === 'all' ? [1, 2, 3, 4] : [Number(cli.tier)];
  const tests = tiersToRun.flatMap((t) => byTier[t]);

  let previewHandle = null;
  let browser = null;
  const stats = {
    1: { pass: 0, fail: 0, total: 0 },
    2: { pass: 0, fail: 0, total: 0 },
    3: { pass: 0, fail: 0, total: 0 },
    4: { pass: 0, fail: 0, total: 0 },
  };

  try {
    let baseUrl = cli.baseUrl;
    if (!baseUrl) {
      previewHandle = await startPreviewServer({ rootDir: REPO_ROOT, port: cli.port });
      baseUrl = previewHandle.baseUrl;
    }

    browser = await launchBrowser();
    console.log(`Running ${tests.length} E2E tests against ${baseUrl} (Edge ${browser.version()})`);

    for (const test of tests) {
      const start = Date.now();
      stats[test.tier].total += 1;
      try {
        await test.run({ browser, baseUrl });
        const ms = Date.now() - start;
        stats[test.tier].pass += 1;
        console.log(`[TIER ${test.tier}] PASS ${test.id} - ${test.name} (${ms}ms)`);
      } catch (err) {
        const ms = Date.now() - start;
        stats[test.tier].fail += 1;
        console.error(`[TIER ${test.tier}] FAIL ${test.id} - ${test.name} (${ms}ms)\n  ${err?.message ?? err}`);
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (previewHandle) previewHandle.stop();
  }

  let totalPass = 0;
  let totalFail = 0;
  let totalExec = 0;
  console.log('\n=== E2E SUMMARY ===');
  for (const t of [1, 2, 3, 4]) {
    const s = stats[t];
    totalPass += s.pass;
    totalFail += s.fail;
    totalExec += s.total;
    console.log(`Tier ${t}: ${s.pass}/${s.total} passed (${s.fail} failed)`);
  }
  console.log(`TOTAL:  ${totalPass}/${totalExec} passed (${totalFail} failed)`);

  process.exit(totalFail === 0 && totalExec > 0 ? 0 : 1);
}

const cli = parseCli(process.argv.slice(2));
if (cli.listTests) {
  const byTier = getAllRegisteredByTier();
  for (const t of [1, 2, 3, 4]) {
    for (const test of byTier[t]) {
      console.log(`[TIER ${t}] ${test.id} (${test.feature}) - ${test.name}`);
    }
  }
  printRegisteredCounts(byTier);
  process.exit(0);
}

if (cli.selfTest) {
  await runSelfTest();
} else {
  await runSuite(cli);
}
