// main.js — point d'entrée du bundle Elparo.
//
// Le routing se fait par un attribut data-page, à définir dans Webstudio
// pour chaque page (sur le body, ou à défaut le wrapper de plus haut niveau) :
//   data-page="home" | "projects" | "project" | "contact" | "categories"
//
// La table des routes et le lancement de la page vivent dans routes.js, parce
// qu'ils servent DEUX fois : ici au premier chargement, et dans
// page-transition.js à chaque navigation SPA.
import './webstudio-utils.js'
import './styles/style.css'
import lancePageCourante from './routes.js'
import initMenuReveal from './shared/menu-reveal.js'
import initPageTransition from './shared/page-transition.js'

window.Webstudio.onReady(() => {
  // La transition entre pages est présente partout.
  initPageTransition()

  // Le menu plein écran (Dialog Radix) est global : on branche son animation
  // d'ouverture partout. L'observer ne fait rien tant que .menu_draggers
  // n'apparaît pas → inoffensif sur les pages sans menu.
  initMenuReveal()

  // Exécute uniquement le script de la page courante.
  lancePageCourante()
})
