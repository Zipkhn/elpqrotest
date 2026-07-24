// menu-reveal.js — animation d'ouverture du menu plein écran (Dialog Radix).
//
// Structure Webstudio (montée/démontée par Radix à chaque ouverture — quand le
// menu est fermé, RIEN de tout ça n'est dans le DOM) :
//   .menu-btn                         → bouton déclencheur (data-state open/closed)
//   .w-dialog-overlay                 → backdrop
//     └ .menu_draggers                → conteneur flex (3 colonnes)
//         └ .menu_dragger × 3         → les VOLETS (fond gris du menu)
//   .w-dialog-content                 → liens de nav (Projects, Categories, …) + bouton X
//
// OUVERTURE : au clic, les 3 volets tombent en rideau l'un après l'autre (même
// esprit que les volets orange du scroll-text), puis les liens se révèlent.
// Faite en GSAP au montage (voir playOpen).
//
// FERMETURE : animation inverse (liens qui sortent, puis volets qui se
// rétractent en ordre inverse). Elle NE PEUT PAS être en GSAP : Radix démonte
// le portail du DOM en ~30ms dès la fermeture, sans attendre. En revanche Radix
// (via son composant Presence) RETARDE le démontage tant qu'une **animation
// CSS** tourne sur l'élément qu'il gère (`[data-state="closed"]`). On injecte
// donc des keyframes CSS de fermeture (voir CLOSE_STYLES) : Radix attend leur
// fin avant de démonter. Pas d'interception fragile des clics (X / overlay /
// Échap) — Radix coordonne tout seul.
//
// Radix (dé)monte tout le portail à chaque ouverture → on guette l'apparition
// de .menu_draggers via un MutationObserver (même pattern de résilience que le
// nuage / le slider mobile). L'observer réagit au DOM, pas au bouton : peu
// importe le déclencheur (.menu-btn, dialog-menu…), tant que le portail se
// monte. Comme Radix crée des éléments NEUFS à chaque fois, les flags posés sur
// le conteneur repartent naturellement à zéro d'une ouverture à l'autre.
import { gsap } from '../lib/gsap.js'

// Idempotence : un seul observer pour toute la session, même si l'init se
// rejoue (navigation SPA Webstudio / ré-hydratation React).
let observer

export default function initMenuReveal() {
  injectCloseStyles()
  observer?.disconnect()
  observer = new MutationObserver(handleMutations)
  observer.observe(document.body, { childList: true, subtree: true })
  handleMutations() // au cas (rare) où le menu serait déjà monté à l'init
}

// CSS de FERMETURE — injecté une seule fois. Les durées :
//  • liens : sortent en premier (0.28s) ; le contenu reste monté 0.3s.
//  • volets : se rétractent APRÈS, en ordre INVERSE de l'ouverture
//    (volet 3 → 2 → 1) via des animation-delay décroissants.
//  • overlay : maintenu monté 0.9s (marge > 0.39 + 0.45) pour que le dernier
//    volet finisse avant que Radix ne démonte.
// `@keyframes wsMenuHold` (vide) ne sert qu'à donner à Radix une animation à
// attendre sur l'overlay/le contenu.
const CLOSE_STYLES = `
  .w-dialog-content[data-state="closed"] { animation: wsMenuHold 0.3s linear forwards; }
  .w-dialog-content[data-state="closed"] a,
  .w-dialog-content[data-state="closed"] .w-close-button {
    animation: wsMenuLinkOut 0.28s ease forwards;
  }
  .w-dialog-overlay[data-state="closed"] { animation: wsMenuHold 0.9s linear forwards; }
  .w-dialog-overlay[data-state="closed"] .menu_dragger {
    transform-origin: top center;
    animation: wsMenuVoletOut 0.45s cubic-bezier(0.7, 0, 0.84, 0) forwards;
  }
  .w-dialog-overlay[data-state="closed"] .menu_dragger:nth-child(3) { animation-delay: 0.15s; }
  .w-dialog-overlay[data-state="closed"] .menu_dragger:nth-child(2) { animation-delay: 0.27s; }
  .w-dialog-overlay[data-state="closed"] .menu_dragger:nth-child(1) { animation-delay: 0.39s; }
  @keyframes wsMenuVoletOut { to { transform: scaleY(0); } }
  @keyframes wsMenuLinkOut { to { opacity: 0; transform: translateY(30px); } }
  @keyframes wsMenuHold { to {} }
`

function injectCloseStyles() {
  if (document.getElementById('menu-reveal-close')) return
  const style = document.createElement('style')
  style.id = 'menu-reveal-close'
  style.textContent = CLOSE_STYLES
  document.head.appendChild(style)
}

function handleMutations() {
  const draggers = document.querySelector('.menu_draggers')
  if (!draggers) return // menu fermé : Radix n'a rien monté, rien à faire

  // 1. Pré-masque les VOLETS dès que le conteneur apparaît. Le callback d'un
  //    MutationObserver s'exécute avant le prochain paint, donc poser scaleY:0
  //    ici évite tout flash des volets même si le contenu (liens) se monte un
  //    tick plus tard.
  if (!draggers.dataset.prepped) {
    draggers.dataset.prepped = '1'
    gsap.set(draggers.querySelectorAll('.menu_dragger'), {
      transformOrigin: 'top center',
      scaleY: 0,
    })
  }

  // 2. Pré-masque les LIENS dès qu'ils sont là (même raison : pas de flash si
  //    le contenu arrive après les volets).
  const reveal = getReveal()
  if (reveal.length && !draggers.dataset.linksPrepped) {
    draggers.dataset.linksPrepped = '1'
    gsap.set(reveal, { autoAlpha: 0, y: 30 })
  }

  // 3. Joue le timeline UNE SEULE FOIS, quand volets ET liens sont présents.
  if (!draggers.dataset.revealed && reveal.length) {
    draggers.dataset.revealed = '1'
    playOpen(draggers, reveal)
  }
}

// Liens de nav + bouton de fermeture (les éléments qui « remontent » après les volets).
function getReveal() {
  const content = document.querySelector('.w-dialog-content')
  if (!content) return []
  const links = [...content.querySelectorAll('a')]
  const closeBtn = content.querySelector('.w-close-button')
  return [...links, closeBtn].filter(Boolean)
}

function playOpen(container, reveal) {
  const panels = container.querySelectorAll('.menu_dragger')
  if (!panels.length) return

  const tl = gsap.timeline()

  // 1. Les 3 volets descendent l'un après l'autre (stagger) et couvrent l'écran.
  tl.to(panels, {
    scaleY: 1,
    duration: 0.55,
    ease: 'power4.inOut',
    stagger: 0.12, // >> décalage entre volets : monte pour un effet plus « l'un après l'autre »
  })

  // 2. Une fois le rideau presque posé, les liens de nav remontent en fondu.
  tl.to(
    reveal,
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      stagger: 0.07,
    },
    '-=0.15' // léger chevauchement : les liens démarrent avant la fin des volets
  )
}
