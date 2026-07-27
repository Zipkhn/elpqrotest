// force-image-repaint.js — contourne un défaut de rastérisation de Chrome.
//
// SYMPTÔME : sur la home, seules 3 des 7 vignettes du slider se peignaient. Les
// 4 autres restaient blanches jusqu'à ce qu'on survole une vignette — le
// `style.width` posé par slider-desktop.js finissait par forcer le repaint.
//
// CE QUI A ÉTÉ ÉCARTÉ (mesuré sur le site, pas supposé) :
//   • le chargement : les 7 images sont `complete`, et `img.decode()` résout
//     pour les 7 — le bitmap est prêt, disponible, et rien ne change à l'écran ;
//   • un recouvrement : `elementsFromPoint` renvoie l'`<img>` en premier ;
//   • le CSS par élément : les 7 vignettes ont des classes strictement
//     identiques, donc aucune ne diffère des trois qui s'affichent ;
//   • la géométrie : `opacity:1`, `visibility:visible`, positions correctes.
//
// CE QUI DÉBLOQUE (établi par essais successifs) : uniquement un **recalcul de
// style au niveau du document qui touche les images**. Ne suffisent PAS : un
// style inline sur l'image ou sur son conteneur, un `decode()`, un micro-scroll,
// ni une feuille de style dont la règle ne cible aucun élément (contrôle
// négatif — c'est ce qui prouve que le déclencheur est bien le recalcul des
// images elles-mêmes, et pas le simple fait d'ajouter une balise <style>).
//
// D'où ce correctif : une fois toutes les images décodées, on ajoute une règle
// inoffensive sur `img`, on laisse passer deux frames, puis on la retire.
// Aucun effet visuel, aucun changement de mise en page.
//
// NB : `opacity` en feuille de style ne peut pas écraser les animations GSAP,
// qui posent leur opacité en inline — l'inline l'emporte toujours ici.
// TIMING — critique. Ce nudge doit partir APRÈS que le rideau de transition se
// soit levé. Chrome ne rastérise pas ce qui est entièrement masqué : tant que
// le rideau couvre l'écran, la règle est posée dans le vide et ne sert à rien.
// C'est ce qui rendait le résultat aléatoire d'un rechargement à l'autre (3, 4
// ou 7 vignettes selon les images ayant décodé avant que le rideau se lève).
// Voir l'appel dans main.js, branché sur la Promise d'initPageTransition().
function nudge() {
  const style = document.createElement('style')
  style.textContent = 'img{opacity:0.999}'
  document.head.appendChild(style)
  // Deux frames : la première applique la règle, la seconde laisse le
  // compositeur produire l'image avant qu'on retire le style.
  requestAnimationFrame(() => requestAnimationFrame(() => style.remove()))
}

// Un passage unique ne tient pas : Chrome reperd des tuiles APRÈS coup (observé
// en test — 7 vignettes peintes, puis 3, sans aucune interaction). Et le nudge
// n'a d'effet que si l'écran est réellement visible au moment où il part.
// D'où plusieurs passages étalés, plutôt qu'un seul bien placé : c'est peu
// coûteux (un <style> ajouté puis retiré) et ça ne peut pas « rater la fenêtre ».
const RAPPELS_MS = [0, 500, 1500, 3000]

export default function forceImageRepaint() {
  const images = [...document.querySelectorAll('img')]
  if (!images.length) return

  const decoded = images.map((img) =>
    img.decode ? img.decode().catch(() => {}) : Promise.resolve()
  )

  Promise.all(decoded).then(() => {
    for (const delai of RAPPELS_MS) setTimeout(nudge, delai)
  })

  // Une image qui finit de charger plus tard (lazy, hydratation Remix) n'est
  // couverte par aucun des rappels ci-dessus : on la rattrape à sa arrivée.
  for (const img of images) {
    if (!img.complete) img.addEventListener('load', () => nudge(), { once: true })
  }
}
