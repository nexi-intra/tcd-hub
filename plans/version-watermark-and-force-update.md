# Version watermark + per-bruger versionsoversigt + force-update

## Fase 1 — Version-vandmærke i Hub
- [ ] Tilføj lille vandmærke nederst i venstre hjørne af Hub.tsx med "v{version}"
- [ ] Hent version via `window.electronUpdates.getStatus()` (falder tilbage til package.json-version i browser-mode)

## Fase 2 — Klient-version rapportering
- [ ] Ny KV-nøgle `client-versions` (object keyed by email): `{ version, platform, lastSeen, updatedAt }`
- [ ] I App.tsx: efter login og hvert 5. minut, skriv egen version+lastSeen via `setKvObjectField('client-versions', email, {...})`
- [ ] Ryd op i entries for brugere der er slettet (best effort, ikke kritisk)

## Fase 3 — Oversigt i Manager Panel (Datalagring-fane)
- [ ] Ny sektion under App-opdateringer: tabel med bruger, version, sidst set, status (up-to-date / outdated / offline)
- [ ] Sammenlign med `status.manifest.version` (seneste publicerede) for at markere outdated
- [ ] Badge farve: grøn = up-to-date, gul = outdated, grå = ikke set i 24t+

## Fase 4 — Force-update af specifik bruger
- [ ] Ny KV-nøgle `force-update-targets` (array af emails)
- [ ] Manager-knap pr. bruger: "Tving opdatering" → tilføjer email til listen
- [ ] main.cjs: watcher tjekker om egen email er i target-listen → trigger automatisk `updates:install`-flow uden brugerinteraktion → fjerner sig selv fra listen bagefter
- [ ] Vis kort statusbesked/toast til brugeren når det sker ("Din app opdateres automatisk...")

## Fase 5 — Byg og test
- [ ] `npm run build`
- [ ] Test lokalt: to klienter, publicér ny version, force-update den ene, verificér automatisk installation
- [ ] Deploy til test-mappe

## Bonus (allerede løst)
- [x] Fix "g" der stak ud af ferie-badges i månedskalenderen (Manager Panel → Ferie Oversigt) — for stram line-height på text-[9px] badges
