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

  // build({ height, start, end }) — deux réglages indépendants :
  //
  //  • height = hauteur INITIALE du rideau → la COUVERTURE.
  //      Desktop : la photo about fait ~70vh → 240vh la couvre largement.
  //      Mobile : la photo est en portrait plein cadre (~160vh), donc il faut
  //      plus haut pour la recouvrir en entier. À ajuster si la hauteur de la
  //      photo change dans Webstudio.
  //
  //  • start / end = la PLAGE de scroll sur laquelle les volets se rétractent
  //      → la VITESSE des volets par rapport au scroll.
  //      Plage plus COURTE = volets plus RAPIDES que le scroll : l'image se
  //      dévoile plus tôt, pendant qu'elle est encore bien en vue.
  //      >> Pour ACCÉLÉRER les volets : MONTE le 2e nombre de `end` (140→200→…).
  //      >> Pour les RALENTIR : baisse-le.
  //      (start : 2e nombre = où l'anim démarre dans la fenêtre ; monter = plus tôt.)
  //      Mets `markers: true` ci-dessous pour visualiser start/end au réglage.
  const build = ({ height, start, end }) => {
    gsap.set('.scroll_effect_text_item', { height })

    const tlScroll = gsap.timeline({
      scrollTrigger: {
        trigger: '.scroll_effect_text',
        start,
        end,
        scrub: 0.5, // moins de latence que 1 → l'anim colle mieux au scroll
        markers: false, // ⚠️ passe à true pour régler start/end visuellement
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

  // Desktop : inchangé.
  mm.add('(min-width: 768px)', () =>
    build({ height: '240vh', start: '-100% 125%', end: '0% 140%' })
  )

  // Mobile : rideau plus haut (couvre la photo entière) ET plage de scroll plus
  // courte (end 140 → 200) → les volets descendent plus vite, l'image se voit
  // en entier. Ajuste `end` (2e nombre) pour la vitesse, `height` pour la
  // couverture.
  mm.add('(max-width: 767px)', () =>
    build({ height: '275vh', start: '-100% 125%', end: '0% 170%' })
  )
}
