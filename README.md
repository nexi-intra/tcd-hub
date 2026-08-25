# Terminal Configuration & Dispatch Hub

Et samlet team hub for Terminal Configuration & Dispatch teamet med guides, feriekalender, vagtplanlægning, projekter, intern kommunikation og mange andre teamværktøjer.

Appen understøtter tre roller (**Admin**, **Manager**, **Bruger**), to sprog (**Dansk**/**Engelsk**) og både **lyst** og **mørkt** tema.

## 📑 Indhold

- [Installation og kørsel](#-installation-og-kørsel)
- [Login og adgang](#-login-og-adgang)
- [Gennemgående funktioner](#-gennemgående-funktioner)
- [Moduler](#-moduler)
  - [Hub (Dashboard)](#hub-dashboard)
  - [Feriekalender](#feriekalender)
  - [Vagtplan](#vagtplan)
  - [Team Oversigt](#team-oversigt)
  - [Projekter](#projekter)
  - [Email System](#email-system)
  - [Guide Bibliotek](#guide-bibliotek)
  - [Virtuel Notesbog](#virtuel-notesbog)
  - [Madplan](#madplan)
  - [Theme Builder](#theme-builder)
  - [Manager Panel](#manager-panel)
  - [Admin Panel](#admin-panel)
- [Email notifikationer](#-email-notifikationer)
- [Roller og adgang](#-roller-og-adgang)
- [Administrator](#-administrator)
- [License](#-license)

## � Installation og kørsel

Appen er en selvstændig React-app uden eksterne backend-afhængigheder. Alle data gemmes **lokalt** på din maskine (localStorage).

**Krav:** [Node.js](https://nodejs.org/) 20 eller nyere.

### Kør i browseren (udvikling)

```bash
npm install
npm run dev
```

Åbn derefter http://localhost:5000 i din browser.

### Kør som desktop-app (udvikling)

```bash
npm install
npm run electron:dev
```

### Byg en Windows .exe

```bash
npm install
npm run electron:build
```

Den færdige fil ligger derefter i `release/TCD Hub <version>.exe` — en portable .exe der kan køres direkte uden installation. Data gemmes automatisk lokalt i din brugerprofil og bevares mellem genstarter.

## �🔐 Login og adgang

- **Log ind** med email og adgangskode.
- **Opret konto** med fulde navn, email, telefonnummer og adgangskode (min. 6 tegn).
- **Bliv logget ind** mellem sessioner via "Husk mig".
- Nye brugere får som udgangspunkt rollen **Bruger**; roller kan efterfølgende tildeles af en admin.
- Adgang til funktioner styres af rollebaserede rettigheder (admin / manager / bruger).

## 🎨 Gennemgående funktioner

Følgende funktioner er tilgængelige på tværs af hele appen (typisk øverst til højre i alle moduler):

- **Sprogskift** — Skift mellem dansk og engelsk. Al tekst, labels, datoer og beskeder opdateres med det samme. Valget huskes.
- **Temaskift** — Skift mellem lyst og mørkt tema. Valget huskes på tværs af sessioner.
- **Brugerprofil** — Dropdown-menu med:
  - Visning af kontooplysninger.
  - Redigering af telefonnummer.
  - Ændring af adgangskode (kræver bekræftelse af nuværende kode).
  - Genvej til Admin Panel (kun for admins).
  - Log ud.
- **Tastaturgenveje** — ESC lukker moduler/dialoger, piletaster navigerer i kalendere.
- **Konsistente medarbejderfarver** — Hver medarbejder har en fast farve, der bruges ens i kalender, vagtplan og oversigter.

## 🧩 Moduler

### Hub (Dashboard)

Central startside med overblik over dagen og genveje til alle moduler.

- Navigationskort til alle moduler med ikon og beskrivelse.
- **Dagens vagter** — Se hvem der er på vagt i dag med rolle (farvekodet) og eventuelle kommentarer. Medarbejdere på ferie eller sygemeldt filtreres automatisk fra.
- **Fri i dag** — Liste over medarbejdere på godkendt ferie eller enkelt fridag.
- **Syge i dag** — Liste over medarbejdere med godkendt sygemelding i dag.
- **Dagens måltid** — Viser dagens ret fra madplanen.
- **Managere/admins:** genvej til email notifikationer med badge for ulæste, tæller for afventende godkendelser (opdateres løbende), samt hurtig tildeling og kommentarer til dagens vagter.

### Feriekalender

Planlæg og administrer ferie med godkendelsesworkflow.

- Månedskalender med navigation via dropdowns eller piletaster.
- Visuelle markeringer for **godkendt ferie**, **afventende anmodninger**, weekender, danske helligdage (2024–2026) og fødselsdage.
- **Anmod om ferie** — Vælg start- og slutdato samt valgfrie noter. Sender automatisk en notifikation til managere.
- **Anmod om en enkelt fridag** — Vælg en enkelt dag (weekender tillades ikke).
- **Annuller egne anmodninger** — Fjern afventende/godkendte anmodninger; managere notificeres.
- **Managere/admins:** se, rediger, godkend eller afvis hele teamets anmodninger.

### Vagtplan

Administrer daglige vagttildelinger og koordinér dækning.

- Kalenderbaseret overblik pr. måned.
- Se tildelinger pr. dag med medarbejder, rolle (farvekodet) og kommentarer.
- **Managere/admins:** opret, rediger og slet vagttildelinger (medarbejder, rolle, dato, kommentar) samt oprette og slette **vagtroller** med egen farve.
- Integreret visning af sygemeldinger, ferie, fødselsdage og danske helligdage direkte i kalenderen for nem planlægning af dækning.

### Team Oversigt

Medarbejderkatalog med kontaktoplysninger.

- Liste over alle registrerede teammedlemmer.
- Kort med navn, email (klikbar), telefon (klikbar på mobil), rolle-badge og avatar med initialer.
- Farvekodning pr. medarbejder på tværs af appen.

### Projekter

Samarbejde og opgavesporing på tværs af teamet.

- **Opret projekt** med titel og beskrivelse; status sættes automatisk til "Åben".
- **Overblik** over alle projekter med status-badge (Åben / I gang / Fuldført), opretter og oprettelsesdato.
- **Filtrér** (alle / mine / uden deltagere) og **sortér** (nyeste/ældste).
- **Søg** i projekttitler og beskrivelser.
- **Deltag i** eller **forlad** et projekt.
- **Opretter kan:** ændre status, administrere deltagere og slette projektet.

### Email System

Intern beskedplatform med indbakke, mapper og filtre.

- **Indbakke** med ulæste markeret; åbn beskeder i fuld visning.
- **Skriv ny email** — vælg modtager, emne og besked.
- **Sendt** — overblik over egne sendte beskeder.
- **Mapper** — opret, omdøb, farvelæg og slet egne mapper; flyt emails mellem mapper.
- **Søg og filtrér** — fritekstsøgning samt filtre for dato og afsender.
- **Marker som læst** og **slet** emails.
- **Managere:** særlig fane med afventende ferieanmodninger og hurtig godkendelse.

### Guide Bibliotek

Videnbase med kategoriserede procedurer og dokumentation.

- **Gennemse guides** i kort med titel, kategori (farvekodet), tags, opdateringsdato og indholds-preview.
- **Søg** i titel, indhold og tags samt **filtrér** på kategori (Procedurer, Teknisk, HR, Sikkerhed, Generel + egne).
- **Vis fuld guide** i visning med bevaret formatering, og download vedhæftet Word-dokument (.docx).
- **AI-chatassistent** — stil spørgsmål og få svar baseret på de gemte guides, med henvisning til relevante guides.
- **Managere/admins:** opret, rediger og slet guides (titel, kategori, indhold, tags, Word-upload) samt administrere kategorier.

### Virtuel Notesbog

Delte og personlige noter til samarbejde og dokumentation.

- **Delte noter** synlige for hele teamet og **personlige noter** kun for dig selv.
- **Opret note** med titel, indhold og valg af synlighed (delt/personlig).
- **Søg** i noter i den aktive fane.
- **Rediger og slet** egne noter (admins kan administrere alle).
- **Redigeringsattribuering** — se "Senest redigeret af" med tidspunkt.
- **Notifikationer** når en delt note, du har oprettet, redigeres af andre.

### Madplan

Ugentlig madplanlægning til pauser.

- **Ugenavigation** frem og tilbage med visning af ugenummer og år.
- Indtast ret/menu for hver hverdag (mandag–fredag).
- **Gem ugemenu** og se tidligere/kommende ugers menuer.

### Theme Builder

Opret og tilpas visuelle temaer.

- **Opret eget tema** med navn og op til 19 farveegenskaber (baggrund, tekst, kort, primær/sekundær, accent, destruktiv, kant, input, fokusring m.fl.) samt kantradius.
- **Færdige temaer** (fx Ocean Breeze, Sunset Glow, Forest Green, Royal Purple) samt standardtema.
- **Anvend** et tema med det samme, med live-preview af komponenter.
- **Rediger, slet, eksportér og importér** egne temaer (færdige temaer kan ikke slettes).

### Manager Panel

Administrativt dashboard for managere og admins.

- **Teammedlemmer** — opret, rediger og slet medarbejdere (navn, email, telefon, adgangskode).
- **Ferieanmodninger** — se, filtrér (alle/afventende/godkendt), godkend, afvis, rediger og slet anmodninger. Kalender-preview af de ønskede datoer. **Manuel ferietildeling** (enkelt dag eller periode) uden forudgående anmodning.
- **Sygemeldinger** — se, godkend, afvis, rediger og slet sygemeldinger (egen sygdom eller barns sygedag).
- **Fødselsdage** — tilføj, rediger og slet medarbejderes fødselsdage med aldersvisning.
- **Feriekalender-preview** — farvekodet månedsvisning af teamets ferie.
- Alle godkendelser/afvisninger genererer automatisk email notifikationer.

### Admin Panel

Systemadministration – kun for admins.

- **Brugeradministration** — opret, rediger og slet alle brugere samt tildel roller (admin/manager/bruger).
- **Vagtroller** — opret og slet vagtroller med egen farve.
- **Sygemeldingsoverblik** — se alle sygemeldinger på tværs af teamet med status.

## 📧 Email notifikationer

> **Appen kan ikke sende rigtige emails.** I stedet bruges et internt notifikationssystem.

- Når der indberettes sygemelding, anmodes om ferie/fridag, eller en anmodning godkendes/afvises, gemmes en "email notifikation" i systemet.
- Admins og managere kan åbne **Email Notifikationer** fra Hub'en og se alle notifikationer (ulæste markeres).
- Notifikationer indeholder al information, der ville være i en email (modtager, emne, besked).
- Indholdet kan **kopieres til udklipsholder** og sendes manuelt via din egen email-klient (Outlook, Gmail m.fl.).

**Automatiske notifikationer udløses ved:** ny ferieanmodning, godkendt/afvist ferie, sygemelding, godkendt/afvist sygemelding, anmodning om enkelt fridag, annullering af anmodning samt redigering af en delt note.

## 👥 Roller og adgang

| Funktion | Bruger | Manager | Admin |
|----------|:------:|:-------:|:-----:|
| Feriekalender (egne anmodninger) | ✅ | ✅ | ✅ |
| Sygemelding (egen) | ✅ | ✅ | ✅ |
| Vagtplan (visning) | ✅ | ✅ | ✅ |
| Team Oversigt | ✅ | ✅ | ✅ |
| Projekter | ✅ | ✅ | ✅ |
| Email System | ✅ | ✅ | ✅ |
| Guide Bibliotek (visning/søgning) | ✅ | ✅ | ✅ |
| Virtuel Notesbog | ✅ | ✅ | ✅ |
| Madplan | ✅ | ✅ | ✅ |
| Theme Builder | ✅ | ✅ | ✅ |
| Rediger guides | – | ✅ | ✅ |
| Opret/rediger vagttildelinger og -roller | – | ✅ | ✅ |
| Godkend/afvis ferie og sygemelding | – | ✅ | ✅ |
| Manuel ferietildeling | – | ✅ | ✅ |
| Administrer fødselsdage | – | ✅ | ✅ |
| Email notifikationer | – | ✅ | ✅ |
| Opret/rediger/slet medarbejdere | – | ✅ | ✅ |
| Brugeradministration og rolletildeling | – | – | ✅ |

## 👤 Administrator

Jacob Remmer (Jacob.remmer@nexigroup.com) er systemets administrator.

## 📄 License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
