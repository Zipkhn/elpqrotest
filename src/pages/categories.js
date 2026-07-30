// categories.js — page liste des catégories.
// Même grille `.projetFromProjets` que `projects` (footer + hover + reveal),
// PLUS le nuage de catégories `#nuage` qui n'existait jusqu'ici que sur la home.
import initTagCloudMagnetic from '../components/tag-cloud-magnetic.js'
import lanceInits from '../lib/lance-inits.js'
import initProjectHover from '../shared/project-hover.js'
import initRevealBatch from '../shared/reveal-batch.js'

export default function categories() {
  // Inits isolés (même raison que sur la home) : si le nuage plante — fetch
  // Hygraph KO, conflit d'hydratation React… — les reveals de la grille
  // tournent quand même. Le footer, lui, est lancé en amont par routes.js.
  lanceInits('categories', [
    ['projectHover', initProjectHover],
    ['revealBatch', () => initRevealBatch('.projetFromProjets')],
    ['tagCloudMagnetic', initTagCloudMagnetic],
  ])
}
