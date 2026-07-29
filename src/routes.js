// routes.js — table des pages et lancement de la page courante.
//
// Extrait de main.js pour être appelable DEUX fois : au premier chargement, et
// à chaque navigation SPA. page-transition.js l'importe pour relancer la page
// d'arrivée — passer par main.js créerait un cycle d'imports.
import categories from './pages/categories.js'
import contact from './pages/contact.js'
import home from './pages/home.js'
import project from './pages/project.js'
import projects from './pages/projects.js'

const routes = {
  home,
  projects,
  project,
  contact,
  // Les pages Webstudio `categories` (liste) et `category` (détail d'une
  // catégorie) affichent la même grille `.projetFromProjets` que `projects`.
  // `categories` a en plus le nuage `#nuage` → module dédié ; `category`
  // (détail) réutilise tel quel l'init de `projects`.
  categories,
  category: projects,
}

// Webstudio pose parfois l'attribut sur un wrapper plutôt que sur <body>, donc
// on le cherche sur le body puis, à défaut, n'importe où dans le DOM.
export function pageCourante() {
  return (
    document.body.dataset.page ||
    document.querySelector('[data-page]')?.dataset.page
  )
}

export default function lancePageCourante() {
  const init = routes[pageCourante()]
  if (!init) return
  try {
    init()
  } catch (error) {
    // Une page qui plante ne doit pas emporter la transition avec elle : le
    // rideau doit se lever quoi qu'il arrive, sinon la page reste inutilisable.
    console.error('[routes] init de page en échec:', error)
  }
}
