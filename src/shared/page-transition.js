// page-transition.js — animation de transition entre pages (rideau `.transition`).
// Mutualisé : ce bloc était copié à l'identique dans home / project / projects / contact.
import { gsap } from '../lib/gsap.js'

// Décalage entre les 3 volets. Volontairement un simple nombre, et SURTOUT pas
// `{ grid: [1, 3] }` comme avant : cette grille était figée à 3 cellules et se
// dégradait EN SILENCE dès que le nombre de volets changeait. Quand un <h1>
// portait aussi la classe `.transition`, GSAP recevait 4 cibles, la 4e passait
// en 2e ligne de la grille et se retrouvait à la même distance que la 2e —
// donc au même délai. Le volet de droite se levait exactement avec celui du
// milieu, sans aucune erreur en console. Un stagger simple échelonne par index,
// quel que soit le nombre d'éléments.
//
// 0.25s et non 0.1 : l'animation dure 1,5s en expo.inOut, une courbe qui laisse
// le volet quasi immobile pendant les premiers 40% puis le projette d'un coup.
// À 0,1s d'écart, les trois « coups » se chevauchaient presque entièrement et
// l'œil ne lisait qu'un seul départ. Valeur esthétique, à ajuster librement.
const DECALAGE_VOLETS = 0.25

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
        stagger: DECALAGE_VOLETS,
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
        stagger: DECALAGE_VOLETS,
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
// peints doit attendre ce signal : tant que le rideau couvre l'écran, Chrome ne
// rastérise pas ce qu'il masque.
export default function initPageTransition() {
  // L'écouteur de liens ne dépend pas des volets : on le branche tout de suite,
  // même si le rideau n'est pas encore là.
  document.removeEventListener('click', onLinkClick, true)
  document.addEventListener('click', onLinkClick, true)

  if (document.querySelector('.transition')) return joueIntro()

  // VOLETS ABSENTS À L'INIT — ne surtout pas renoncer.
  //
  // La porte d'attente de webstudio-utils peut s'ouvrir pendant une accalmie du
  // DOM, AVANT que Remix ait fini de rendre la page. Les volets arrivent alors
  // après nous. L'ancienne version retournait ici, et plus rien ne relançait
  // jamais l'intro : le rideau restait figé en position couvrante, écran plein,
  // page inutilisable.
  //
  // Reproduit en naviguant PAR LE MENU vers /projets/all : `init` avait bien
  // tourné mais le z-index inline n'était jamais posé — la signature d'un
  // abandon à cette ligne précise. On attend donc leur apparition.
  return new Promise((resolve) => {
    const abandon = setTimeout(() => {
      observer.disconnect()
      resolve()
    }, 5000)
    const observer = new MutationObserver(() => {
      if (!document.querySelector('.transition')) return
      clearTimeout(abandon)
      observer.disconnect()
      joueIntro().then(resolve)
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  })
}

function joueIntro() {
  // Le rideau DOIT passer au-dessus de tout (navbar, #cloud, images…). La
  // valeur de référence est désormais dans styles/style.css (z-index:9999) —
  // elle s'applique dès l'injection du CSS, sans attendre ce JS. Ce
  // setProperty ne reste qu'en filet de sécurité si une règle Webstudio
  // publiée plus tard venait à reprendre la main.
  document
    .querySelector('.transition_div')
    ?.style.setProperty('z-index', '9999', 'important')

  surveilleRideau()

  // Animation d'intro (le rideau se lève).
  //
  // `opacity: 0.999` — imperceptible à l'œil. Hypothèse : Chrome ne rastérise
  // pas ce qui est intégralement recouvert par un calque OPAQUE (occlusion
  // culling), et une opacité < 1 sort le rideau de cette catégorie.
  //
  // ATTENTION — utilité NON DÉMONTRÉE, à ne pas présenter comme acquise. Le
  // symptôme (seules 3 des 7 vignettes du hero peintes sous Chrome) a en
  // réalité disparu quand le styling des images a été retiré côté Webstudio :
  // leur `min-width: 35vw` les faisait déborder de 467px de chaque côté d'une
  // fenêtre de 91px, soit sept calques de 1024px de large qui se chevauchaient.
  // Une fois l'image ramenée à la taille de son conteneur, plus de bug — la
  // vraie cause était là, pas ici.
  //
  // Cette ligne est donc conservée à titre de garde-fou peu coûteux, mais si
  // elle gêne un jour, la retirer et vérifier sur quelques rechargements que
  // les 7 vignettes tiennent : c'est le test qui tranchera.
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
