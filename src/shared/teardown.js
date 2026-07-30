// teardown.js — nettoyage entre deux routes.
//
// Indispensable dès lors qu'on navigue en SPA : le document ne change plus, donc
// rien n'est remis à zéro par le navigateur. Tout ce que les modules ont créé
// sur la route précédente survit et s'empile.
//
// Ce que les modules laissent derrière eux, mesuré sur le dépôt :
//   reveal-batch.js  4 ScrollTrigger   aucun kill
//   footer.js        2 ScrollTrigger   aucun kill  (dont un pin)
//   home.js          1 ScrollTrigger   aucun kill
// Sans ce nettoyage, le pin du footer se dupliquerait à chaque navigation et le
// scroll deviendrait poussif au bout de quelques pages — un défaut qui ne se
// voit qu'après plusieurs clics, donc facile à rater en test.
import { ScrollTrigger, gsap } from '../lib/gsap.js'

// REGISTRE DE DÉSINSCRIPTION.
//
// GSAP n'est que la moitié de ce que les modules laissent derrière eux. L'autre
// moitié — les `addEventListener` sur window/document et les
// MutationObserver/IntersectionObserver — ne meurt avec RIEN : ni avec le
// document (il ne change plus en SPA), ni avec `ScrollTrigger.kill()`. Ils
// s'empilaient donc pour toute la session, sur des nœuds détachés.
//
// Le pire cas mesuré à la lecture : le `mousemove` du nuage magnétique, qui fait
// un `getBoundingClientRect()` (donc un reflow forcé) plus 25 distances À CHAQUE
// MOUVEMENT DE SOURIS. Trois visites de la home = trois exemplaires, dont deux
// qui animent des éléments qui ne sont plus dans la page.
//
// Chaque module qui branche quelque chose de durable enregistre ici de quoi le
// défaire. On garde volontairement l'API minimale : une fonction sans argument.
const aNettoyer = []

export function surNettoyage(defaire) {
  aNettoyer.push(defaire)
}

export default function nettoieRoute() {
  // 0. Les désinscriptions annoncées par les modules. EN PREMIER : un listener
  //    qui survivrait à la mise à mort des tweens pourrait en recréer.
  //    `splice(0)` vide le registre dans le même geste — une désinscription ne
  //    doit pas être rejouée à la navigation suivante.
  //    Chacune est isolée : un module qui plante ici ne doit pas empêcher les
  //    autres de se nettoyer, ni faire échouer toute la reprise de route.
  aNettoyer.splice(0).forEach((defaire) => {
    try {
      defaire()
    } catch (error) {
      console.error('[teardown] désinscription en échec:', error)
    }
  })

  // 1. Tous les ScrollTrigger. Aucun n'appartient à la transition (le rideau
  //    n'en utilise pas), on peut donc tout tuer sans précaution.
  ScrollTrigger.getAll().forEach((st) => st.kill())

  // 2. Les tweens ORPHELINS. React a jeté les nœuds de la route précédente,
  //    mais GSAP continue de les animer et les retient en mémoire.
  //
  //    On ne tue QUE ceux dont toutes les cibles ont quitté le document : le
  //    rideau de transition est animé au même moment sur des nœuds bien
  //    connectés, et il doit survivre à la bascule.
  //
  //    getChildren(nested, tweens, timelines) — on demande les tweens imbriqués
  //    et pas les timelines, qu'on tuerait en double via leurs enfants.
  gsap.globalTimeline.getChildren(true, true, false).forEach((tween) => {
    const cibles = typeof tween.targets === 'function' ? tween.targets() : []
    if (!cibles.length) return

    const toutesDetachees = cibles.every(
      (c) => c && c.nodeType === 1 && !c.isConnected
    )
    if (toutesDetachees) tween.kill()
  })
}
