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

// LE RIDEAU NE PASSE PAS PAR `onReady` — IL EN EST LA VICTIME.
//
// `onReady` attend que le DOM se taise : 150ms de silence, et jusqu'à 3s si la
// page continue de muter pendant l'hydratation Remix. Tant qu'il n'a pas rendu
// la main, l'intro n'est pas jouée et les volets restent en position couvrante.
// Mesuré en prod sur /category/upcycling : volet opaque, plein écran, de 185ms
// à 2527ms. Le visiteur regarde un aplat pendant 2,3s alors que la page est
// prête depuis longtemps (LCP à 323ms, domContentLoaded à 412ms).
//
// Rien ne justifie cette attente ici. Le script est en `defer`, donc le DOM est
// parsé et les volets du HTML serveur sont déjà là. `initPageTransition` se
// débrouille seul pour le reste : il rebranche son écouteur de clic de façon
// idempotente, et si `.transition` manque encore, il attend son apparition avec
// son propre observer (voir page-transition.js). Quant à React qui remplace les
// volets en cours d'animation, `revealTransition` reconstruit sa timeline à la
// même progression — c'est déjà prévu.
//
// `initMenuReveal` et `lancePageCourante` RESTENT dans `onReady` : eux ont
// besoin de positions de layout définitives, sinon ScrollTrigger calcule ses
// start/end sur une page en cours de montage.
initPageTransition()

window.Webstudio.onReady(() => {
  // Le menu plein écran (Dialog Radix) est global : on branche son animation
  // d'ouverture partout. L'observer ne fait rien tant que .menu_draggers
  // n'apparaît pas → inoffensif sur les pages sans menu.
  initMenuReveal()

  // Exécute uniquement le script de la page courante.
  lancePageCourante()
})
