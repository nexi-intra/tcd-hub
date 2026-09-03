# App-forbedringer — bedre oplevelse (baseret på kodegennemgang)

4 forbedringer identificeret fra kodegennemgang, prioriteret efter bruger-mærkbar effekt.

## Fase 1 — Hurtigere opstart (code-splitting)
- [ ] Lazy-load alle 14 views i App.tsx med `React.lazy()` + `Suspense`
- [ ] Tilføj en let loading-fallback (spinner/blank) mens et view hentes
- [ ] Verificér med build at der nu er flere mindre chunks i stedet for én ~1,5 MB fil
- [ ] Test at navigation mellem views stadig fungerer korrekt (inkl. Escape-navigation)

## Fase 2 — Stop stille fejl ved gem
- [ ] Find alle `window.kv.set()`/`window.kv.update()`-kald uden fejlhåndtering
- [ ] Tilføj konsekvent try/catch med bruger-synlig fejl-toast ("Kunne ikke gemme — prøv igen")
- [ ] Prioritér de views hvor data-tab er værst: ShiftSchedule, ManagerPanel, VacationCalendar, EmailSystem

## Fase 3 — Konsekvent brug af useKV-hook
- [ ] Identificér views der bruger rå `window.kv.get()` + manuel `subscribe()` i stedet for `useKV`
- [ ] Migrér til `useKV` hvor det er ligetil (uden at ændre forretningslogik)
- [ ] Prioritér views med hyppige cross-client opdateringer: Hub, ManagerPanel, ShiftSchedule

## Fase 4 — Testdækning for kritiske flows
- [ ] Sæt Vitest + React Testing Library op (nyt dev-dependency, ny `npm run test:ui`-kommando)
- [ ] Skriv tests for: login/signup, vagt-tildeling, guide gem/slet, session-håndtering
- [ ] Hold eksisterende Electron-tests (`test:store`, `test:updater`) uændrede

## Efter hver fase
- `npm run build` + `npm run electron:build` for at verificere
- Deploy til `TCD-Hub 1.4.2`
- Commit med beskrivende besked
