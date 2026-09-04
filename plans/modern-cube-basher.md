# Nyt undermodul "Modern" i Game Corner + Cube Basher

## Baggrund
- Game Corner skal have et nyt sideordnet undermodul ved siden af Arcade: **Modern** — hjem for større,
  moderne 3D-spil (roguelite/survivor-likes), i modsætning til Arcades små klassiske retro-spil.
- Første spil i Modern: [Cube Basher](https://github.com/mreflow/cube-basher) (licens: "do whatever you
  want with it"). Flere store spil (fx The Librarian 2) kan følge senere — Modern skal ikke være
  cube-specifik i navn/struktur.

## Teknisk grundfakta (bekræftet)
- Cube Basher er ÉN `index.html`-fil: inline CSS + `<script type="module">`, importerer three.js r0.160.0
  + et par `three/addons/...`-moduler via et importmap fra jsdelivr-CDN'en. Ingen build-step i sig selv.
- Spillet tegner sin egen `<canvas>` direkte via `document.body.appendChild(renderer.domElement)`, sætter
  sine egne `window`/`document`-keydown-lyttere (WASD/Shift/Space/P/Esc/M), og kører en uendelig
  `requestAnimationFrame`-løkke UDEN nogen form for oprydnings-/dispose-logik (det er skrevet til at være
  den eneste ting på en side, aldrig unmountet). At omskrive dette til en ren React-komponents
  mount/unmount-livscyklus ville kræve en betydelig, risikabel omskrivning af ukendt tredjeparts-kode.
- Egen Escape/P-håndtering: skifter internt mellem 'play'/'pause' og viser/skjuler en `#pauseScr`-div —
  det er IKKE det samme som appens egen Escape-baserede tilbage-navigation.
- Gemte data: én `localStorage`-nøgle (`cubebasher_v1`, JSON: coins + permanente upgrades). Simpel,
  browser-lokal — ingen ændring nødvendig for v1 (ingen krydsklient-leaderboard for dette spil endnu).
- Appens Electron-opsætning: `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, INGEN
  `nodeIntegrationInSubFrames` → en iframe med tredjeparts-indhold kører allerede fuldt sandboxed uden
  Node/Electron-adgang. Ingen CSP sat; appen loades via `win.loadFile` (`file://`) med Vite `base: './'`,
  og der findes allerede en `public/`-mappe hvis indhold Vite kopierer uændret til `dist/`.

## Valgt tilgang: iframe til en lokalt vendoret, offline-klar kopi
I stedet for at omskrive Cube Bashers tætkoblede modul-kode til en React-komponent (høj risiko for at
ødelægge fysik/balancing ved et uheld), køres spillet i en `<iframe>` der peger på en lokal, offline-klar
kopi af `index.html`. En iframe er sit eget browsing-context: at afmontere iframe'en rydder GARANTERET
alle dens event-listeners og stopper dens rAF-løkke — det løser mount/unmount-problemet uden at røre
spillets interne kode. Escape/pause håndteres af spillet selv INDE i iframen; tilbage til Modern-oversigten
sker via en synlig knap uden for iframen (ligesom de øvrige "Tilbage til X"-knapper i appen).

## Fase 1 — Vendoring (offline-adgang, ingen CDN-afhængighed)
- [ ] `npm install three@0.160.0` (pinned til samme version som spillets importmap)
- [ ] Kopiér `node_modules/three/build/three.module.js` samt HELE `node_modules/three/examples/jsm/`
      (ikke kun de 6 filer spillet direkte importerer — resten af `jsm`-træets interne relative imports
      skal også kunne resolve) til `public/games/cube-basher/vendor/three/`
- [ ] Hent spillets `index.html` fra GitHub (raw) ned i `public/games/cube-basher/index.html`
- [ ] Eneste redigering af selve spilfilen: omskriv `<script type="importmap">` fra jsdelivr-URLs til
      lokale relative stier (`./vendor/three/build/three.module.js` osv.) — INGEN ændringer i selve
      spillogikken
- [ ] Vurdér Google Fonts-linket (Lilita One/Nunito): behold som ekstern (fejler gracefuls til
      fallback-font offline) ELLER vendor også disse — beslutning tages i fase 1, ikke blokerende
- [ ] Verificér lokalt at spillet kan åbnes direkte (fx `npx serve public/games/cube-basher`) uden
      netværkskald til jsdelivr/fonts.googleapis (DevTools Network-fane, offline-tilstand)

## Fase 2 — "Modern" undermodul + iframe-wrapper
- [ ] `src/views/GameCorner.tsx`: tilføj et andet kort "Modern" ved siden af "Arcade" (samme
      korts-stil/hover-animation), `view`-type udvides til `'hub' | 'arcade' | 'modern'`
- [ ] Nyt `src/views/Modern.tsx`: landing-side i samme stil som Arcade/GameCorner — header "Modern" +
      ét kort "Cube Basher" (fx `Cube`-ikon fra phosphor-icons), klik åbner selve spil-wrapperen
- [ ] Ny `src/components/CubeBasherGame.tsx`: renderer en `<iframe src="./games/cube-basher/index.html">`
      i fuld skærm, `sandbox`-attribut sat konservativt (`allow-scripts allow-pointer-lock` — det
      minimum spillet behøver: moduler kører, pointer lock til kamera-drag), `title`-attribut for
      tilgængelighed
- [ ] `data-game-active`-attribut sættes på `<body>` mens denne komponent er monteret (samme konvention
      som Arcade.tsx), fjernes ved unmount
- [ ] Synlig "← Tilbage"-knap OVEN PÅ iframen (ikke afhængig af Escape, da Escape fanges inde i
      iframen af spillets egen pause-menu) der navigerer tilbage til Modern's `view='hub'`

## Fase 3 — Navigation & Escape-koordinering
- [ ] `Modern.tsx` får samme mønster som `GameCorner.tsx`: egen Escape-lytter der tjekker
      `isAnyModalOpen()` og eget `view !== 'hub'`-niveau, før den kalder sin egen `onNavigateBack()`
- [ ] `GameCorner.tsx`s eksisterende Escape-lytter skal fortsat korrekt defer'e når `view === 'modern'`
      (allerede dækket af det generiske `if (view !== 'hub') return`-tjek — ingen ændring nødvendig,
      men verificeres eksplicit)
- [ ] `src/lib/modalStack.ts`: kommentar opdateres til at nævne Modern/Cube Basher ved siden af Arcade

## Fase 4 — Verifikation & udrulning
- [ ] `npm run build` + `npm test`
- [ ] Manuel/smoke-test af den PAKKEDE app: Hub → Game Corner → Modern → Cube Basher, bekræft spillet
      loader og kan spilles, ingen netværkskald (offline-test), tilbage-knap virker, Escape lukker ikke
      utilsigtet resten af appen
- [ ] `npm run electron:build` + smoke-test + robocopy til `TCD-Hub 1.4.2` + asar-verifikation
- [ ] git commit
