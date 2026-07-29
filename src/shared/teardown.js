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

export default function nettoieRoute() {
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
