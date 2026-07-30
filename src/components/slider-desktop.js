// slider-desktop.js — au survol, la vignette s'élargit et affiche titre + lieu.
//
// Deux corrections par rapport à la version précédente, invisibles à l'œil mais
// qui expliquaient le survol capricieux du hero :
//
// 1. LE GESTIONNAIRE DE SORTIE N'EST PLUS POSÉ DANS CELUI D'ENTRÉE. Chaque
//    survol en ajoutait un de plus, indéfiniment. Ils faisaient tous la même
//    chose, donc l'effet visible restait à peu près correct, mais le navigateur
//    finissait par exécuter des dizaines d'écritures de style par sortie de
//    souris — et rien ne les libérait jamais.
//
// 2. `mouseenter`/`mouseleave` AU LIEU DE `mouseover`/`mouseout`. Ces derniers
//    REMONTENT depuis les enfants : passer de la vignette au titre qu'elle
//    contient déclenchait un `mouseout` puis un `mouseover`, donc un
//    rétrécissement suivi d'un ré-élargissement. La vignette « clignotait »
//    quand la souris traversait son texte. `mouseenter`/`mouseleave` ne se
//    déclenchent qu'aux frontières réelles de l'élément.
import { surNettoyage } from '../shared/teardown.js'

// Largeurs au repos / au survol. Elles vivent ici et pas en CSS parce que la
// transition est portée par la propriété `width` de Webstudio.
const LARGEUR_REPOS = '7vw'
const LARGEUR_SURVOL = '35vw'

export default function initSliderDesktop() {
  const vignettes = document.querySelectorAll('.project_container')
  if (!vignettes.length) return

  const titres = document.querySelectorAll('.project_title')
  const lieux = document.querySelectorAll('.project_location')
  const detacher = []

  vignettes.forEach((vignette, i) => {
    // Les trois listes sont alignées par index (une vignette, son titre, son
    // lieu). Les gardes restent : une page peut légitimement n'avoir ni titre
    // ni lieu sur certaines vignettes.
    const affiche = (visible) => {
      vignette.style.width = visible ? LARGEUR_SURVOL : LARGEUR_REPOS
      const opacite = visible ? '100%' : '0'
      if (titres[i]) titres[i].style.opacity = opacite
      if (lieux[i]) lieux[i].style.opacity = opacite
    }

    const entre = () => affiche(true)
    const sort = () => affiche(false)

    vignette.addEventListener('mouseenter', entre)
    vignette.addEventListener('mouseleave', sort)

    detacher.push(() => {
      vignette.removeEventListener('mouseenter', entre)
      vignette.removeEventListener('mouseleave', sort)
    })
  })

  surNettoyage(() => detacher.forEach((fn) => fn()))
}
