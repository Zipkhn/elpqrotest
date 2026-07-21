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
  initFooter()
  initProjectHover()
  initSliderDesktop()
  initSliderMobile()
  initScrollText()
  initTagCloudGrid()
  initTagCloudMagnetic()
  initRevealBatch('.projetFromProjets')
}
