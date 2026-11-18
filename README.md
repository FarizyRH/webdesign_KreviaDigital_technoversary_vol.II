# Interactive Global Environmental Explorer

> *Explore Earth. Discover the Stories Behind Our Changing Planet.*  
> *Jelajahi Bumi. Temukan Kisah di Balik Planet yang Berubah.*

Developed for **TECHNO VERSARY VOL. II — Web Design Competition (HIMA-TI FKOM UNIKU)** under the theme **EcoDigital For Environment**.

---

## 1. Website Title

**Interactive Global Environmental Explorer** (`IGEE`)

---

## 2. Description

**Interactive Global Environmental Explorer** is an original, responsive, bilingual (**Indonesian & English**) interactive environmental storytelling web application. Rather than presenting disconnected climate statistics, the explorer links real-world Indonesian and Sumatran ecosystems—tropical rainforests, critically endangered Sumatran tigers, carbon-rich peatlands, Leuser & Batang Toru orangutan habitats, and archipelagic coastal mangroves—into an open, explorable knowledge graph backed by claim-level peer-reviewed and institutional scientific references.

---

## 3. Project Goal

Aligned with **EcoDigital For Environment**, this project aims to:

- Translate peer-reviewed environmental research and official Indonesian conservation datasets into accessible, non-linear visual narratives.
- Demonstrate systemic ecological interconnections—showing how lowland forest conversion, peatland drainage, El Niño droughts, threatened megafauna decline, and blue-carbon loss influence one another.
- Uphold strict **epistemic honesty** and anti-misinformation standards by explicitly separating **Measurable Facts**, **Scientific Estimates**, **Causal Interpretations**, and **Uncertainty & Limitations**, with clickable claim-level citations and open visual asset attributions.

---

## 4. Main Features

- **Full Bilingual Engine (`id` / `en`)**: Instant language switching persisted via `localStorage` (`igee_lang`), synchronized with `<html lang>`, covering UI copy, taxonomy, charts, timelines, and all five story narratives.
- **Interactive Earth & Directory Exploration**: Home overview with illustrative/interactive Earth representation (`/images/blue-marble-earth.jpg` + coordinate explorer) and an Explore Stories directory with category/region filters, URL query synchronization, and bilingual keyword search.
- **Open Non-Linear Story Graph**: Five interconnected environmental stories linked by six explicit, evidence-aligned relationship types (`Located in`, `Related to`, `Affects`, `Part of`, `Observed in`, `Associated with`).
- **Dynamic Story Detail Reader (`/story/:slug`)**: Non-linear jump navigation across Story Introduction, The Place, What Is Happening, Drivers & Causes, Ecological & Social Impacts, Data Visualizations, Chronological Timeline, Scientific Limitations, Evidence & Sources, and Connected Stories.
- **4-Tier Epistemic Evidence Classification**: Every paragraph, driver, impact, metric, and timeline entry carries an `EpistemicBadge` (`fact`, `estimate`, `interpretation`, `uncertainty`) paired with clickable `[1]`/`[2]` `ClaimCitation` pills jumping directly to `#source-<id>`.
- **Data-Driven SVG Visualizations (`DataChart`)**: Responsive, locale-formatted horizontal SVG charts (with accessible `<title>`, `<desc>`, and expandable numeric data tables) for Margono primary forest fate (`Mha`), KLHK SiPongi+ annual burned area (`ha`), and KLHK Peta Mangrove Nasional extent (`ha`).
- **Methodology, Team Transparency & 404 Recovery**: Dedicated `About` page (background, educational purpose, 6-verb exploration model, institutional sources, 4 verified limitations), `Contact` page (official competition metadata and verified GitHub team profiles with zero fabricated emails/phones/forms), and a bilingual `404` recovery view.

---

## 5. Technologies Used

- **UI Framework**: `react` (`^19.3.1`), `react-dom` (`^19.3.1`)
- **Routing**: `react-router-dom` (`^7.18.5`)
- **Iconography**: `lucide-react` (`^1.74.0`)
- **Build Tooling**: `vite` (`^8.3.8`), `@vitejs/plugin-react` (`^6.3.0`)
- **Styling**: 100% custom CSS (`Dark Scientific Editorial` design tokens, WCAG AA contrast pairs, responsive grids, `prefers-reduced-motion` support—zero paid templates or proprietary UI kits)
- **Data & E2E Verification**: Node.js ESM dataset validator (`scripts/validateStories.mjs`) and isolated Playwright + Microsoft Edge E2E suite (`e2e/`)

---

## 6. Installation Instructions

### Prerequisites

- **Node.js** `18+` (recommended `20+`) and **npm**

### Install Dependencies

```bash
npm install
```

Optionally verify the integrity of the bilingual story dataset, source references, relationship graph, and local image assets:

```bash
npm run validate:data
```

---

## 7. Run Instructions

Available npm scripts defined in `package.json`:

- **Start local development server**:
  ```bash
  npm run dev
  ```
- **Build production bundle (`dist/`)**:
  ```bash
  npm run build
  ```
- **Preview production build locally**:
  ```bash
  npm run preview
  ```
- **Run dataset & asset integrity validation**:
  ```bash
  npm run validate:data
  ```

---

## 8. Brief Project Structure

```text
c:\Personal\Lomba\
├── GUIDEBOOK WEB DESIGN (1).pdf       # Protected competition guidebook (read-only)
├── index.html                         # HTML shell (<html lang="id">, /favicon.svg)
├── package.json                       # Open-source dependencies & npm scripts
├── vite.config.js                     # Vite + React plugin configuration
├── README.md                          # Competition submission documentation
├── public/
│   ├── favicon.svg                    # Original SVG brand mark
│   └── images/                        # 9 locally cached Wikimedia Commons & NASA JPEGs
├── scripts/
│   └── validateStories.mjs            # Dataset, relationship & asset validator
├── e2e/                               # Isolated Playwright + MS Edge E2E test suite
└── src/
    ├── main.jsx                       # React entry point & base CSS imports
    ├── App.jsx                        # Route configuration & scroll manager
    ├── context/
    │   └── LanguageContext.jsx        # Bilingual state provider ('id' / 'en')
    ├── styles/
    │   ├── tokens.css                 # Color, typography, spacing & motion tokens
    │   ├── global.css                 # Base resets, grids & reduced motion
    │   ├── components.css             # Navbar, Footer, buttons, badges & cards
    │   ├── homeExplore.css            # Home, Explore & Earth map styles
    │   └── detailInfo.css             # Story Detail, charts, About, Contact & 404 styles
    ├── i18n/
    │   ├── en.js                      # Base UI dictionary (English)
    │   ├── id.js                      # Base UI dictionary (Indonesian)
    │   ├── homeExplore.js             # Home & Explore bilingual copy
    │   └── detailInfo.js              # Story Detail, About, Contact & 404 bilingual copy
    ├── data/
    │   ├── stories.json               # 5 verified bilingual stories & 24 unique sources
    │   └── taxonomy.js                # Categories, regions, 6 relation verbs & fact types
    ├── utils/
    │   └── storyHelpers.js            # Story lookup, filtering & graph traversal helpers
    ├── components/
    │   ├── common/                    # EpistemicBadge.jsx, SectionHeader.jsx
    │   ├── layout/                    # Navbar.jsx, Footer.jsx, PageLayout.jsx
    │   ├── earth/                     # InteractiveEarthMap.jsx
    │   └── stories/                   # StoryCard, RelationshipBadge, ClaimCitation,
    │                                  # StoryTimeline, DataChart, EvidenceSection
    └── pages/
        ├── HomePage.jsx
        ├── ExplorePage.jsx
        ├── StoryDetailPage.jsx
        ├── AboutPage.jsx
        ├── ContactPage.jsx
        └── NotFoundPage.jsx
```

---

## 9. Team Name

**Team Name:** `[TEAM_NAME_PLACEHOLDER — fill in before submission]`

> **Guidebook Submission Packaging Reminder:**  
> Per `GUIDEBOOK WEB DESIGN (1).pdf` (p. 6, item 8), before final submission on GitHub, replace `[TEAM_NAME_PLACEHOLDER — fill in before submission]` in `README.md`, `src/i18n/en.js`, `src/i18n/id.js`, and `src/i18n/detailInfo.js`, and verify the repository/folder naming convention follows:  
> `webdesign_namaTim_technoversary_vol.II` (ganti `namaTim` dengan nama tim resmi)

---

## 10. Member Names & Roles

| Role | Name | GitHub Profile |
|---|---|---|
| **Ketua (Team Lead)** | Albert Christian | https://github.com/Albertchristiann14 |
| **Anggota (Member)** | Ananta Firdaus | https://github.com/Ananta-TI |
| **Anggota (Member)** | Farizy Rahman Hidayat | https://github.com/FarizyRH |

---

## 11. Data Sources & Scientific References

All 24 unique primary sources referenced across the 5 stories in `src/data/stories.json` (`unesco-trhs` is cited in Stories 1, 2, and 4; `perpres-120-2020` is cited in Stories 3 and 5, totaling 27 story-level source entries):

| Source ID | Author / Institution | Year | Title | Reference URL / DOI | Story Coverage |
|---|---|---|---|---|---|
| `margono-2012` | Margono, B. A. et al. (*Environmental Research Letters*, 7(3), 034010) | 2012 | Mapping and monitoring deforestation and forest degradation in Sumatra (Indonesia) using Landsat time series data sets from 1990 to 2010 | https://doi.org/10.1088/1748-9326/7/3/034010 | Story 1 |
| `margono-2014` | Margono, B. A. et al. (*Nature Climate Change*, 4, 730–735) | 2014 | Primary forest cover loss in Indonesia over 2000–2012 | https://doi.org/10.1038/nclimate2277 | Story 1 |
| `wri-gfw-2025` | World Resources Institute (WRI) / UMD GLAD Lab | 2024–2025 | Global Forest Watch / Global Nature Watch — Indonesia Deforestation Rates & Statistics | https://globalnaturewatch.org/dashboards/country/IDN/ | Story 1 |
| `unesco-trhs` | UNESCO World Heritage Centre / Kementerian Kehutanan RI / Gunung Leuser NP | 2004 / 2011 | Tropical Rainforest Heritage of Sumatra (World Heritage List & In Danger Status) | https://whc.unesco.org/en/list/1167/ | Stories 1, 2, 4 |
| `inpres-10-2011` | Pemerintah Republik Indonesia (Ditjen PP / JDIH) | 2011 | Instruksi Presiden Nomor 10 Tahun 2011 tentang Penundaan Pemberian Izin Baru dan Penyempurnaan Tata Kelola Hutan Alam Primer dan Lahan Gambut | https://peraturan.go.id/id/inpres-no-10-tahun-2011 | Story 1 |
| `inpres-5-2019` | Pemerintah Republik Indonesia (JDIH BPK RI) | 2019 | Instruksi Presiden Nomor 5 Tahun 2019 tentang Penghentian Pemberian Izin Baru dan Penyempurnaan Tata Kelola Hutan Alam Primer dan Lahan Gambut | https://peraturan.bpk.go.id/Details/111818/inpres-no-5-tahun-2019 | Story 1 |
| `goodrich-2022` | Goodrich, J., Wibisono, H., Miquelle, D., et al. (IUCN Red List) | 2022 | *Panthera tigris*. The IUCN Red List of Threatened Species 2022: e.T15955A214862019 | https://doi.org/10.2305/IUCN.UK.2022-1.RLTS.T15955A214862019.en | Story 2 |
| `luskin-2017` | Luskin, M. S. et al. (*Nature Communications*) | 2017 | Sumatran tiger survival threatened by deforestation despite increasing densities in parks | https://doi.org/10.1038/s41467-017-01656-4 | Story 2 |
| `klhk-sipongi` | Direktorat Pengendalian Kebakaran Hutan, Kementerian Kehutanan RI (SiPongi+) | 2015–2024 | Rekapitulasi Luas Kebakaran Hutan dan Lahan (Karhutla) Indonesia — SiPongi+ | https://sipongi.gakkum.kehutanan.go.id/indikasi-luas-kebakaran | Story 3 |
| `anda-2021` | Anda, M. et al. (*Geoderma*, Vol. 402, 115235) | 2021 | Revisiting tropical peatlands in Indonesia: Semi-detailed mapping, extent and depth distribution assessment | https://doi.org/10.1016/j.geoderma.2021.115235 | Story 3 |
| `huijnen-2016` | Huijnen, V. et al. (*Scientific Reports*, 6, 26886) | 2016 | Fire carbon emissions over maritime southeast Asia in 2015 largest since 1997 | https://doi.org/10.1038/srep26886 | Story 3 |
| `field-2016` | Field, R. D. et al. (*PNAS*, 113(33), 9204–9209) | 2016 | Indonesian fire activity and smoke pollution in 2015 show persistent nonlinear sensitivity to El Niño-induced drought | https://doi.org/10.1073/pnas.1524888113 | Story 3 |
| `worldbank-2016` | World Bank Group (Glauber, A. J., Moyer, S., Adriani, M., & Gunawan, I.) | 2016 | The Cost of Fire: An Economic Analysis of Indonesia's 2015 Fire Crisis | https://hdl.handle.net/10986/23840 | Story 3 |
| `worldbank-2019` | World Bank Group | 2019 | Indonesia Economic Quarterly, December 2019: Investing in People | https://hdl.handle.net/10986/33033 | Story 3 |
| `perpres-1-2016` | Pemerintah Republik Indonesia (Ditjen PP / JDIH) | 2016 | Peraturan Presiden Nomor 1 Tahun 2016 tentang Badan Restorasi Gambut | https://peraturan.go.id/id/perpres-no-1-tahun-2016 | Story 3 |
| `perpres-120-2020` | Pemerintah Republik Indonesia (Ditjen PP / JDIH) | 2020 | Peraturan Presiden Nomor 120 Tahun 2020 tentang Badan Restorasi Gambut dan Mangrove | https://peraturan.go.id/id/perpres-no-120-tahun-2020 | Stories 3, 5 |
| `nater-2017` | Nater, A. et al. (*Current Biology*) | 2017 | Morphometric, Behavioral, and Genomic Evidence for a New Orangutan Species | https://doi.org/10.1016/j.cub.2017.09.047 | Story 4 |
| `nowak-2017` | Nowak, M. G. et al. (IUCN Red List) | 2017 | *Pongo tapanuliensis*. The IUCN Red List of Threatened Species 2017: e.T120588639A120588662 | https://doi.org/10.2305/IUCN.UK.2017-3.RLTS.T120588639A120588662.en | Story 4 |
| `wich-2016` | Wich, S. A. et al. (*Science Advances*) | 2016 | Land-cover changes predict steep declines for the Sumatran orangutan (*Pongo abelii*) | https://doi.org/10.1126/sciadv.1500789 | Story 4 |
| `singleton-2024` | Singleton, I. et al. (IUCN Red List) | 2017 / 2024 | *Pongo abelii*. The IUCN Red List of Threatened Species | https://doi.org/10.2305/IUCN.UK.2024-1.RLTS.T121097935A259045437.en | Story 4 |
| `klhk-pmn-2021` | Kementerian Lingkungan Hidup dan Kehutanan (KLHK) | 2021 | Peta Mangrove Nasional (PMN) 2021 (SK.926/MENLHK/PDASHL/DAS.1/10/2021) | https://www.kehutanan.go.id/ | Story 5 |
| `murdiyarso-2015` | Murdiyarso, D. et al. (*Nature Climate Change*, 5, 1089–1092) | 2015 | The potential of Indonesian mangrove forests for global climate change mitigation | https://doi.org/10.1038/nclimate2734 | Story 5 |
| `arifanti-2022` | Arifanti, V. B. et al. (*Global Change Biology*, 28(14), 4358–4375) | 2022 | Contributions of mangrove conservation and restoration to climate change mitigation in Indonesia | https://doi.org/10.1111/gcb.16216 | Story 5 |
| `sasmito-2023` | Sasmito, S. D. et al. (*Nature Ecology & Evolution*) | 2023 | Challenges and opportunities for achieving Sustainable Development Goals through restoration of Indonesia's mangroves | https://doi.org/10.1038/s41559-022-01926-5 | Story 5 |

---

## 12. Visual Asset Attributions

All 9 photographic assets are stored locally in `public/images/` alongside the original project vector emblem (`public/favicon.svg`):

| Local Path | Role | Author / Creator | License | Wikimedia Commons / NASA Source |
|---|---|---|---|---|
| `/images/riau-palm-oil-2007.jpg` | Story 1 Hero (`sumatra-rainforest-deforestation`) | Hayden | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | https://commons.wikimedia.org/wiki/File:Riau_palm_oil_2007.jpg |
| `/images/sumatran-tiger.jpg` | Story 2 Hero (`sumatran-tiger-conservation`) | Theo Kruse (Burgers' Zoo) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | https://commons.wikimedia.org/wiki/File:Sumatran_tiger_(Panthera_tigris_sumatrae).jpg |
| `/images/sumatra-fires-modis-2015.jpg` | Story 3 Hero (`indonesia-peatland-fires`) | Jeff Schmaltz, MODIS Land Rapid Response Team, NASA GSFC | [Public Domain (NASA)](https://www.nasa.gov/nasa-brand-center/images-and-media/) | https://commons.wikimedia.org/wiki/File:Fires_in_southern_Sumatra_(MODIS_2015-09-13).jpg |
| `/images/gunung-leuser-orangutan.jpg` | Story 4 Hero (`sumatran-orangutan-leuser`) | Dennis Keller | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | https://commons.wikimedia.org/wiki/File:Gunung_Leuser_%26_Orang_Utans_(35738532710).jpg |
| `/images/benoa-bali-mangrove.jpg` | Story 5 Hero (`indonesia-mangrove-blue-carbon`) | CEphoto, Uwe Aranas | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | https://commons.wikimedia.org/wiki/File:Benoa_Bali_Indonesia-Mangrove-forest-01.jpg |
| `/images/blue-marble-earth.jpg` | Auxiliary — Home / Earth Explorer | NASA images by Reto Stöckli, based on data from NASA and NOAA | [Public Domain (NASA)](https://www.nasa.gov/nasa-brand-center/images-and-media/) | https://commons.wikimedia.org/wiki/File:Blue_Marble_Eastern_Hemisphere.jpg |
| `/images/bukit-tiga-puluh-deforestation.jpg` | Auxiliary — Story 1 Alt (Bukit Tiga Puluh Deforestation) | Aidenvironment (1998) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | https://commons.wikimedia.org/wiki/File:Deforestation_near_Bukit_Tiga_Puluh_NP.jpg |
| `/images/indonesia-fires-ground.jpg` | Auxiliary — Story 3 Alt (Fires Ground Perspective) | NASA's Earth Observatory | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | https://commons.wikimedia.org/wiki/File:Fires_in_Indonesia-_Perspective_from_the_Ground_(23569270392).jpg |
| `/images/gunung-leuser-canopy.jpg` | Auxiliary — Story 4 Alt (Gunung Leuser Canopy) | Ganjarmustika1904 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | https://commons.wikimedia.org/wiki/File:Hutan_Gunung_Leuser_Aceh.jpg |
| `/favicon.svg` | Site Brand Mark & Favicon | Original project SVG | MIT | Local project asset (`public/favicon.svg`) |
