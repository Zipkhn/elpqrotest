// gsap.js — point d'entrée unique pour GSAP et ses plugins.
// GSAP est bundlé dans le build : plus besoin de charger un <script> CDN
// séparé sur le site (sinon deux instances entrent en conflit).
import { gsap } from 'gsap'
import { Observer } from 'gsap/Observer'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger, Observer)

export { gsap, ScrollTrigger, Observer }
