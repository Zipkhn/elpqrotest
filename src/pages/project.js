// project.js — page d'un projet
import initProjectDetails from '../components/project-details.js'
import initFooter from '../shared/footer.js'
import initProjectHover from '../shared/project-hover.js'
import initRevealBatch from '../shared/reveal-batch.js'

export default function project() {
  initFooter()
  initProjectHover()
  initProjectDetails()
  initRevealBatch('.item_container')
}
