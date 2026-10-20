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
  // FIN DE COURSE CALÉE SUR LA SECTION PRÉSENTATION (desktop).
  // Retour client : on ne voyait jamais la photo et le texte en entier, les
  // volets finissaient de se rétracter APRÈS que le haut de la section était
  // passé sous la navbar. La rangée `.presentation_row` fait désormais
  // 100svh - navbar - marge (CSS Webstudio) ; les volets doivent avoir fini
  // quand son bas touche le bas de l'écran — à cet instant elle est visible
  // en entier, juste sous la navbar.
  // Sans la classe, repli sur l'ancien réglage (fin relative aux volets).
  const presentation = document.querySelector('.presentation_row')

  // HAUTEUR MOBILE CALÉE SUR LA PRÉSENTATION.
  // Retour client : avec 284vh fixes, les volets montaient jusque sur le slider
  // (.slider_container_mobile) et en cachaient la moitié. Les colonnes sont
  // ancrées en bas, décalées de 0/20/40 px (escalier) : on prend la plus basse
  // pour que toutes couvrent le haut de la photo. La plus haute dépasse alors
  // de 40 px dans la marge grise au-dessus, sans atteindre le slider.
  const hauteurJusquAPresentation = () => {
    const items = document.querySelectorAll('.scroll_effect_text_item')
    if (!presentation || !items.length) return '284vh'
    const basMax = Math.max(
      ...[...items].map((i) => i.getBoundingClientRect().bottom)
    )
    const h = basMax - presentation.getBoundingClientRect().top
    return h > window.innerHeight * 1.05 ? h : '284vh'
  }

  const build = ({ height, start, end, finSurPresentation = false }) => {
    const calee = finSurPresentation && presentation

    const tlScroll = gsap.timeline({
      scrollTrigger: {
        trigger: '.scroll_effect_text',
        start,
        endTrigger: calee ? presentation : undefined,
        end: calee ? 'bottom bottom' : end,
        scrub: 0.5, // moins de latence que 1 → l'anim colle mieux au scroll
        markers: false, // ⚠️ passe à true pour régler start/end visuellement
        // `height` peut être une fonction (mobile) : on la remesure à chaque
        // refresh, la page ayant pu changer de hauteur (images, polices).
        invalidateOnRefresh: true,
      },
    })

    // fromTo : la hauteur de départ est posée tout de suite (comme l'ancien
    // gsap.set) et recalculée au refresh grâce à invalidateOnRefresh.
    tlScroll.fromTo(
      '.scroll_effect_text_item',
      { height },
      {
        height: '105vh',
        // stagger réduit (0.1 → 0.05) : les 3 colonnes finissent plus rapprochées,
        // la dernière ne traîne plus autant.
        stagger: { each: 0.05, from: 'start', grid: [1, 3] },
        ease: 'power3.in',
      }
    )
  }

  // Les callbacks matchMedia sont automatiquement « revert » au changement de
  // breakpoint : pas d'empilement entre desktop et mobile.

  // Desktop : fin calée sur `.presentation_row` (voir plus haut).
  mm.add('(min-width: 768px)', () =>
    build({
      height: '245vh',
      start: '-100% 125%',
      end: '0% 140%',
      finSurPresentation: true,
    })
  )

  // Mobile : rideau qui part du haut de la présentation (voir
  // hauteurJusquAPresentation) ET plage de scroll plus courte → les volets
  // descendent plus vite, l'image se voit en entier. Ajuste `end` (2e nombre)
  // pour la vitesse.
  mm.add('(max-width: 767px)', () =>
    build({
      height: hauteurJusquAPresentation,
      start: '-100% 125%',
      end: '0% 170%',
    })
  )
}
