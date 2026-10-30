// langue.js — langue de la page courante et bascule FR / EN.
//
// Les pages FR sont les copies des pages EN sous le préfixe /fr, avec les
// mêmes chemins : /about/ ↔ /fr/about/, / ↔ /fr. Le slug des projets et
// catégories est commun aux deux langues.

// Préfixe des pages françaises.
const PREFIXE_FR = '/fr'

function estCheminFr(chemin) {
  return chemin === PREFIXE_FR || chemin.startsWith(PREFIXE_FR + '/')
}

// Langue de la page. On lit d'abord l'adresse, plus fiable que <html lang>
// après une navigation SPA (rien ne garantit que Webstudio remette l'attribut
// à jour) ; <html lang> sert de repli.
export function langueCourante() {
  if (estCheminFr(window.location.pathname)) return 'fr'
  const lang = (document.documentElement.lang || 'en').toLowerCase()
  return lang.startsWith('fr') ? 'fr' : 'en'
}

// Adresse équivalente de la page courante dans l'autre langue.
//   /about/ → /fr/about/     /fr/about/ → /about/     / ↔ /fr
function cheminDansLangue(cible) {
  const { pathname, search, hash } = window.location
  let chemin = pathname
  if (cible === 'fr') {
    if (!estCheminFr(chemin))
      chemin = chemin === '/' ? PREFIXE_FR : PREFIXE_FR + chemin
  } else if (estCheminFr(chemin)) {
    chemin = chemin.slice(PREFIXE_FR.length) || '/'
  }
  return chemin + search + hash
}

// Liens de bascule posés dans les deux navbars (Webstudio) : #lang-fr, #lang-en.
const SELECTEUR = '#lang-fr, #lang-en'
const cibleDuLien = (lien) => (lien.id === 'lang-fr' ? 'fr' : 'en')

// Met à jour href et état actif. Appelé au survol / focus, pour que l'adresse
// affichée en bas du navigateur soit juste même si React a remis `#`.
function prepareLien(lien) {
  const cible = cibleDuLien(lien)
  lien.setAttribute('href', cheminDansLangue(cible))
  if (cible === langueCourante()) lien.setAttribute('aria-current', 'true')
  else lien.removeAttribute('aria-current')
}

function surSurvol(e) {
  const lien = e.target.closest?.(SELECTEUR)
  if (lien) prepareLien(lien)
}

// Clic : rechargement COMPLET vers l'autre langue, pas de navigation SPA.
// Écouté sur `window` en capture, donc AVANT l'écouteur de page-transition.js
// (posé sur `document`) : la transition animée ne voit jamais ce clic.
function surClic(e) {
  const lien = e.target.closest?.(SELECTEUR)
  if (!lien) return
  e.preventDefault()
  e.stopPropagation()
  const cible = cibleDuLien(lien)
  if (cible === langueCourante()) return // déjà dans cette langue
  window.location.assign(cheminDansLangue(cible))
}

export default function initLangue() {
  // Délégation sur window : survit aux re-rendus React de la navbar.
  window.removeEventListener('click', surClic, true)
  window.addEventListener('click', surClic, true)
  window.removeEventListener('pointerover', surSurvol, true)
  window.addEventListener('pointerover', surSurvol, true)
  window.removeEventListener('focusin', surSurvol, true)
  window.addEventListener('focusin', surSurvol, true)
}
