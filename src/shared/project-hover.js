// project-hover.js — effet de survol des vignettes projet (rideau `.hover_projets{i}`).
// Mutualisé : bloc identique dans home / project / projects.
//
// LE GESTIONNAIRE DE SORTIE EST POSÉ UNE SEULE FOIS, plus à chaque entrée.
//
// L'ancienne version appelait `addEventListener('mouseleave', …)` À L'INTÉRIEUR
// du `mouseenter`. Chaque survol en ajoutait donc un de plus, chacun avec sa
// propre fermeture — sa propre timeline, sa propre lecture d'`isComplete`. Au
// cinquième survol d'une même vignette, cinq gestionnaires se déclenchaient à la
// sortie : cinq animations concurrentes sur les mêmes `.hover_projets{i}`, dont
// quatre portant un état périmé. C'est ce qui rendait le rideau saccadé, et
// parfois bloqué à mi-course. Leur nombre ne redescendait jamais, et il
// repartait de zéro seulement au rechargement complet de la page.
//
// L'ANIMATION VISIBLE EST INCHANGÉE, y compris ses deux sorties distinctes :
//   • rideau pas encore entièrement descendu → il REMONTE (reverse) ;
//   • rideau arrivé au bout → il POURSUIT vers le bas (translateY: 100%).
// `overwrite: true` en plus : un aller-retour rapide annule l'animation en cours
// au lieu de s'empiler dessus.
import { gsap } from '../lib/gsap.js'
import { surNettoyage } from './teardown.js'

export default function initProjectHover() {
  const projets = document.querySelectorAll('.projetFromProjets')
  if (!projets.length) return

  const CADENCE = { each: 0.1, from: 'start', grid: [1, 3] }
  const detacher = []

  projets.forEach((projet, i) => {
    const volets = `.hover_projets${i}`
    // État porté par la fermeture de CETTE vignette, et par elle seule : un seul
    // couple de gestionnaires le lit et l'écrit, il ne peut plus diverger.
    let entree = null
    let complet = false

    const entre = () => {
      complet = false
      entree = gsap.timeline({ onComplete: () => (complet = true) })
      entree.fromTo(
        volets,
        { translateY: '-100%' },
        {
          translateY: 0,
          duration: 1,
          stagger: CADENCE,
          ease: 'expo.out',
          overwrite: true,
        },
        0
      )
    }

    const sort = () => {
      if (!complet) {
        entree?.reverse()
        return
      }
      gsap.to(volets, {
        translateY: '100%',
        duration: 1,
        stagger: CADENCE,
        ease: 'expo.inOut',
        overwrite: true,
        onComplete: () => (complet = false),
      })
    }

    projet.addEventListener('mouseenter', entre)
    projet.addEventListener('mouseleave', sort)

    detacher.push(() => {
      projet.removeEventListener('mouseenter', entre)
      projet.removeEventListener('mouseleave', sort)
      entree?.kill()
    })
  })

  // En SPA le document ne change pas : sans ceci, les gestionnaires des routes
  // précédentes survivraient sur des nœuds détachés.
  surNettoyage(() => detacher.forEach((fn) => fn()))
}
