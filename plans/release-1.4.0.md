# Release 1.4.0 (større version)

Status: **UNDER UDVIKLING — MÅ IKKE RELEASES ENDNU**. Vent med release/build til alle ønskede ændringer er lavet og godkendt.

## Fase 1 — Klargøring
- [x] Ny branch `feature/1.4.0` oprettet (fra `feature/1.2.2-background-updates`)
- [x] Version bumpet 1.3.0 → 1.4.0 i `package.json` / `package-lock.json`
- [ ] Aftale hvilke features/ændringer der skal med i 1.4.0

## Fase 2 — Ændringer
- [x] Fix: "g" i overskriften "Terminal Configuration & Dispatch Hub" blev klippet af (bg-clip-text + for tæt line-height) på Auth- og Hub-siden
- [x] Fix: navne/score passede ikke pænt ind i highscore-rækkerne i alle 5 spil (rank-badge og score kunne krympe/wrappe) - nu `shrink-0`/`tabular-nums`
- [x] Tetris: fjernet sværhedsgrads-valg og levels - ét samlet highscores; spillet bliver nu selv gradvist sværere (fart stiger ud fra linjer ryddet + forløbet spilletid), med automatisk migrering af gammel opdelt highscore-/spilstatistik-data
- [x] ManagerPanel: admin/manager kan sætte et valgfrit brugernavn på en bruger; login virker med både email og brugernavn
- [x] Sikkerhedsfix (fundet undervejs): manager-oprettede/-redigerede adgangskoder blev gemt i klartekst i stedet for hashet - rettet til at bruge `hashPassword`
- [ ]

## Fase 3 — Test & validering
- [x] `npm test` (10/10 bestået)
- [x] `npm run build` (ingen fejl)
- [ ] Manuel smoke-test af app (start, login, kerne-views)

## Fase 4 — Release
- [ ] Merge til release-branch `release/1.4.0`
- [ ] Kør `scripts/build-release-v2.ps1`
- [ ] Kopiér kildekode til `TCD-Hub 1.4.0/tcd-hub-1.4.0 - Source code/`
- [ ] Publish opdatering (manifest.json + zip) til `TCD HUB STORAGE/updates/`
