// navbar-color.js — inversion de couleur du menu au-dessus de #cloud (home).
//
// La navbar est sticky en haut. Quand elle survole la section #cloud, les 3
// traits du SVG du bouton menu passent de l'orange #ca3b23 au blanc #ffffff,
// puis reviennent à l'orange une fois la section dépassée.
//
// Détection via IntersectionObserver : on place une bande de détection de la
// hauteur de la navbar tout en haut du viewport (là où la navbar est collée).
// Tant que #cloud croise cette bande, le menu est blanc. La bande dépend de la
// hauteur du viewport → on la recalcule au resize.
//
// Le SVG a `transition: all` → le changement de stroke est déjà fluide.
// Effet propre à la home : sur les pages sans #cloud, on ne fait rien.

const ORANGE = '#ca3b23'
const WHITE = '#ffffff'

let io

export default function initNavbarColor() {
  const cloud = document.getElementById('cloud')
  const nav = document.querySelector('.navbar')
  const btn = document.querySelector('.menu-btn')
  if (!cloud || !nav || !btn) return

  const paths = btn.querySelectorAll('svg path')
  if (!paths.length) return
  const setWhite = (on) =>
    paths.forEach((p) => p.setAttribute('stroke', on ? WHITE : ORANGE))

  const build = () => {
    io?.disconnect()
    const navH = nav.offsetHeight || 69
    // Root réduit par le bas de (viewport - navH) → il ne reste que les navH
    // premiers pixels en haut comme zone d'intersection (= là où est la navbar).
    io = new IntersectionObserver(
      (entries) => setWhite(entries[0].isIntersecting),
      { rootMargin: `0px 0px ${-(window.innerHeight - navH)}px 0px`, threshold: 0 }
    )
    io.observe(cloud)
  }
  build()

  // La bande dépend de innerHeight → recalcul au resize (petit débounce).
  let t
  window.addEventListener('resize', () => {
    clearTimeout(t)
    t = setTimeout(build, 150)
  })
}
