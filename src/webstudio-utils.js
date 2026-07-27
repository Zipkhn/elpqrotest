// webstudio-utils.js — porte d'entrée des inits du bundle.
//
// Webstudio publie une app **Remix** : le HTML arrive rendu côté serveur, puis
// React **hydrate** la page et RECRÉE une partie des nœuds. Tout ce qu'on
// branche avant la fin de l'hydratation (listeners, tweens GSAP, mesures
// ScrollTrigger, styles inline) part à la poubelle avec les nœuds jetés — d'où
// le fameux « le JS ne marche qu'après un refresh », le flash du rideau de
// transition, et les ScrollTriggers qui pointent dans le vide.
//
// L'ancienne version attendait `setTimeout(…, 100)` + 1 rAF : une valeur
// DEVINÉE, gagnante ou perdante selon le réseau, le cache et le CPU — donc un
// bug intermittent. On attend désormais un vrai signal : que le DOM se soit
// **tu**. Plus aucune mutation pendant QUIET_MS → l'hydratation est finie, on
// peut initialiser sur des nœuds définitifs.
//
// Cette approche est agnostique de la version de Remix (contrairement à un test
// sur `window.__remixContext`, qui change d'une version à l'autre).
window.Webstudio ||= []

// Silence à observer avant de considérer le DOM stable.
const QUIET_MS = 150
// Filet de sécurité : si la page mute en continu (animation CSS qui touche un
// attribut, widget tiers…), on n'attend pas indéfiniment. Volontairement
// généreux : trop court recréerait la course qu'on cherche à supprimer.
const MAX_WAIT_MS = 3000

let settled = false
const pending = []

function run(callback) {
  try {
    callback()
  } catch (error) {
    console.error('Webstudio callback error:', error)
  }
}

// Les callbacks enregistrés avant la stabilisation sont mis en file ; ceux
// enregistrés après s'exécutent immédiatement.
window.Webstudio.onReady = (callback) => {
  if (settled) run(callback)
  else pending.push(callback)
}

function waitForSettledDom() {
  let quietTimer
  const observer = new MutationObserver(scheduleFinish)

  function finish() {
    if (settled) return
    settled = true
    clearTimeout(quietTimer)
    clearTimeout(hardStop)
    observer.disconnect()
    // Un rAF de plus : le layout est à jour quand ScrollTrigger prend ses
    // mesures, sinon les start/end se calculent sur une page pas encore posée.
    requestAnimationFrame(() => pending.splice(0).forEach(run))
  }

  function scheduleFinish() {
    clearTimeout(quietTimer)
    quietTimer = setTimeout(finish, QUIET_MS)
  }

  const hardStop = setTimeout(finish, MAX_WAIT_MS)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  })
  scheduleFinish() // amorce : si le DOM ne bouge jamais, on part après QUIET_MS
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForSettledDom)
} else {
  waitForSettledDom()
}
