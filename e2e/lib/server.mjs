import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {
    // Process already exited
  }
}

async function assertPortAvailable(port, host = '127.0.0.1') {
  const occupied = await new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 250);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
  if (occupied) {
    throw new Error(
      `Port ${port} is already in use on ${host} — stop the existing server or pass --port <num> / --base-url.`
    );
  }
}

export async function startPreviewServer({ rootDir, port = 4179, timeoutMs = 15000 }) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid preview port "${port}". Must be an integer between 1 and 65535.`);
  }

  const distIndex = path.join(rootDir, 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) {
    throw new Error(
      `Missing ${distIndex} — run "npm run build" in "${rootDir}" first, or pass --base-url <url> / --self-test.`
    );
  }

  await assertPortAvailable(port, '127.0.0.1');

  const command = `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`;
  const child =
    process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', command], {
          cwd: rootDir,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        })
      : spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
          cwd: rootDir,
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: true,
        });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    killProcessTree(child.pid);
    removeHooks();
  };

  const onSigInt = () => {
    stop();
    process.exit(130);
  };
  const onSigTerm = () => {
    stop();
    process.exit(143);
  };
  const onExit = () => {
    stop();
  };

  function removeHooks() {
    process.removeListener('SIGINT', onSigInt);
    process.removeListener('SIGTERM', onSigTerm);
    process.removeListener('exit', onExit);
  }

  process.on('SIGINT', onSigInt);
  process.on('SIGTERM', onSigTerm);
  process.on('exit', onExit);

  const baseUrl = `http://127.0.0.1:${port}`;
  let exitedEarly = false;
  let exitCode = null;
  child.once('exit', (code) => {
    exitedEarly = true;
    exitCode = code;
  });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (exitedEarly) {
      stop();
      throw new Error(
        `Preview server exited early with code ${exitCode}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`
      );
    }
    try {
      const res = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(1500) });
      if (res.status === 200) {
        return { baseUrl, stop };
      }
    } catch {
      // Server not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  stop();
  throw new Error(
    `Preview server timed out after ${timeoutMs}ms waiting for ${baseUrl}/.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`
  );
}

const FIXTURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#0b111a"/>
  <circle cx="160" cy="90" r="60" fill="#1e4d3b" stroke="#38bdf8" stroke-width="3"/>
  <text x="160" y="96" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="14">Earth Fixture</text>
</svg>`;

function renderFixtureHtml(routePath, searchParams = new URLSearchParams()) {
  if (routePath === '/fixture-unstyled') {
    return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unstyled Contrast Fixture</title>
</head>
<body>
  <main id="main-content">
    <h1>Unstyled Browser Canvas</h1>
    <p>No explicit background-color CSS set on html or body.</p>
  </main>
</body>
</html>`;
  }

  if (routePath === '/fixture-low-contrast') {
    return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Low Contrast Fixture</title>
  <style>
    html, body { margin: 0; padding: 16px; background: #0b111a; color: #f1f5f9; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <main id="main-content">
    <p style="color: rgba(255, 255, 255, 0.2)">Low contrast alpha probe</p>
  </main>
</body>
</html>`;
  }

  const isStory = routePath.startsWith('/story/');
  const isExplore = routePath === '/explore';
  const initialCat = searchParams.get('category') ?? 'all';

  const exploreMain = `
    <h1 id="page-title">Jelajah Kisah Lingkungan</h1>
    <p id="page-copy">Telusuri peta interaktif dan direktori kisah.</p>
    <div class="explore-controls">
      <input type="search" id="explore-search" placeholder="Cari kisah..." />
      <div class="filter-chips">
        <button type="button" data-cat="all">Semua</button>
        <button type="button" data-cat="forest-loss">Forest Loss</button>
        <button type="button" data-cat="climate-fires">Climate, Carbon &amp; Fires</button>
      </div>
    </div>
    <section class="explore-body">
      <div class="map-widget">
        <div class="map-stage">
          <svg width="320" height="180" viewBox="0 0 320 180" role="img" aria-label="Peta interaktif">
            <rect width="320" height="180" fill="#0f172a"/>
            <g role="button" tabindex="0" data-slug="alpha" aria-label="Alpha Story">
              <circle cx="90" cy="90" r="14" fill="#34d399" tabindex="0"/>
            </g>
            <g role="button" tabindex="0" data-slug="beta" aria-label="Beta Story">
              <circle cx="220" cy="90" r="14" fill="#fb923c" tabindex="0"/>
            </g>
          </svg>
        </div>
        <aside class="map-preview" aria-live="polite">
          <div class="map-preview-relations">
            <a id="map-relation-link" href="/story/beta">Terkait: Beta</a>
          </div>
          <a id="map-preview-link" href="/story/alpha">Buka Kisah Lengkap</a>
        </aside>
      </div>
      <div class="directory-grid" id="directory-grid"></div>
    </section>`;

  const defaultMain = `
    <h1 id="page-title">${isStory ? 'Cerita Contoh Sumatra' : 'Penjelajah Lingkungan Global'}</h1>
    <p id="page-copy">${isStory ? 'Halaman detail cerita uji mandiri.' : 'Eksplorasi cerita lingkungan terhubung.'}</p>
    <img src="/fixture.svg" alt="Ilustrasi Bumi" width="320" height="180" />
    <p><a href="/story/demo" id="story-link">Baca Cerita Contoh</a></p>`;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>E2E Self-Test Fixture</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #0b111a; color: #f1f5f9; font-family: system-ui, sans-serif; }
    header { padding: 12px 16px; background: #111927; border-bottom: 1px solid #1e293b; }
    .header-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
    nav { display: flex; flex-wrap: wrap; gap: 12px; }
    .desktop-nav { display: flex; }
    #menu-toggle { display: none; }
    @media (max-width: 767px) {
      .desktop-nav { display: none; }
      #menu-toggle { display: inline-flex; }
    }
    a { color: #7dd3fc; }
    button { background: #15803d; color: #ffffff; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
    main { padding: 20px 16px; max-width: 960px; margin: 0 auto; }
    img { max-width: 100%; height: auto; display: block; }
    footer { padding: 16px; border-top: 1px solid #1e293b; color: #cbd5e1; font-size: 14px; }
  </style>
</head>
<body>
  <header>
    <div class="header-bar">
      <a href="#main-content">Lewati ke konten</a>
      <nav class="desktop-nav" aria-label="Navigasi utama">
        <a href="/">Beranda</a>
        <a href="/explore">Jelajah Kisah</a>
        <a href="/about">Tentang</a>
        <a href="/contact">Kontak</a>
      </nav>
      <div>
        <button type="button" id="lang-btn" aria-label="Ganti bahasa ke Inggris">ID / EN</button>
        <button type="button" id="menu-toggle" aria-expanded="false" aria-controls="mobile-drawer" aria-label="Buka menu navigasi">Menu</button>
      </div>
    </div>
    <div id="mobile-drawer" hidden>
      <nav aria-label="Menu navigasi seluler">
        <a href="/">Beranda</a>
        <a href="/explore">Jelajah Kisah</a>
        <a href="/about">Tentang</a>
        <a href="/contact">Kontak</a>
      </nav>
    </div>
  </header>
  <main id="main-content">
    ${isExplore ? exploreMain : defaultMain}
  </main>
  <footer>Interactive Global Environmental Explorer — Self-Test Fixture</footer>
  <script>
    const copy = {
      id: {
        title: ${isExplore ? "'Jelajah Kisah Lingkungan'" : isStory ? "'Cerita Contoh Sumatra'" : "'Penjelajah Lingkungan Global'"},
        body: ${isExplore ? "'Telusuri peta interaktif dan direktori kisah.'" : isStory ? "'Halaman detail cerita uji mandiri.'" : "'Eksplorasi cerita lingkungan terhubung.'"},
        aria: 'Ganti bahasa ke Inggris'
      },
      en: {
        title: ${isExplore ? "'Explore Environmental Stories'" : isStory ? "'Sumatra Sample Story'" : "'Interactive Global Environmental Explorer'"},
        body: ${isExplore ? "'Browse interactive map and story directory.'" : isStory ? "'Self-test story detail page.'" : "'Explore interconnected environmental stories.'"},
        aria: 'Switch language to Indonesian'
      }
    };
    let lang = localStorage.getItem('igee_lang') === 'en' ? 'en' : 'id';
    const langBtn = document.getElementById('lang-btn');
    function applyLang(next) {
      lang = next;
      localStorage.setItem('igee_lang', lang);
      document.documentElement.lang = lang;
      document.getElementById('page-title').textContent = copy[lang].title;
      document.getElementById('page-copy').textContent = copy[lang].body;
      langBtn.setAttribute('aria-label', copy[lang].aria);
    }
    applyLang(lang);
    langBtn.addEventListener('click', () => {
      applyLang(lang === 'id' ? 'en' : 'id');
    });

    const menuToggle = document.getElementById('menu-toggle');
    const mobileDrawer = document.getElementById('mobile-drawer');
    menuToggle.addEventListener('click', () => {
      const nextOpen = mobileDrawer.hasAttribute('hidden');
      if (nextOpen) {
        mobileDrawer.removeAttribute('hidden');
        menuToggle.setAttribute('aria-expanded', 'true');
      } else {
        mobileDrawer.setAttribute('hidden', '');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
    mobileDrawer.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        mobileDrawer.setAttribute('hidden', '');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });

    if (${isExplore ? 'true' : 'false'}) {
      const items = [
        { slug: 'alpha', category: 'forest-loss', title: 'Alpha Forest Loss Story' },
        { slug: 'beta', category: 'climate-fires', title: 'Beta Peatland Fires Story' }
      ];
      let activeCat = ${JSON.stringify(initialCat)};
      let query = '';
      const grid = document.getElementById('directory-grid');
      const searchEl = document.getElementById('explore-search');
      const relationLink = document.getElementById('map-relation-link');
      const previewLink = document.getElementById('map-preview-link');

      function renderCards() {
        const q = query.trim().toLowerCase();
        const filtered = items.filter((item) => {
          const catOk = activeCat === 'all' || item.category === activeCat;
          const qOk = !q || item.title.toLowerCase().includes(q) || item.slug.includes(q);
          return catOk && qOk;
        });
        grid.innerHTML = filtered.map((item) =>
          '<article><h2>' + item.title + '</h2><a href="/story/' + item.slug + '">Baca</a></article>'
        ).join('');
      }
      renderCards();

      document.querySelectorAll('.filter-chips button').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeCat = btn.getAttribute('data-cat') || 'all';
          renderCards();
        });
      });
      searchEl.addEventListener('input', (e) => {
        query = e.target.value || '';
        renderCards();
      });

      document.querySelectorAll('.map-stage [data-slug]').forEach((marker) => {
        const activate = () => {
          const slug = marker.getAttribute('data-slug');
          const otherSlug = slug === 'alpha' ? 'beta' : 'alpha';
          relationLink.setAttribute('href', '/story/' + otherSlug);
          relationLink.textContent = 'Terkait: ' + otherSlug;
          previewLink.setAttribute('href', '/story/' + slug);
          previewLink.textContent = 'Buka Kisah Lengkap';
        };
        marker.addEventListener('click', activate);
        marker.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') activate();
        });
      });
    }
  </script>
</body>
</html>`;
}

export async function startSelfTestServer() {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (reqUrl.pathname === '/fixture.svg') {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
      res.end(FIXTURE_SVG);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderFixtureHtml(reqUrl.pathname, reqUrl.searchParams));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return {
    baseUrl,
    stop: async () => {
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
