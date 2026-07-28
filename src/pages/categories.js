// categories.js — page liste des catégories.
// Même grille `.projetFromProjets` que `projects` (footer + hover + reveal),
// PLUS le nuage de catégories `#nuage` qui n'existait jusqu'ici que sur la home.
import initTagCloudMagnetic from '../components/tag-cloud-magnetic.js'
import initFooter from '../shared/footer.js'
import initProjectHover from '../shared/project-hover.js'
import initRevealBatch from '../shared/reveal-batch.js'

export default function categories() {
  // Inits isolés (même raison que sur la home) : si le nuage plante — fetch
  // Hygraph KO, conflit d'hydratation React… — le footer et les reveals de la
  // grille tournent quand même.
  const inits = [
    ['footer', initFooter],
    ['projectHover', initProjectHover],
    ['revealBatch', () => initRevealBatch('.projetFromProjets')],
    ['tagCloudMagnetic', initTagCloudMagnetic],
  ]
  for (const [name, fn] of inits) {
    try {
      fn()
    } catch (err) {
      console.warn(`[categories] init "${name}" a échoué :`, err)
    }
  }
}
