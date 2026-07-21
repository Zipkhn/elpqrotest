// slider-mobile.js — carrousel infini piloté au geste (pointer / touch / wheel).
import { gsap, Observer } from '../lib/gsap.js'
import { horizontalLoop } from '../lib/horizontal-loop.js'

export default function initSliderMobile() {
  const track = document.querySelector('.slider_container_mobile')
  if (!track || !track.querySelector('a')) return

  // Boucle infinie, arrêtée au départ
  const loop = horizontalLoop('.slider_container_mobile a', { repeat: -1 })
  // Décélère toujours le timeScale vers 0 sur 0.5s
  const slow = gsap.to(loop, { timeScale: 0, duration: 0.5 })
  loop.timeScale(0)

  // Observer : le geste pilote le timeScale de la boucle
  Observer.create({
    target: '.slider_container_mobile',
    type: 'pointer,touch,wheel',
    wheelSpeed: -1,
    onChange: (self) => {
      loop.timeScale(
        Math.abs(self.deltaX) > Math.abs(self.deltaY)
          ? -self.deltaX
          : -self.deltaY
      )
      slow.invalidate().restart()
    },
  })
}
