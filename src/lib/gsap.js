// gsap.js — point d'entrée unique pour GSAP et ses plugins.
// GSAP est bundlé dans le build : plus besoin de charger un <script> CDN
// séparé sur le site (sinon deux instances entrent en conflit).
import { gsap } from 'gsap'
import { Observer } from 'gsap/Observer'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger, Observer)

// Sur mobile, la barre d'URL du navigateur qui apparaît/disparaît au scroll
// change la hauteur du viewport et déclenche un resize. Par défaut ScrollTrigger
// répond par un refresh() qui recalcule et « snappe » les éléments pinnés
// (le footer sautait alors d'un coup, sans scrub). On ignore ces resize
// verticaux mobiles : le pin reste fluide.
ScrollTrigger.config({ ignoreMobileResize: true })

export { gsap, ScrollTrigger, Observer }
