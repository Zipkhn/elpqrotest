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
  injectMenuStyles()
  observer?.disconnect()
  observer = new MutationObserver(handleMutations)
  observer.observe(document.body, { childList: true, subtree: true })
  handleMutations() // au cas (rare) où le menu serait déjà monté à l'init
}

// CSS du menu — injecté une seule fois. Trois blocs :
//
// 1) FERMETURE (inverse de l'ouverture). Les volets REMONTENT : scaleY 1→0 avec
//    transform-origin en haut → le bas du volet remonte vers le haut. Ordre du
//    stagger identique à l'ouverture (volet 1 → 2 → 3) pour ne pas donner une
//    impression de « droite → gauche ». Durées :
//      • liens : s'effacent en premier vers le haut (0.28s) ; contenu monté 0.3s.
//      • volets : remontent ensuite (0.45s), décalés 0.15 / 0.27 / 0.39.
//      • overlay : maintenu monté 0.9s (> 0.39 + 0.45) pour laisser finir le
//        dernier volet avant que Radix ne démonte le portail.
//    NB : Radix retarde le démontage tant qu'une animation CSS tourne sur
//    l'élément qu'il gère → `@keyframes wsMenuHold` (vide) sert juste à ça.
//
// 2) Bouton menu : pas d'effet au survol (Webstudio ajoute un fond gris clair
//    rgb(241,245,249) par défaut sur .w-button:hover → on le remet transparent).
//
// 3) Liens du menu : pas de soulignement bleu (les <a> ont le style anchor par
//    défaut du navigateur ; le texte visible est le <h1> blanc à l'intérieur).
const MENU_STYLES = `
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
  .w-dialog-overlay[data-state="closed"] .menu_dragger:nth-child(1) { animation-delay: 0.15s; }
  .w-dialog-overlay[data-state="closed"] .menu_dragger:nth-child(2) { animation-delay: 0.27s; }
  .w-dialog-overlay[data-state="closed"] .menu_dragger:nth-child(3) { animation-delay: 0.39s; }
  @keyframes wsMenuVoletOut { to { transform: scaleY(0); } }
  @keyframes wsMenuLinkOut { to { opacity: 0; transform: translateY(-20px); } }
  @keyframes wsMenuHold { to {} }

  .menu-btn:hover { background: transparent !important; }

  .w-dialog-content a,
  .w-dialog-content a:hover,
  .w-dialog-content a:visited {
    text-decoration: none !important;
    color: inherit !important;
  }
`

function injectMenuStyles() {
  if (document.getElementById('menu-reveal-styles')) return
  const style = document.createElement('style')
  style.id = 'menu-reveal-styles'
  style.textContent = MENU_STYLES
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
