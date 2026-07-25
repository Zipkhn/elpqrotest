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

function animateTransition() {
  return new Promise((resolve) => {
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

export default function initPageTransition() {
  if (!document.querySelector('.transition')) return

  // Le rideau DOIT passer au-dessus de tout. Webstudio le laissait à
  // z-index:1 → il descendait mais restait caché derrière #cloud (z6), la
  // navbar (z20), les images… donc « transition qui ne couvre rien ». On force
  // ici pour ne dépendre d'aucun réglage Webstudio (z-index élevé + !important
  // pour battre la règle Webstudio).
  document
    .querySelector('.transition_div')
    ?.style.setProperty('z-index', '9999', 'important')

  // Un seul écouteur délégué, en capture (removeEventListener d'abord pour
  // l'idempotence si l'init rejouait).
  document.removeEventListener('click', onLinkClick, true)
  document.addEventListener('click', onLinkClick, true)

  // Animation d'intro (le rideau se lève)
  gsap.set('.transition', { visibility: 'visible', translateY: 0 })
  revealTransition().then(() => {
    gsap.set('.transition', { visibility: 'hidden' })
  })
}
