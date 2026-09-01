# Release 1.4.0 (større version)

Status: **UNDER UDVIKLING — MÅ IKKE RELEASES ENDNU**. Vent med release/build til alle ønskede ændringer er lavet og godkendt.

## Fase 1 — Klargøring
- [x] Ny branch `feature/1.4.0` oprettet (fra `feature/1.2.2-background-updates`)
- [x] Version bumpet 1.3.0 → 1.4.0 i `package.json` / `package-lock.json`
- [ ] Aftale hvilke features/ændringer der skal med i 1.4.0

## Fase 2 — Ændringer
_(udfyldes efterhånden som opgaver defineres)_
- [ ]

## Fase 3 — Test & validering
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Manuel smoke-test af app (start, login, kerne-views)

## Fase 4 — Release
- [ ] Merge til release-branch `release/1.4.0`
- [ ] Kør `scripts/build-release-v2.ps1`
- [ ] Kopiér kildekode til `TCD-Hub 1.4.0/tcd-hub-1.4.0 - Source code/`
- [ ] Publish opdatering (manifest.json + zip) til `TCD HUB STORAGE/updates/`
