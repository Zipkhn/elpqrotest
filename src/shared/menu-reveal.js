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
// Effet : au clic, les 3 volets tombent en rideau l'un après l'autre (même
// esprit que les volets orange du scroll-text), puis les liens se révèlent.
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
  observer?.disconnect()
  observer = new MutationObserver(handleMutations)
  observer.observe(document.body, { childList: true, subtree: true })
  handleMutations() // au cas (rare) où le menu serait déjà monté à l'init
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
