// reveal-batch.js — apparition au scroll d'un lot d'éléments (ScrollTrigger.batch).
// Mutualisé : home utilisait `.projetFromProjets`, la page projet `.item_container`.
import { gsap, ScrollTrigger } from '../lib/gsap.js'

export default function initRevealBatch(selector) {
  const items = document.querySelectorAll(selector)
  if (!items.length) return

  gsap.set(selector, { y: 100 })

  ScrollTrigger.batch(selector, {
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        stagger: { each: 0.15, grid: [1, 3] },
        overwrite: true,
      }),
    onLeave: (batch) =>
      gsap.set(batch, { opacity: 0, y: -100, overwrite: true }),
    onEnterBack: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, stagger: 0.15, overwrite: true }),
    onLeaveBack: (batch) =>
      gsap.set(batch, { opacity: 0, y: 100, overwrite: true }),
  })

  ScrollTrigger.addEventListener('refreshInit', () =>
    gsap.set('.image', { y: 0 })
  )
}
