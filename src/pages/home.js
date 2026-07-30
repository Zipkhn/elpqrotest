// home.js — page d'accueil
import initScrollText from '../components/scroll-text.js'
import initSliderDesktop from '../components/slider-desktop.js'
import initTagCloudMagnetic from '../components/tag-cloud-magnetic.js'
import lanceInits from '../lib/lance-inits.js'
import initNavbarColor from '../shared/navbar-color.js'
import initProjectHover from '../shared/project-hover.js'
import initRevealBatch from '../shared/reveal-batch.js'

export default function home() {
  // Chaque init est isolé : si l'un plante (ex. gsap/ScrollTrigger, conflit
  // d'hydratation React de Webstudio…), les suivants tournent quand même.
  // Avant, une exception dans un init stoppait toute la suite — c'est ce qui
  // empêchait le nuage (initTagCloudMagnetic) de se construire en prod.
  //
  // NB : pas de slider mobile ici. Le carrousel mobile est un embed Webstudio
  // autonome (scroll-snap natif : .slider > .slider__track > .slide, avec
  // scroll-snap-type: x mandatory). L'ancien initSliderMobile faisait tourner
  // un horizontalLoop GSAP sur les mêmes <a> et les décalait de 322px : les
  // zones cliquables ne tombaient plus sur la bonne image. Deux sliders sur le
  // même DOM — celui de l'embed suffit.
  //
  // NB2 : plus de `tagCloudGrid`. Ce module remplissait `.tagCloud_words` à
  // partir d'une liste de mots EN DUR (avec des remplisseurs « Wood 2 », « Wood
  // 3 »…) et fabriquait des liens cassés — `href="projets/Land Art"`, relatif et
  // construit sur le libellé au lieu du slug. Le nuage réel est celui de
  // `#nuage`, alimenté par Hygraph.
  lanceInits('home', [
    ['projectHover', initProjectHover],
    ['sliderDesktop', initSliderDesktop],
    ['scrollText', initScrollText],
    ['tagCloudMagnetic', initTagCloudMagnetic],
    ['navbarColor', initNavbarColor],
    ['revealBatch', () => initRevealBatch('.projetFromProjets')],
  ])
}
