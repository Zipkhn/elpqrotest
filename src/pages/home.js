// home.js — page d'accueil
import initScrollText from '../components/scroll-text.js'
import initSliderDesktop from '../components/slider-desktop.js'
import initTagCloudGrid from '../components/tag-cloud-grid.js'
import initTagCloudMagnetic from '../components/tag-cloud-magnetic.js'
import initNavbarColor from '../shared/navbar-color.js'
import initProjectHover from '../shared/project-hover.js'
import initRevealBatch from '../shared/reveal-batch.js'

export default function home() {
  // Chaque init est isolé : si l'un plante (ex. gsap/ScrollTrigger, conflit
  // d'hydratation React de Webstudio…), les suivants tournent quand même.
  // Avant, une exception dans un init stoppait toute la suite — c'est ce qui
  // empêchait le nuage (initTagCloudMagnetic) de se construire en prod.
  // NB : pas de slider mobile ici. Le carrousel mobile est un embed Webstudio
  // autonome (scroll-snap natif : .slider > .slider__track > .slide, avec
  // scroll-snap-type: x mandatory). L'ancien initSliderMobile faisait tourner
  // un horizontalLoop GSAP sur les mêmes <a> et les décalait de 322px : les
  // zones cliquables ne tombaient plus sur la bonne image. Deux sliders sur le
  // même DOM — celui de l'embed suffit.
  const inits = [
    ['projectHover', initProjectHover],
    ['sliderDesktop', initSliderDesktop],
    ['scrollText', initScrollText],
    ['tagCloudGrid', initTagCloudGrid],
    ['tagCloudMagnetic', initTagCloudMagnetic],
    ['navbarColor', initNavbarColor],
    ['revealBatch', () => initRevealBatch('.projetFromProjets')],
  ]
  for (const [name, fn] of inits) {
    try {
      fn()
    } catch (err) {
      console.warn(`[home] init "${name}" a échoué :`, err)
    }
  }
}
