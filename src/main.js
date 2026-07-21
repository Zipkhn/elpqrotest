// main.js — point d'entrée du bundle Elparo.
//
// Le routing se fait par un attribut data-page, à définir dans Webstudio
// pour chaque page (sur le body, ou à défaut le wrapper de plus haut niveau) :
//   data-page="home" | "projects" | "project" | "contact"
import './webstudio-utils.js'
import './styles/style.css'
import contact from './pages/contact.js'
import home from './pages/home.js'
import project from './pages/project.js'
import projects from './pages/projects.js'
import initPageTransition from './shared/page-transition.js'

const routes = {
  home,
  projects,
  project,
  contact,
}

window.Webstudio.onReady(() => {
  // La transition entre pages est présente partout
  initPageTransition()

  // Exécute uniquement le script de la page courante.
  // Webstudio pose parfois l'attribut sur un wrapper plutôt que sur <body>,
  // donc on le cherche sur le body puis, à défaut, n'importe où dans le DOM.
  const page =
    document.body.dataset.page ||
    document.querySelector('[data-page]')?.dataset.page
  const init = routes[page]
  if (init) init()
})

console.log('Elparo bundle loaded')
