// menu-reveal.js — animation d'ouverture du menu plein écran (Dialog Radix).
//
// Structure Webstudio (montée/démontée par Radix à chaque ouverture) :
//   .menu-btn                         → bouton déclencheur (data-state open/closed)
//   .w-dialog-overlay                 → backdrop
//     └ .menu_draggers                → conteneur flex (3 colonnes)
//         └ .menu_dragger × 3         → les VOLETS (fond gris du menu)
//   .w-dialog-content                 → liens de nav (Projects, Categories, …) + bouton X
//
// Effet : au clic sur .menu-btn, les 3 volets tombent en rideau l'un après
// l'autre (même esprit que les volets orange du scroll-text), puis les liens
// se révèlent. Comme Radix (dé)monte le contenu à chaque ouverture, on guette
// l'apparition de .menu_draggers via un MutationObserver (même pattern de
// résilience que le nuage / le slider mobile) et on rejoue le timeline à neuf.
import { gsap } from '../lib/gsap.js'

// Idempotence : un seul observer pour toute la session, même si l'init se
// rejoue (navigation SPA Webstudio / ré-hydratation React).
let observer

export default function initMenuReveal() {
  observer?.disconnect()

  observer = new MutationObserver(() => {
    const draggers = document.querySelector('.menu_draggers')
    // dataset.revealed : garde-fou anti-double-jeu. Radix monte un élément
    // NEUF à chaque ouverture, donc le flag repart naturellement à zéro.
    if (draggers && !draggers.dataset.revealed) {
      draggers.dataset.revealed = '1'
      playOpen(draggers)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  // Cas où le menu serait déjà ouvert au moment de l'init.
  const existing = document.querySelector('.menu_draggers')
  if (existing && !existing.dataset.revealed) {
    existing.dataset.revealed = '1'
    playOpen(existing)
  }
}

function playOpen(container) {
  const panels = container.querySelectorAll('.menu_dragger')
  if (!panels.length) return

  const content = document.querySelector('.w-dialog-content')
  const links = content ? [...content.querySelectorAll('a')] : []
  const closeBtn = content ? content.querySelector('.w-close-button') : null
  const reveal = [...links, closeBtn].filter(Boolean)

  // État de départ, posé AVANT le premier rendu pour éviter tout flash :
  //  • volets écrasés vers le haut (rideau relevé)
  //  • liens masqués et décalés vers le bas
  gsap.set(panels, { transformOrigin: 'top center', scaleY: 0 })
  gsap.set(reveal, { autoAlpha: 0, y: 30 })

  const tl = gsap.timeline()

  // 1. Les 3 volets descendent l'un après l'autre (stagger) et couvrent l'écran.
  tl.to(panels, {
    scaleY: 1,
    duration: 0.55,
    ease: 'power4.inOut',
    stagger: 0.12, // >> décalage entre volets : monte pour plus « l'un après l'autre »
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
