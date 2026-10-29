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
  // passé sous la navbar. Les volets doivent donc avoir fini quand le HAUT de
  // `.presentation_row` arrive juste sous la navbar (navbar + marge, voir
  // FIN_SOUS_NAVBAR).
  // On vise le haut et non le bas : depuis la maquette du 29/10, la section
  // (grand portrait 3/5) est plus haute que l'écran. Caler sur son bas
  // faisait finir les volets alors que le titre était déjà sorti par le haut.
  // Sans la classe, repli sur l'ancien réglage (fin relative aux volets).
  // La section porte l'ID lisible `section-about-home` (posé dans Webstudio le
  // 29/10) ; la classe reste en repli si l'ID disparaît.
  const presentation =
    document.getElementById('section-about-home') ||
    document.querySelector('.presentation_row')

  // Haut de la présentation à 71 px (navbar) + 2rem de marge du haut de
  // l'écran : la même position que l'ancien calage `bottom bottom` quand la
  // rangée faisait `100svh - 71px - 2rem`. Fonction : remesurée au refresh.
  const FIN_SOUS_NAVBAR = () => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    return `top ${71 + 2 * rem}px`
  }

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

  // HAUTEUR DESKTOP PLAFONNÉE SOUS LE SLIDER.
  // Retour client (23/10) : sur un portable Windows en mise à l'échelle 125 %,
  // la barre orange passait sur la légende du slider (« Péruwelz - Belgium »).
  // 245vh est une hauteur relative à l'écran, alors que le slider et l'espace
  // au-dessus du rideau ne le sont qu'en partie : plus la fenêtre est basse,
  // plus l'écart fond. Mesuré à 1800 px de large : 50 px d'écart à 960 px de
  // haut, 14 px à 730 px, et chevauchement (-7 px) à 600 px.
  // Sert de plafond à hauteurJusquASection : le rideau ne monte jamais
  // au-dessus du bas du slider (moins une marge). Les colonnes sont ancrées en bas et décalées en
  // escalier : c'est celle dont le bas est le plus haut qui monte le plus haut.
  const MARGE_SOUS_SLIDER = 24
  const hauteurSousSlider = () => {
    const items = document.querySelectorAll('.scroll_effect_text_item')
    const slider = [
      ...document.querySelectorAll('.project_container, .project_location'),
    ].filter((e) => e.getClientRects().length)
    if (!items.length || !slider.length) return '245vh'
    const basMin = Math.min(
      ...[...items].map((i) => i.getBoundingClientRect().bottom)
    )
    const basSlider = Math.max(
      ...slider.map((e) => e.getBoundingClientRect().bottom)
    )
    return basMin - basSlider - MARGE_SOUS_SLIDER
  }

  // HAUTEUR DESKTOP CALÉE SUR LE HAUT DE LA SECTION.
  // Retour client (29/10) : les volets ne couvraient que le bas de la section,
  // plafonnés à 245vh alors que la section (portrait 3/5) est plus haute que
  // l'écran. Ils partent maintenant du haut de #section-about-home. On garde
  // le plafond sous le slider (voir hauteurSousSlider) au cas où les deux se
  // rapprocheraient sur une fenêtre basse.
  const hauteurJusquASection = () => {
    const items = document.querySelectorAll('.scroll_effect_text_item')
    if (!presentation || !items.length) return hauteurSousSlider()
    // Colonnes décalées en escalier : on prend la plus BASSE pour que les trois
    // couvrent le haut de la section (les deux autres dépassent de 20/40 px).
    const basMax = Math.max(
      ...[...items].map((i) => i.getBoundingClientRect().bottom)
    )
    const h = basMax - presentation.getBoundingClientRect().top
    const plafond = hauteurSousSlider()
    return typeof plafond === 'number' ? Math.min(h, plafond) : h
  }

  const build = ({ height, start, end, finSurPresentation = false }) => {
    const calee = finSurPresentation && presentation

    const tlScroll = gsap.timeline({
      scrollTrigger: {
        // Desktop : tout est calé sur la section — début quand son haut entre
        // par le bas de l'écran, fin quand il arrive sous la navbar.
        trigger: calee ? presentation : '.scroll_effect_text',
        start: calee ? 'top bottom' : start,
        end: calee ? FIN_SOUS_NAVBAR : end,
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

  // Desktop : volets du haut de la section, début et fin calés sur elle.
  mm.add('(min-width: 768px)', () =>
    build({
      height: hauteurJusquASection,
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
