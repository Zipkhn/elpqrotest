// navbar-color.js — inversion de couleur de la navbar au-dessus de #cloud (home).
//
// La navbar est sticky en haut. Quand elle survole la section #cloud, les 3
// traits du SVG du bouton menu ET le logo passent de l'orange #ca3b23 au blanc
// #ffffff, puis reviennent à l'orange une fois la section dépassée.
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

// Le logo dessine deux formes : le blob du O en #1D1D1B et le point central en
// #CB3A23. On ne repeint QUE le point : le blob reste noir, et le point — qui
// se confond avec le fond rouge de #cloud le reste du temps — apparaît en
// blanc. Un filter CSS était donc exclu : il aurait repeint les deux formes.
const LOGO_POINT = /#CB3A23/gi

let io

export default function initNavbarColor() {
  const cloud = document.getElementById('cloud')
  const nav = document.querySelector('.navbar')
  const btn = document.querySelector('.menu-btn')
  if (!cloud || !nav || !btn) return

  const paths = btn.querySelectorAll('svg path')
  if (!paths.length) return

  const setLogoWhite = prepareLogo(nav)
  const setWhite = (on) => {
    paths.forEach((p) => p.setAttribute('stroke', on ? WHITE : ORANGE))
    setLogoWhite(on)
  }

  const build = () => {
    io?.disconnect()
    const navH = nav.offsetHeight || 69
    // Root réduit par le bas de (viewport - navH) → il ne reste que les navH
    // premiers pixels en haut comme zone d'intersection (= là où est la navbar).
    io = new IntersectionObserver(
      (entries) => setWhite(entries[0].isIntersecting),
      {
        rootMargin: `0px 0px ${-(window.innerHeight - navH)}px 0px`,
        threshold: 0,
      }
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

// Le logo est un <img src="…svg"> : ses <path> ne sont pas dans le document,
// donc ni CSS ni setAttribute ne peuvent les atteindre. On télécharge le SVG
// une fois, on en fabrique une variante blanche en data-URI (instantanée, pas
// de requête au moment de la bascule) et on échange le src.
//
// Retourne un (on) => void ; un no-op si le logo n'est pas un SVG.
function prepareLogo(nav) {
  const img = nav.querySelector('img')
  const src = img && (img.currentSrc || img.getAttribute('src'))
  if (!src || !/\.svg(\?|$)/i.test(src)) return () => {}

  const origine = {
    src: img.getAttribute('src'),
    srcset: img.getAttribute('srcset'),
    sizes: img.getAttribute('sizes'),
  }
  let blanc = null
  let etat = false

  const applique = () => {
    if (etat && blanc) {
      // srcset/sizes l'emporteraient sur src : on les retire le temps du blanc,
      // et on les remet à l'identique au retour à l'orange.
      img.removeAttribute('srcset')
      img.removeAttribute('sizes')
      img.setAttribute('src', blanc)
    } else {
      img.setAttribute('src', origine.src)
      if (origine.srcset) img.setAttribute('srcset', origine.srcset)
      if (origine.sizes) img.setAttribute('sizes', origine.sizes)
    }
  }

  fetch(src)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
    .then((svg) => {
      if (!svg.includes('<svg')) return // format=auto a pu servir du raster
      blanc =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(svg.replace(LOGO_POINT, WHITE))
      applique() // l'observer a pu basculer avant la fin du téléchargement
    })
    .catch(() => {})

  return (on) => {
    if (on === etat) return
    etat = on
    applique()
  }
}
