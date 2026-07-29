// routes.js — table des pages et lancement de la page courante.
//
// Extrait de main.js pour être appelable DEUX fois : au premier chargement, et
// à chaque navigation SPA. page-transition.js l'importe pour relancer la page
// d'arrivée — passer par main.js créerait un cycle d'imports.
import categories from './pages/categories.js'
import home from './pages/home.js'
import project from './pages/project.js'
import projects from './pages/projects.js'
import initFooter from './shared/footer.js'

const routes = {
  home,
  projects,
  project,
  // Les pages Webstudio `categories` (liste) et `category` (détail d'une
  // catégorie) affichent la même grille `.projetFromProjets` que `projects`.
  // `categories` a en plus le nuage `#nuage` → module dédié ; `category`
  // (détail) réutilise tel quel l'init de `projects`.
  categories,
  category: projects,
  // Pas d'entrée `contact` ni `about` : ces deux pages n'ont que le footer,
  // désormais lancé pour tout le monde dans `lancePageCourante`.
}

// Webstudio pose parfois l'attribut sur un wrapper plutôt que sur <body>, donc
// on le cherche sur le body puis, à défaut, n'importe où dans le DOM.
export function pageCourante() {
  return (
    document.body.dataset.page ||
    document.querySelector('[data-page]')?.dataset.page
  )
}

// Un init qui plante ne doit emporter ni les suivants, ni la transition : le
// rideau doit se lever quoi qu'il arrive, sinon la page reste inutilisable.
function lance(nom, fn) {
  try {
    fn()
  } catch (error) {
    console.error(`[routes] init "${nom}" en échec:`, error)
  }
}

export default function lancePageCourante() {
  // LE FOOTER EST LANCÉ POUR TOUTES LES PAGES, qu'elles figurent dans la table
  // ou non.
  //
  // Il vivait dans chaque module de page, ce qui liait sa présence à
  // l'existence d'une entrée ici. `about` n'en avait pas : `routes['about']`
  // valait `undefined`, on sortait sans rien lancer, et ses trois `.col_footer`
  // restaient à 0px. Mesuré en ligne sur /about/ — le balisage et le CSS
  // étaient pourtant corrects (`.cols_footer` en fixed, `.avant_footer`,
  // `.prefooter` à 1209px) : seul l'init manquait.
  //
  // Le footer est présent sur les six types de page Webstudio. Le lancer ici,
  // hors du `routes[...]`, le rend indépendant de la table : une page ajoutée
  // demain dans le builder l'aura sans qu'on touche au bundle. `initFooter` se
  // garde lui-même si `.cols_footer` est absent, et tue son ScrollTrigger
  // précédent, donc le rejouer à chaque navigation SPA est sans effet de bord.
  lance('footer', initFooter)

  const init = routes[pageCourante()]
  if (init) lance('page', init)
}
