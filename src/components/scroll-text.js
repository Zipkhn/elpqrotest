// scroll-text.js — colonnes de texte qui se rétractent au scroll (effet reveal).
import { gsap } from '../lib/gsap.js'

export default function initScrollText() {
  if (!document.querySelector('.scroll_effect_text')) return

  gsap.set('.scroll_effect_text_item', { height: '240vh' })

  const tlScroll = gsap.timeline({
    scrollTrigger: {
      trigger: '.scroll_effect_text',
      // start : le 2e nombre = où l'anim DÉMARRE dans la fenêtre (% de la
      // hauteur). 'bottom' (=100%) démarrait trop tard. Plus tu montes le %,
      // plus ça démarre tôt. À ajuster avec les markers.
      start: '-100% 125%',
      // end : le 2e nombre = où l'anim se TERMINE dans la fenêtre.
      // 110% finissait ~200px trop tard (colonnes encore inégales quand la
      // section est en haut). ~137% fait finir la rétraction pile quand le
      // haut des colonnes atteint le haut de la fenêtre. À ajuster avec les
      // markers ci-dessous : monte le % pour finir plus tôt, baisse-le pour
      // finir plus tard.
      end: '0% 140%',
      scrub: 0.5, // moins de latence que 1 → l'anim colle mieux au scroll
      markers: false, // ⚠️ TEMPORAIRE : à retirer une fois le réglage validé
    },
  })

  tlScroll.to('.scroll_effect_text_item', {
    height: '105vh',
    // stagger réduit (0.1 → 0.05) : les 3 colonnes finissent plus rapprochées,
    // la dernière ne traîne plus autant.
    stagger: { each: 0.05, from: 'start', grid: [1, 3] },
    ease: 'power3.in',
  })
}
