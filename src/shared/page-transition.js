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

  // Intercepte les liens internes pour jouer la transition avant de naviguer
  document.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href')
      if (!href || href.startsWith('#') || href === window.location.pathname)
        return
      e.preventDefault()
      animateTransition().then(() => {
        window.location.href = href
      })
    })
  })

  // Animation d'intro (le rideau se lève)
  gsap.set('.transition', { visibility: 'visible', translateY: 0 })
  revealTransition().then(() => {
    gsap.set('.transition', { visibility: 'hidden' })
  })
}
