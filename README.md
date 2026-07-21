# Elparo — Webstudio + Vite ❤️

Setup [Vite](https://vitejs.dev/) pour gérer tout le JS custom du site Elparo sur **Webstudio**.
Le code est bundlé en un seul fichier minifié servi via [jsDelivr](https://www.jsdelivr.com/) — **aucun compte NPM requis**.

## Charger le JS sur le site

Une seule ligne dans le custom code Webstudio (`Before </body> tag`), sur toutes les pages :

```html
<script src="https://cdn.jsdelivr.net/gh/USER/REPO@main/dist/main.js"></script>
```

> Remplacez `USER/REPO` par le repo GitHub. GSAP (+ ScrollTrigger + Observer) est **bundlé** :
> ne chargez pas de `<script>` GSAP CDN en plus, sinon deux instances entrent en conflit.

## Routing par page

Chaque page n'exécute que son propre script. Le tri se fait par une **classe sur le `<body>`**,
à définir dans Webstudio (Settings de la page → classe du body) :

| Classe body      | Script exécuté          |
| ---------------- | ----------------------- |
| `body--home`     | `src/pages/home.js`     |
| `body--projects` | `src/pages/projects.js` |
| `body--project`  | `src/pages/project.js`  |
| `body--contact`  | `src/pages/contact.js`  |

La transition entre pages (`initPageTransition`) s'exécute sur **toutes** les pages.

## Architecture

```
src/
  main.js               # entrée : transition + routing par classe body
  webstudio-utils.js    # window.Webstudio.onReady()
  lib/
    gsap.js             # import + enregistrement des plugins GSAP
    horizontal-loop.js  # helper officiel GSAP (slider mobile)
  shared/               # modules mutualisés (étaient dupliqués 4x)
    page-transition.js
    footer.js
    project-hover.js
    reveal-batch.js
  pages/                # un fichier par page, compose les modules
    home.js  projects.js  project.js  contact.js
  components/           # briques réutilisables, chacune null-safe
    slider-desktop.js  slider-mobile.js  scroll-text.js
    tag-cloud-grid.js  tag-cloud-magnetic.js  project-details.js
  styles/
    style.css           # injecté dans le bundle au chargement
```

Chaque module vérifie la présence de ses éléments dans le DOM (`if (!el) return`) :
un module appelé sur une page où l'élément n'existe pas est un no-op — plus de crash.

## Dev & build

```bash
yarn            # ou npm install
yarn dev        # serveur Vite + HMR sur http://localhost:3000
yarn build      # génère dist/main.js
yarn lint:fix   # eslint + prettier
```

Voir `HowToUse_JS_FR.md` pour le workflow complet (dev -> prod).

## CI/CD

- **CI** (`.github/workflows/ci.yml`) : lint sur chaque PR.
- **CD** (`.github/workflows/cd.yml`) : à chaque push sur `main`, build -> commit du `dist/` -> purge du cache jsDelivr. L'URL `@main` sert toujours la dernière version.
