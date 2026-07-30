// lance-inits.js — exécute les inits d'une page en les isolant les uns des autres.
//
// `routes.js` isole déjà chaque PAGE (`lance`), pour que le rideau de transition
// se lève quoi qu'il arrive. Ce helper fait la même chose D'UN CRAN PLUS BAS,
// entre les composants d'une même page.
//
// `home` et `categories` portaient déjà cette boucle, recopiée à l'identique ;
// `project` et `projets` appelaient leurs inits en séquence nue, si bien qu'une
// exception dans `initProjectHover()` emportait `initProjectDetails()` et
// `initRevealBatch()` avec elle — une page projet sans mise en page de grille ni
// apparition des images, pour une erreur survenue ailleurs.
//
// Il vit dans son propre module, et pas dans `routes.js`, pour ne pas créer un
// cycle d'imports : `routes.js` importe déjà les pages, qui importeraient alors
// `routes.js` en retour.
//
// `inits` : un tableau de paires [nom, fonction]. Le nom ne sert qu'au message
// d'erreur, mais c'est lui qui rend un plantage lisible en production.
export default function lanceInits(page, inits) {
  for (const [nom, fn] of inits) {
    try {
      fn()
    } catch (error) {
      console.warn(`[${page}] init "${nom}" a échoué :`, error)
    }
  }
}
