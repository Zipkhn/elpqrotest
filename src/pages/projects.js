// projects.js — page liste des projets
// (le footer est lancé pour toutes les pages depuis routes.js)
import initProjectHover from '../shared/project-hover.js'
import initRevealBatch from '../shared/reveal-batch.js'

export default function projects() {
  initProjectHover()
  initRevealBatch('.projetFromProjets')
}
