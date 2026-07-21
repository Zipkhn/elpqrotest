// main.js — point d'entrée du bundle Elparo.
//
// Le routing se fait par une classe sur le <body>, à définir dans Webstudio
// pour chaque page (Settings de la page → Class du body) :
//   body--home | body--projects | body--project | body--contact
import './webstudio-utils.js'
import './styles/style.css'
import contact from './pages/contact.js'
import home from './pages/home.js'
import project from './pages/project.js'
import projects from './pages/projects.js'
import initPageTransition from './shared/page-transition.js'

const routes = {
  'body--home': home,
  'body--projects': projects,
  'body--project': project,
  'body--contact': contact,
}

window.Webstudio.onReady(() => {
  // La transition entre pages est présente partout
  initPageTransition()

  // Exécute uniquement le script de la page courante
  const body = document.body
  for (const [className, init] of Object.entries(routes)) {
    if (body.classList.contains(className)) {
      init()
      return
    }
  }
})
