// footer.js — colonnes du footer qui montent au scroll (pin + scrub).
// Mutualisé : bloc identique dans home / project / projects / contact.
import { gsap, ScrollTrigger } from '../lib/gsap.js'

export default function initFooter() {
  if (!document.querySelector('.cols_footer')) return

  // Idempotence : sur une navigation SPA Webstudio ou une ré-hydratation React,
  // initFooter peut se rejouer. On tue le trigger précédent pour ne pas empiler
  // deux animations sur le même footer (source de sauts).
  ScrollTrigger.getById('footer')?.kill(true)

  gsap.set('.col_footer', { height: '0%' })
  gsap.set('.text_footer', { opacity: '0%' })

  const tlFooter = gsap.timeline({
    scrollTrigger: {
      id: 'footer',
      trigger: '.cols_footer',
      pin: true,
      anticipatePin: 1, // lisse l'instant où le pin s'enclenche (pas de saut)
      scrub: 0.5, // moins de latence que 1
      start: 'bottom bottom',
      // DURÉE DE LA COURSE — distance de scroll pendant laquelle le footer est
      // pinné et les colonnes montent. C'est LE réglage de vitesse : plus la
      // valeur est grande, plus la montée est étalée et lente.
      //
      // `+=100%` = un écran entier de scroll. L'ancienne valeur (`bottom 40%`)
      // ne laissait que 60% de fenêtre, soit 484px mesurés : l'animation était
      // bouclée entre scrollY 1492 et 1899 sur /projets/all, d'où l'impression
      // de course expédiée.
      //
      // Cette distance est aussi la hauteur du `.pin-spacer-footer` : l'allonger
      // rallonge d'autant le document. C'est normal, c'est la zone d'animation.
      end: '+=100%',
    },
  })

  // ORDRE : la colonne de DROITE part la première, puis le milieu, puis la
  // gauche. L'ordre inverse (gauche d'abord) donnait un mouvement qui semblait
  // se retourner en cours de route : la gauche prenait la tête au début, alors
  // que la droite est la plus haute à l'arrivée (100% contre 90%). La droite
  // mène désormais du début à la fin.
  tlFooter
    .to('.col_footer_3', { height: '100%', ease: 'power3.out' })
    .to('.col_footer_2', { height: '95%', ease: 'power3.out' }, '-=75%')
    .to('.col_footer_1', { height: '90%', ease: 'power3.out' }, '-=60%')
    // Le texte (h1 + p) ne doit pas attendre la fin des colonnes : il démarre
    // pendant la montée de col_footer_3 et se joue vite (durée + stagger courts).
    .to(
      '.text_footer',
      {
        opacity: '100%',
        duration: 0.25,
        stagger: { each: 0.06 },
        ease: 'power2.out',
      },
      '-=80%'
    )
}
