// home.js — page d'accueil
import initScrollText from '../components/scroll-text.js'
import initSliderDesktop from '../components/slider-desktop.js'
import initSliderMobile from '../components/slider-mobile.js'
import initTagCloudGrid from '../components/tag-cloud-grid.js'
import initTagCloudMagnetic from '../components/tag-cloud-magnetic.js'
import initFooter from '../shared/footer.js'
import initProjectHover from '../shared/project-hover.js'
import initRevealBatch from '../shared/reveal-batch.js'

export default function home() {
  // Chaque init est isolé : si l'un plante (ex. gsap/ScrollTrigger, conflit
  // d'hydratation React de Webstudio…), les suivants tournent quand même.
  // Avant, une exception dans un init stoppait toute la suite — c'est ce qui
  // empêchait le nuage (initTagCloudMagnetic) de se construire en prod.
  const inits = [
    ['footer', initFooter],
    ['projectHover', initProjectHover],
    ['sliderDesktop', initSliderDesktop],
    ['sliderMobile', initSliderMobile],
    ['scrollText', initScrollText],
    ['tagCloudGrid', initTagCloudGrid],
    ['tagCloudMagnetic', initTagCloudMagnetic],
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
