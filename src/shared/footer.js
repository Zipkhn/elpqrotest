// footer.js — colonnes du footer qui montent au scroll (scrub, SANS pin).
// Mutualisé : bloc identique dans home / project / projects / contact.
//
// POURQUOI PLUS DE PIN. Le pin imposait `start: 'bottom bottom'`, c'est-à-dire
// « démarre quand .prefooter est ENTIÈREMENT à l'écran ». Or .prefooter fait
// 100vh et est vide : ses colonnes sont collées à son bord bas. Résultat mesuré
// sur /categories/ — le bloc entrait dans la fenêtre à scrollY 2812, le trigger
// ne démarrait qu'à 3618 : 806px de scroll, une fenêtre pleine, avec un écran
// intégralement vide. Impossible à rattraper en réglant le pin, puisque rien
// d'ancré au bas du bloc ne peut être vu tant que ce bas est sous la flottaison.
//
// La sortie est de décoller les colonnes du bloc : `.cols_footer` passe en
// `position: fixed; bottom: 0` (CSS Webstudio, voir plus bas). Elles montent
// alors depuis le bas de l'ÉCRAN, par-dessus le contenu, dès que .prefooter
// pointe. .prefooter n'est plus qu'une piste d'élan, et sa hauteur EST la
// distance de la course.
//
// CSS À AVOIR DANS WEBSTUDIO pour que ce fichier ait un sens :
//   .cols_footer { position: fixed; inset: auto 0 0 0; height: 100vh;
//                  z-index: 1; pointer-events: none; }
//   .col_footer  { height: 0; }        /* sinon plein écran rouge avant l'init */
//   .prefooter   { height: 100vh; }    /* la piste d'élan */
//
// Le `z-index: 1` n'est pas cosmétique. `.cols_footer` était à `-1` (footer
// derrière le contenu) et GSAP recopiait ce -1 sur le `.pin-spacer` qu'il
// fabriquait : le spacer devenait un contexte d'empilement à -1 et emprisonnait
// tout ce qu'il contenait sous la page, quel que soit le z-index interne.
import { gsap, ScrollTrigger } from '../lib/gsap.js'

// MARQUEURS ScrollTrigger — outil de mise au point uniquement.
// Affiche start/end du trigger (vert/rouge) et les mêmes repères côté scroller.
// ⚠️ REPASSER À `false` AVANT DE BUILD POUR LA PROD : les marqueurs sont des
// éléments injectés dans le DOM, visibles par le visiteur.
const MARQUEURS = false

export default function initFooter() {
  if (!document.querySelector('.cols_footer')) return

  // LE REPÈRE DE SCROLL. `.cols_footer` est `fixed` : sa position dans la
  // fenêtre ne varie plus, il ne peut pas servir de trigger. On s'accroche donc
  // à la dernière section de contenu, marquée `.avant_footer` dans Webstudio —
  // une classe à poser sur la section qui précède le footer, sur CHAQUE page
  // (elle diffère : grille de catégories, liste de projets, bloc de contact…).
  //
  // Repli sur `.prefooter` si la classe n'a pas encore été posée : la page reste
  // fonctionnelle, avec l'ancien réglage, et un avertissement en console dit
  // laquelle a été oubliée.
  const avant = document.querySelector('.avant_footer')
  const prefooter = document.querySelector('.prefooter')
  const piste = avant || prefooter
  if (!piste) {
    console.warn(
      '[footer] ni .avant_footer ni .prefooter — animation des colonnes désactivée'
    )
    return
  }
  if (!avant) {
    console.warn('[footer] .avant_footer absent, repli sur .prefooter')
  }

  // DÉPART DE LA COURSE, en pourcentage de la traversée de `.avant_footer`.
  // C'est le réglage à toucher pour avancer ou retarder la montée :
  //   '50%' → au centre de la section (plus tôt, chevauche davantage)
  //   '75%' → un peu après le centre                    ← réglage actuel
  //   '100%' → la section vient de sortir entièrement (plus tard)
  // Avancer le départ RALLONGE mécaniquement la course, puisque l'arrivée est
  // fixée au bas du document.
  const DEPART = '95%'

  // Idempotence : sur une navigation SPA Webstudio ou une ré-hydratation React,
  // initFooter peut se rejouer. On tue le trigger précédent pour ne pas empiler
  // deux animations sur le même footer (source de sauts).
  ScrollTrigger.getById('footer')?.kill(true)

  gsap.set('.col_footer', { height: '0%' })
  gsap.set('.text_footer', { opacity: '0%' })

  const tlFooter = gsap.timeline({
    scrollTrigger: {
      id: 'footer',
      trigger: piste,
      scrub: 0.5, // moins de latence que 1
      // START — le point situé à DEPART de la hauteur de `.avant_footer` atteint
      // le HAUT de la fenêtre. À 75%, il reste un quart de la section à l'écran,
      // en haut ; les colonnes montent dans la bande déjà libérée en bas, et ne
      // mordent sur elle qu'en fin de course.
      // Elles ne peuvent pas passer DERRIÈRE pour éviter ce chevauchement :
      // testé, un z-index négatif les fait disparaître sous le fond opaque du
      // body — elles ne peignent plus du tout.
      start: avant ? `${DEPART} top` : 'top bottom',
      // END — le bas du document, toujours. On vise `.prefooter` plutôt qu'une
      // distance fixe (`'+=100%'`) : une distance fixe finirait la course avant
      // ou après la fin de page selon la hauteur des sections, laissant soit du
      // scroll mort, soit une montée tronquée. Ici l'arrivée colle au dernier
      // pixel, quelle que soit la page.
      // La LONGUEUR de la course en découle : hauteur de .prefooter moins ce
      // qu'il restait de .avant_footer au départ. C'est donc la hauteur de
      // `.prefooter` qui règle la vitesse, en CSS.
      endTrigger: prefooter || undefined,
      end: prefooter ? 'bottom bottom' : '+=100%',
      markers: MARQUEURS && {
        startColor: '#00e676', // START : 75% de .avant_footer parcourus
        endColor: '#0026ff', // END   : bas du document
        fontSize: '12px',
        fontWeight: 'bold',
        indent: 20,
      },
    },
  })

  // ORDRE : la colonne de DROITE part la première, puis le milieu, puis la
  // gauche. L'ordre inverse (gauche d'abord) donnait un mouvement qui semblait
  // se retourner en cours de route : la gauche prenait la tête au début, alors
  // que la droite est la plus haute à l'arrivée (100% contre 85%). La droite
  // mène désormais du début à la fin.
  //
  // POSITIONS ABSOLUES, et pas des décalages '-=75%'. En GSAP le pourcentage
  // d'une position relative se calcule sur la durée de l'animation qu'on
  // insère : allonger `duree` déplaçait donc aussi `depart`, et la colonne
  // repartait plus tôt au lieu d'aller plus lentement. Ici les deux réglages
  // sont indépendants — on touche l'un sans dérégler l'autre.
  //
  // `depart` et `duree` sont en unités de timeline, pas en secondes : le scrub
  // étale l'ensemble sur la distance start→end. Seules leurs PROPORTIONS
  // comptent. Colonne trop rapide → augmenter sa `duree`. Colonne qui rattrape
  // la précédente → retarder son `depart`.
  const COLONNES = [
    { cible: '.col_footer_3', hauteur: '100%', depart: 0, duree: 0.5 },
    { cible: '.col_footer_2', hauteur: '93%', depart: 0.2, duree: 0.75 },
    { cible: '.col_footer_1', hauteur: '85%', depart: 0.35, duree: 0.55 },
  ]

  COLONNES.forEach(({ cible, hauteur, depart, duree }) => {
    tlFooter.to(
      cible,
      { height: hauteur, duration: duree, ease: 'power3.out' },
      depart
    )
  })

  // Le texte (h1 + p) ne doit pas attendre la fin des colonnes : il démarre
  // pendant la montée de col_footer_3 et se joue vite (durée + stagger courts).
  tlFooter.to(
    '.text_footer',
    {
      opacity: '100%',
      duration: 0.25,
      stagger: { each: 0.06 },
      ease: 'power2.out',
    },
    0.45
  )
}
