// footer.js — colonnes du footer qui montent au scroll (pin + scrub).
// Mutualisé : bloc identique dans home / project / projects / contact.
import { gsap, ScrollTrigger } from '../lib/gsap.js'

export default function initFooter() {
  if (!document.querySelector('.cols_footer')) return

  // Idempotence : sur une navigation SPA Webstudio ou une ré-hydratation React,
  // initFooter peut se rejouer. On tue le trigger précédent pour ne pas empiler
  // deux animations sur le même footer (source de sauts).
  ScrollTrigger.getById('footer')?.kill(true)

  gsap.set('.col_footer', { height: '0%' })
  gsap.set('.text_footer', { opacity: '0%' })

  const tlFooter = gsap.timeline({
    scrollTrigger: {
      id: 'footer',
      trigger: '.cols_footer',
      pin: true,
      anticipatePin: 1, // lisse l'instant où le pin s'enclenche (pas de saut)
      scrub: 0.5, // moins de latence que 1
      start: 'bottom bottom',
      // end : 2e nombre = % de fenêtre. Plus il est HAUT, moins il faut
      // scroller avant que le footer soit entièrement monté.
      // -50% ≈ 1,5 écran de scroll ; 25% ≈ 0,75 écran. Ajuste à ton goût.
      end: 'bottom 40%',
    },
  })

  tlFooter
    .to('.col_footer_1', { height: '90%', ease: 'power3.out' })
    .to('.col_footer_2', { height: '95%', ease: 'power3.out' }, '-=75%')
    .to('.col_footer_3', { height: '100%', ease: 'power3.out' }, '-=60%')
    .to('.text_footer', {
      opacity: '100%',
      stagger: { each: 0.15 },
      ease: 'power3.out',
    })
}
