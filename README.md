# ino.apps – Website (inoapps.de)

Statische Website: Dachmarke ino.apps mit Unterseite je App. Keine Datenbank, keine Cookies, keine externen Schriften.

## Struktur
| Pfad | Inhalt |
|---|---|
| `/index.html` | Dachmarke ino.apps (App-Übersicht, Kontakt) |
| `/impressum.html`, `/datenschutz.html` | Pflichtseiten für Website **und** alle Apps (Platzhalter gelb) |
| `/assets/` | gemeinsames Stylesheet, ino.apps-Signet/Favicon |
| `/immocase/index.html` | ImmoCase-Seite mit Live-Rechner |
| `/immocase/assets/` | `calc.js` (Rechenkern aus der App), Screenshots, App-Icon |
| `/immocase/datenschutz.html`, `/immocase/impressum.html` | Weiterleitungen auf die zentralen Pflichtseiten |
| `CNAME.beispiel` | bereits als `CNAME` angelegt (Inhalt: `inoapps.de`) |

Neue App: Ordner `/<app>/` nach Vorbild `immocase/` anlegen, Eintrag in `/index.html` (Liste `.apps`) ergänzen, Abschnitt in `datenschutz.html` mit Anker `#<app>` ergänzen.

## URLs für App Store Connect (ImmoCase)
- Datenschutz-URL: `https://inoapps.de/datenschutz.html#immocase`
- Support-URL: `https://inoapps.de/immocase/`
- Marketing-URL: `https://inoapps.de/immocase/`

## Vor dem Veröffentlichen
1. `immocase/index.html`: Platzhalter zu Pro-Umfang/Preis ersetzen
2. Links in der App (Impressum/Datenschutz, `info.provider` in `de.js`) auf die URLs oben umstellen

## Hosting
Pfade sind root-relativ (`/assets/...`) – die Seite muss im Domain-Root liegen (eigene Domain).
GitHub Pages + Domain bei INWX:
1. Öffentliches Repo `inoapps-website` anlegen, Inhalt pushen (inkl. `CNAME`)
2. Repo → Settings → Pages → Source „Deploy from a branch“, `main` / `/ (root)`, Custom domain `inoapps.de`
3. GitHub-Profil → Settings → Pages → „Add a domain“ `inoapps.de` verifizieren (TXT-Record bei INWX)
4. INWX-DNS: A-Records `@` → 185.199.108.153, .109.153, .110.153, .111.153; AAAA `@` → 2606:50c0:8000::153, 8001::153, 8002::153, 8003::153; CNAME `www` → `<github-user>.github.io`
5. **MX- und TXT-Records von iCloud Mail nicht anfassen**, nur A/AAAA/CNAME `www` ergänzen bzw. INWX-Standard-A-Records (Parking) ersetzen
6. Nach DNS-Propagation „Enforce HTTPS“ aktivieren

## Lokal ansehen
Wegen root-relativer Pfade nicht per Doppelklick, sondern im Ordner:
`python3 -m http.server 8000` → http://localhost:8000
