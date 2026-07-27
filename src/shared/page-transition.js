// page-transition.js — animation de transition entre pages (rideau `.transition`).
// Mutualisé : ce bloc était copié à l'identique dans home / project / projects / contact.
import { gsap } from '../lib/gsap.js'

function revealTransition() {
  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve })
    tl.fromTo(
      '.transition',
      { translateY: 0 },
      {
        translateY: '-100vh',
        duration: 1.5,
        delay: 0.2,
        stagger: { each: 0.1, from: 'start', grid: [1, 3] },
        ease: 'expo.inOut',
      },
      0
    )
  })
}

// Webstudio publie une app **Remix** : React hydrate la page ~1s après notre
// init et RECRÉE les nœuds du rideau → tous les styles inline posés par GSAP
// (visibility:hidden, translateY:-100vh) sont effacés, le rideau repart à son
// état initial « couvrant » pendant quelques frames, alors que l'intro est
// finie depuis longtemps. C'était le flash noir après le chargement (« le menu
// qui s'affiche entre deux transitions »).
//
// Un style INLINE se fait effacer par l'hydratation ; une règle CSS dans
// <head>, non — et elle s'applique aussi aux nœuds recréés. On verrouille donc
// le rideau en CSS dès que l'intro est finie, et on déverrouille juste avant
// de le rejouer.
//
// `display:none` et surtout PAS `visibility:hidden` : le rideau est un calque
// composité (position:fixed plein écran, z-index 9999, `will-change:transform`
// sur les volets). En `visibility:hidden` le calque RESTE dans l'arbre de
// composition, posé au-dessus du hero — et ce qui est dessous n'est plus
// réinvalidé quand les images finissent de décoder : sur la home, 4 des 7
// vignettes du slider ne se peignaient jamais tant qu'on ne survolait pas une
// vignette (le `style.width` du hover forçait enfin le repaint). Vérifié par
// contrôle : injecter une règle sans effet ne débloque rien, `display:none`
// sur .transition_div débloque les 7 immédiatement.
const DONE_STYLE_ID = 'ws-transition-done'

function lockCurtainHidden() {
  if (document.getElementById(DONE_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = DONE_STYLE_ID
  style.textContent = '.transition_div{display:none!important;}'
  document.head.appendChild(style)
}

function unlockCurtain() {
  document.getElementById(DONE_STYLE_ID)?.remove()
}

// CHIEN DE GARDE — le rideau figé rend la page inutilisable (écran plein).
// Observé sur certaines pages projet atteintes depuis le slider du hero, de
// façon intermittente : l'intro ne se joue jamais et le rideau reste couvrant.
// Non reproduit en test (chargement direct ET clic depuis le hero fonctionnent),
// donc la cause reste ouverte — mais un visiteur ne doit pas rester bloqué.
//
// On vérifie donc tardivement que l'intro a bien eu lieu (le verrou CSS en est
// la preuve). Sinon on journalise l'état complet pour le diagnostic, puis on
// débloque. DELAI généreux : l'intro dure ~1,9s, et l'init peut lui-même partir
// jusqu'à 3s après le chargement si le DOM ne se stabilise pas.
const WATCHDOG_MS = 6000

function surveilleRideau() {
  setTimeout(() => {
    if (document.getElementById(DONE_STYLE_ID)) return // intro terminée : OK

    const panneau = document.querySelector('.transition')
    if (!panneau) return
    const style = getComputedStyle(panneau)
    const couvreEncore =
      style.visibility === 'visible' &&
      panneau.getBoundingClientRect().bottom > 1
    if (!couvreEncore) return

    console.warn(
      '[transition] rideau figé après %dms — déblocage forcé',
      WATCHDOG_MS,
      {
        url: location.pathname,
        inlineDuDiv: document
          .querySelector('.transition_div')
          ?.getAttribute('style'),
        volets: [...document.querySelectorAll('.transition')].map(
          (p) =>
            getComputedStyle(p).visibility + ' ' + getComputedStyle(p).transform
        ),
      }
    )

    gsap.set('.transition', { visibility: 'hidden' })
    lockCurtainHidden()
  }, WATCHDOG_MS)
}

function animateTransition() {
  return new Promise((resolve) => {
    unlockCurtain()
    gsap.set('.transition', { visibility: 'visible', translateY: '-100vh' })
    const tl = gsap.timeline({ onComplete: resolve })
    tl.fromTo(
      '.transition',
      { translateY: '-100vh' },
      {
        translateY: 0,
        duration: 1,
        stagger: { each: 0.1, from: 'start', grid: [1, 3] },
        ease: 'expo.out',
      },
      0
    )
  })
}

// Interception des clics sur les liens internes, PAR DÉLÉGATION en phase
// capture. Deux raisons cruciales :
//  1) La délégation capte AUSSI les liens montés après l'init (ex. les liens du
//     menu Radix, ajoutés au DOM à l'ouverture) — un `forEach` sur les <a> à
//     l'init les ratait.
//  2) Webstudio publie une app **Remix** : les liens internes déclenchent une
//     navigation **client-side (SPA)**, et `Webstudio.onReady` ne re-tourne PAS
//     sur ces changements de route → `initPageTransition` ne rejoue pas → le
//     rideau reste figé en position couvrante. En interceptant en capture +
//     stopImmediatePropagation, on court-circuite le SPA de Remix, puis on
//     navigue « en dur » (`window.location.href`) → l'intro rejoue proprement.
function onLinkClick(e) {
  // Laisse passer : clics modifiés (nouvel onglet), clic droit/milieu.
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  )
    return

  const link = e.target.closest('a')
  if (!link) return
  const href = link.getAttribute('href')
  if (!href) return
  // Ignore : ancres, mailto/tel, nouvel onglet, téléchargement.
  if (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    link.target === '_blank' ||
    link.hasAttribute('download')
  )
    return

  const url = new URL(href, window.location.href)
  if (url.origin !== window.location.origin) return // lien externe
  if (url.pathname === window.location.pathname) return // même page

  // Lien interne → on joue le rideau puis navigation DURE (contourne le SPA).
  e.preventDefault()
  e.stopImmediatePropagation()
  animateTransition().then(() => {
    window.location.href = url.href
  })
}

// Renvoie une Promise résolue quand le rideau a fini de se lever — le moment où
// la page devient réellement visible. Tout ce qui dépend de pixels réellement
// peints (voir force-image-repaint.js) doit attendre ce signal : tant que le
// rideau couvre l'écran, Chrome ne rastérise pas ce qu'il masque.
export default function initPageTransition() {
  if (!document.querySelector('.transition')) return Promise.resolve()

  // Le rideau DOIT passer au-dessus de tout (navbar, #cloud, images…). La
  // valeur de référence est désormais dans styles/style.css (z-index:9999) —
  // elle s'applique dès l'injection du CSS, sans attendre ce JS. Ce
  // setProperty ne reste qu'en filet de sécurité si une règle Webstudio
  // publiée plus tard venait à reprendre la main.
  document
    .querySelector('.transition_div')
    ?.style.setProperty('z-index', '9999', 'important')

  // Un seul écouteur délégué, en capture (removeEventListener d'abord pour
  // l'idempotence si l'init rejouait).
  document.removeEventListener('click', onLinkClick, true)
  document.addEventListener('click', onLinkClick, true)

  surveilleRideau()

  // Animation d'intro (le rideau se lève).
  //
  // `opacity: 0.999` — imperceptible à l'œil, décisif pour Chrome. Chrome
  // n'effectue PAS la rastérisation de ce qui est intégralement recouvert par
  // un calque **opaque** (occlusion culling). Le rideau étant plein écran et
  // parfaitement opaque (`background:#222`), les images qui finissaient de
  // décoder pendant l'intro n'étaient jamais peintes — et rien ensuite ne les
  // réinvalidait : sur la home, seules 3 des 7 vignettes du hero apparaissaient,
  // les autres attendant un survol.
  //
  // Ce qui a mis la puce à l'oreille : EN LOCAL le bug n'existe pas. En dev le
  // CSS du bundle (qui donne son fond au rideau) arrive tard, donc le rideau
  // reste transparent pendant que les images décodent et Chrome les rastérise
  // normalement. En prod ce CSS est injecté en ~100ms. Même code, comportement
  // opposé : la différence n'est pas le code mais le MOMENT où le rideau
  // devient opaque.
  //
  // Une opacité de 0.999 suffit à retirer le calque de la catégorie « opaque »
  // sans aucune différence visible. Safari et Firefox n'en ont pas besoin.
  unlockCurtain()
  gsap.set('.transition', {
    visibility: 'visible',
    translateY: 0,
    opacity: 0.999,
  })
  return revealTransition().then(() => {
    gsap.set('.transition', { visibility: 'hidden' })
    lockCurtainHidden() // survit à l'hydratation Remix (voir plus haut)
  })
}
