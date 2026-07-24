// scroll-text.js — colonnes orange qui se rétractent au scroll (effet reveal).
// Le rideau (3 colonnes .scroll_effect_text_item, ancrées en bas) part très
// haut et rétracte sa hauteur au scroll pour révéler ce qu'il y a derrière
// (notamment la photo about_container_2).
import { gsap } from '../lib/gsap.js'

// Conservé au niveau module pour pouvoir tout nettoyer si l'init se rejoue
// (navigation SPA Webstudio / ré-hydratation React).
let mm

export default function initScrollText() {
  if (!document.querySelector('.scroll_effect_text')) return

  mm?.revert() // idempotence : tue les triggers/tweens de l'instance précédente
  mm = gsap.matchMedia()

  // La SEULE différence desktop/mobile est la hauteur INITIALE du rideau.
  // Desktop : la photo about fait ~70vh → 240vh la couvre largement.
  // Mobile : la photo est en portrait plein cadre (~160vh de haut), donc 240vh
  // ne recouvre que son bas → le reveal « ne prenait pas la photo » en entier.
  // ~307vh sont nécessaires pour monter jusqu'au haut de la photo ; 310vh laisse
  // une petite marge tout en restant sous le bas du slider. À ajuster si la
  // hauteur de la photo change dans Webstudio.
  const build = (startHeight) => {
    gsap.set('.scroll_effect_text_item', { height: startHeight })

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

  // Les callbacks matchMedia sont automatiquement « revert » au changement de
  // breakpoint : pas d'empilement entre desktop et mobile.
  mm.add('(min-width: 768px)', () => build('240vh')) // desktop : inchangé
  mm.add('(max-width: 767px)', () => build('310vh')) // mobile : couvre la photo entière
}
