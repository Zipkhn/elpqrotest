// scroll-text.js — colonnes de texte qui se rétractent au scroll (effet reveal).
import { gsap } from '../lib/gsap.js'

export default function initScrollText() {
  if (!document.querySelector('.scroll_effect_text')) return

  gsap.set('.scroll_effect_text_item', { height: '240vh' })

  const tlScroll = gsap.timeline({
    scrollTrigger: {
      trigger: '.scroll_effect_text',
      start: '-100% bottom',
      end: '0% 110%',
      scrub: 1,
    },
  })

  tlScroll.to('.scroll_effect_text_item', {
    height: '105vh',
    stagger: { each: 0.1, from: 'start', grid: [1, 3] },
    ease: 'power3.in',
  })
}
