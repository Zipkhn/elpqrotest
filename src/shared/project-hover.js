// project-hover.js — effet de survol des vignettes projet (rideau `.hover_projets{i}`).
// Mutualisé : bloc identique dans home / project / projects.
import { gsap } from '../lib/gsap.js'

export default function initProjectHover() {
  const projets = document.querySelectorAll('.projetFromProjets')
  if (!projets.length) return

  for (let i = 0; i < projets.length; i++) {
    let isComplete = false

    projets[i].addEventListener('mouseenter', () => {
      const tl = gsap.timeline()
      const hoverAnim = tl.fromTo(
        `.hover_projets${i}`,
        { translateY: '-100%' },
        {
          translateY: 0,
          duration: 1,
          stagger: { each: 0.1, from: 'start', grid: [1, 3] },
          ease: 'expo.out',
        },
        0
      )

      hoverAnim.eventCallback('onComplete', () => {
        isComplete = true
      })

      projets[i].addEventListener('mouseleave', () => {
        if (isComplete === false) {
          tl.reverse()
        } else {
          const tl2 = gsap.timeline()
          tl2.to(
            `.hover_projets${i}`,
            {
              translateY: '100%',
              duration: 1,
              stagger: { each: 0.1, from: 'start', grid: [1, 3] },
              ease: 'expo.inOut',
            },
            0
          )
          tl2.eventCallback('onComplete', () => {
            isComplete = false
          })
        }
      })
    })
  }
}
