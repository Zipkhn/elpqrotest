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
export default function forceImageRepaint() {
  const images = [...document.querySelectorAll('img')]
  if (!images.length) return

  const decoded = images.map((img) =>
    img.decode ? img.decode().catch(() => {}) : Promise.resolve()
  )

  Promise.all(decoded).then(() => {
    const style = document.createElement('style')
    style.textContent = 'img{opacity:0.999}'
    document.head.appendChild(style)
    // Deux frames : la première applique la règle, la seconde laisse le
    // compositeur produire l'image avant qu'on retire le style.
    requestAnimationFrame(() => requestAnimationFrame(() => style.remove()))
  })
}
