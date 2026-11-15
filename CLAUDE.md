# Trevol - reisplanner (Dolomieten 2027)

Persoonlijke planner voor Milans roadtrip (Oostkamp → Dolomieten, Tesla Model Y, 2 personen + hond Teddie).
UI-taal: Nederlands. Huisregel: geen em dashes (—), gebruik gewone koppeltekens.

## Structuur
- `index.html` - de volledige app (HTML, CSS en JS in één bestand). Bevat ook de laadpalen-dataset (`const CHARGERS`, GeoJSON uit OpenStreetMap, snapshot nov 2026).
- `api/state.js` - GET/POST van de gedeelde staat (to-do's, paklijst, budget, notities, foto-verwijzingen, instellingen).
- `api/photo.js` - upload (POST, base64 JPEG) en verwijderen (DELETE) van eigen foto's in Vercel Blob.
- `api/_lib.js` - code-check en opslag: één JSON-document `state/<STATE_KEY>.json` in een publieke Vercel Blob-store.
- `api/_seed.js` - beginstaat (overgezet uit de vorige Claude-artifactversie).

## Omgevingsvariabelen (Vercel)
- `ACCESS_CODE` - toegangscode die de app vraagt (header `x-code`).
- `STATE_KEY` - willekeurige, lange string; maakt het pad van het state-bestand onvoorspelbaar.
- `BLOB_READ_WRITE_TOKEN` - komt automatisch als een Blob-store aan het project gekoppeld is.

## Deployen (privé-account `graatvis`)
De standaard CLI-login is het VICAR-account. Graatvis heeft een aparte login: gebruik altijd
`~/.local/bin/vercel --global-config ~/.vercel-graatvis ...` (CLI staat in `~/.local`, updaten met `npm i -g vercel@latest --prefix ~/.local`).
De Vercel MCP-connector in Claude ziet alleen VICAR, niet graatvis.

Al gedaan (15 nov 2026): project `graatvis/dolomieten-2027` gekoppeld, publieke Blob-store `dolomieten-2027` (fra1) gekoppeld (`BLOB_READ_WRITE_TOKEN`), `STATE_KEY` gezet (production + preview, sensitive).
`ACCESS_CODE` staat op production (preview: `env add ACCESS_CODE preview --sensitive --yes`, Git-branch leeg laten).
Live: https://dolomieten-2027.vercel.app. Git: github.com/Graatvis/trevol (publiek), gekoppeld aan Vercel; elke push naar `main` deployt automatisch naar productie.
Commits in deze repo met `milan@graatvis.be` (lokaal ingesteld in .git/config).

Lokaal zonder Vercel: `npm run dev` (dev.mjs, code `dev`). `.vercelignore` houdt dev-bestanden, CLAUDE.md en README uit de deploy.

## Kaart
MapLibre GL 5 (via jsDelivr). Drie stijlen: Kaart (OpenFreeMap Liberty + hillshade), Satelliet (EOX Sentinel-2 cloudless 2021, CC BY-NC-SA 4.0, niet-commercieel) met OSM-labels, Topo (OpenTopoMap).
3D-terrein: AWS Terrain Tiles (terrarium). Globe-projectie bij ver uitzoomen. Toggles: 3D, noorden, hele route, publieke laadpalen.
Foto's: eigen uploads + automatisch geotagde foto's uit Wikimedia Commons (met naamsvermelding in de lightbox). Campingfoto's van hun eigen websites niet kopiëren (auteursrecht); er staat een Website-knop.

## Nog te checken na eerste deploy
- Laden alle tegels (OpenFreeMap, EOX, OpenTopoMap, AWS) en Wikimedia-foto's live?
- Gelijktijdig bewerken: schrijfacties gaan per item via POST; de server leest-wijzigt-schrijft één JSON-bestand.
