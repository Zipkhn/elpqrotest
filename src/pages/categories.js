// categories.js — page liste des catégories.
// Même grille `.projetFromProjets` que `projects` (footer + hover + reveal),
// PLUS le nuage de catégories `#nuage` qui n'existait jusqu'ici que sur la home.
//
// `#nuage` vit ici dans le même `#cloud` que sur la home (vérifié en prod :
// #nuage < section.nuage-tags < .w-html-embed < #cloud). L'inversion de la
// navbar — logo et traits du menu qui passent du rouge au blanc au-dessus du
// bloc — était donc attendue ici aussi, mais `initNavbarColor` ne tournait que
// sur la home : le module sort immédiatement s'il ne trouve pas `#cloud`, il
// n'a jamais eu à connaître la page, seule la liste d'inits le limitait.
import initTagCloudMagnetic from '../components/tag-cloud-magnetic.js'
import lanceInits from '../lib/lance-inits.js'
import initNavbarColor from '../shared/navbar-color.js'
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
    ['navbarColor', initNavbarColor],
  ])
}
