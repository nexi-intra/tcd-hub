# Rebrand: Hønseinvasionen → Chickeninvasion, Game Corner → Arcade

## Baggrund
- Spillet "Hønseinvasionen" (EndlessDodger.tsx) skal have et ikke-dansk navn: "Chickeninvasion".
- "Game Corner"-modulet (som allerede indeholder alle 5 spil) skal omdøbes til "Arcade" — samme navn på begge sprog.

## Fase 1 — Chickeninvasion
- [x] `src/components/EndlessDodger.tsx`: in-game header "Hønseinvasionen" → "Chickeninvasion"
- [x] `src/views/GameCorner.tsx` (bliver til Arcade.tsx i fase 2): spilkortets `title` → "Chickeninvasion"
- [x] `src/views/ManagerPanel.tsx`: inder-fane-label + `gameTitle`-prop → "Chickeninvasion"

## Fase 2 — Game Corner → Arcade
- [x] Omdøb fil `src/views/GameCorner.tsx` → `src/views/Arcade.tsx`, komponent `GameCorner` → `Arcade`, prop-interface `GameCornerProps` → `ArcadeProps`
- [x] Hovedtitel i selve viewet: "Spilhjørnet"/"Game Corner" → "Arcade" (samme streng, drop ternary)
- [x] `src/App.tsx`: import + `View`-type + routing (`games` → `arcade`)
- [x] `src/lib/appNavigation.ts`: `AppViewId` (`games` → `arcade`)
- [x] `src/views/Hub.tsx`: modul-id + title/description-reference (`games` → `arcade`)
- [x] `src/components/CommandPalette.tsx`: modul-id + label → "Arcade"
- [x] `src/lib/translations.ts`: `hub.modules.games`→`hub.modules.arcade` (da/en = "Arcade"), `hub.descriptions.games`→`hub.descriptions.arcade`, `managerPanel.tabs.games`-værdi → "Arcade" (da/en)
- [x] `src/lib/modalStack.ts`: kommentar-reference opdateret

## Fase 3 — Verifikation & udrulning
- [x] `npm run build` + `npm test`
- [x] `npm run electron:build` + smoke-test + robocopy til `TCD-Hub 1.4.2` + asar-verifikation
- [x] git commit
