// projects.js — page liste des projets
import initFooter from '../shared/footer.js'
import initProjectHover from '../shared/project-hover.js'
import initRevealBatch from '../shared/reveal-batch.js'

export default function projects() {
  initFooter()
  initProjectHover()
  initRevealBatch('.projetFromProjets')
}
