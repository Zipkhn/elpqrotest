// project.js — page d'un projet
// (le footer est lancé pour toutes les pages depuis routes.js)
import initProjectDetails from '../components/project-details.js'
import lanceInits from '../lib/lance-inits.js'
import initProjectHover from '../shared/project-hover.js'
import initRevealBatch from '../shared/reveal-batch.js'

export default function project() {
  lanceInits('projet', [
    ['projectHover', initProjectHover],
    ['projectDetails', initProjectDetails],
    ['revealBatch', () => initRevealBatch('.item_container')],
  ])
}
