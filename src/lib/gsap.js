// gsap.js — point d'entrée unique pour GSAP et ses plugins.
// GSAP est bundlé dans le build : plus besoin de charger un <script> CDN
// séparé sur le site (sinon deux instances entrent en conflit).
// Le plugin `Observer` a été retiré de l'enregistrement : plus rien ne l'utilise
// depuis la suppression de l'ancien `horizontalLoop` du slider mobile (remplacé
// par le scroll-snap natif de l'embed Webstudio).
//
// À NOTER : ça ne fait PAS maigrir le bundle, contrairement à ce qu'on pourrait
// croire — ScrollTrigger dépend d'Observer en interne, il est donc embarqué de
// toute façon. Mesuré : la taille de dist/main.js n'a pas bougé d'un octet du
// fait de ce retrait. C'est une suppression de code mort, pas une optimisation.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Sur mobile, la barre d'URL du navigateur qui apparaît/disparaît au scroll
// change la hauteur du viewport et déclenche un resize. Par défaut ScrollTrigger
// répond par un refresh() qui recalcule et « snappe » les éléments pinnés
// (le footer sautait alors d'un coup, sans scrub). On ignore ces resize
// verticaux mobiles : le pin reste fluide.
ScrollTrigger.config({ ignoreMobileResize: true })

export { gsap, ScrollTrigger }
