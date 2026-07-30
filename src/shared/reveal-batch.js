// reveal-batch.js — apparition au scroll d'un lot d'éléments (ScrollTrigger.batch).
// Mutualisé : home utilisait `.projetFromProjets`, la page projet `.item_container`.
//
// L'ÉTAT INITIAL EST POSÉ ICI EN ENTIER. Avant, seul `y: 100` était appliqué et
// l'`opacity: 0` était censé venir du CSS Webstudio — or aucune règle d'opacity
// n'existe sur `.item_container` (vérifié dans la cascade : seulement
// display/width/height). Les images étaient donc pleinement visibles, mais
// décalées de 100px vers le bas, tant qu'on n'avait pas scrollé dessus.
//
// PLUS DE onLeave / onLeaveBack. Ils remettaient `opacity: 0` à la sortie, et
// ScrollTrigger.batch éteignait le lot ENTIER : mesuré sur /projet/floating-land
// à 390px, quand la 1re image sortait par le haut (scrollY 1900), les deux
// autres passaient à 0 avec elle — dont une en plein milieu de l'écran — et n'en
// revenaient plus jusqu'au bas de la page. Un ScrollTrigger.refresh n'y changeait
// rien : ce n'étaient pas des positions périmées, mais bien le lot.
//
// `once: true` en découle : une fois révélé, un élément le reste, et le trigger
// se tue tout seul. onEnterBack devenait donc mort (il ne pouvait suivre qu'un
// onLeaveBack), il part avec.
import { gsap, ScrollTrigger } from '../lib/gsap.js'

export default function initRevealBatch(selector) {
  const items = document.querySelectorAll(selector)
  if (!items.length) return

  gsap.set(selector, { opacity: 0, y: 100 })

  // Plus de `ScrollTrigger.addEventListener('refreshInit', …)` ici. Il remettait
  // `.image` à `y: 0` — un vestige de l'époque onLeave/onLeaveBack, sans effet
  // depuis que l'état initial est posé sur `selector` et non sur `.image`.
  // Surtout, c'était un écouteur STATIQUE de la classe ScrollTrigger : ni
  // `st.kill()` ni `nettoieRoute()` ne l'enlèvent, et `initRevealBatch` tourne
  // sur quatre pages — il s'en accumulait donc un de plus à chaque navigation,
  // tous rejoués à chaque refresh (c'est-à-dire à chaque création de trigger et
  // à chaque resize).
  ScrollTrigger.batch(selector, {
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        stagger: { each: 0.15, grid: [1, 3] },
        overwrite: true,
      }),
  })
}
