// page-transition.js — animation de transition entre pages (rideau `.transition`).
// Mutualisé : ce bloc était copié à l'identique dans home / project / projects / contact.
import { gsap } from '../lib/gsap.js'
import lancePageCourante from '../routes.js'
import nettoieRoute from './teardown.js'

// Décalage entre les 3 volets. Volontairement un simple nombre, et SURTOUT pas
// `{ grid: [1, 3] }` comme avant : cette grille était figée à 3 cellules et se
// dégradait EN SILENCE dès que le nombre de volets changeait. Quand un <h1>
// portait aussi la classe `.transition`, GSAP recevait 4 cibles, la 4e passait
// en 2e ligne de la grille et se retrouvait à la même distance que la 2e —
// donc au même délai. Le volet de droite se levait exactement avec celui du
// milieu, sans aucune erreur en console. Un stagger simple échelonne par index,
// quel que soit le nombre d'éléments.
//
// 0.25s et non 0.1 : l'animation dure 1,5s en expo.inOut, une courbe qui laisse
// le volet quasi immobile pendant les premiers 40% puis le projette d'un coup.
// À 0,1s d'écart, les trois « coups » se chevauchaient presque entièrement et
// l'œil ne lisait qu'un seul départ. Valeur esthétique, à ajuster librement.
const DECALAGE_VOLETS = 0.25

function construitReveal(volets) {
  const tl = gsap.timeline({ paused: true })
  tl.fromTo(
    volets,
    { translateY: 0 },
    {
      translateY: '-100vh',
      duration: 1.5,
      delay: 0.2,
      stagger: DECALAGE_VOLETS,
      ease: 'expo.inOut',
    },
    0
  )
  return tl
}

// L'intro se joue PENDANT que Remix hydrate encore. Mesuré (CPU ×6, 4G lente,
// /projets/all) : le reveal démarre à 606ms, et à 872ms React REMPLACE les trois
// volets par des nœuds neufs. GSAP continue alors d'animer les anciens, détachés
// donc invisibles ; les nouveaux restent à translateY(0), plein écran noir. À la
// fin du timeline, le `gsap.set('.transition', …)` + `lockCurtainHidden()` de
// joueIntro re-interrogent le DOM, tombent sur les NOUVEAUX volets et les font
// disparaître d'un coup : le rideau ne remonte jamais, la page apparaît d'un
// bloc. C'était le « flash blanc » et le « elparo qui clignote ».
//
// La porte d'attente de webstudio-utils ne suffit pas : son silence de 150ms peut
// s'ouvrir dans une accalmie de l'hydratation, avant le remplacement. Plutôt que
// de rallonger ce délai (on retomberait sur une valeur devinée), on encaisse le
// remplacement : dès qu'il arrive, on reconstruit le timeline sur les nouveaux
// volets et on le repositionne à la MÊME progression. Le mouvement continue sans
// rupture visible.
//
// MutationObserver et pas `onUpdate` du timeline : le callback d'un observer
// s'exécute avant le prochain paint, donc le rebranchement se fait dans la frame
// même du remplacement. Avec onUpdate on peindrait une frame avec les nouveaux
// volets encore à translateY(0) — un sursaut du rideau vers le bas.
//
// Le test est en O(1) : tant que le premier volet est toujours dans le document,
// rien n'a été remplacé. L'observer voit passer toutes les mutations de
// l'hydratation, il ne doit donc surtout pas faire de travail à chaque appel.
function revealTransition() {
  return new Promise((resolve) => {
    let volets = [...document.querySelectorAll('.transition')]
    let tl = construitReveal(volets)

    const observer = new MutationObserver(() => {
      if (volets[0]?.isConnected) return

      const actuels = [...document.querySelectorAll('.transition')]
      if (!actuels.length) return // remplacement en cours : on attend la suite

      const progression = tl.progress()
      tl.kill()
      volets = actuels
      tl = construitReveal(volets)
      tl.eventCallback('onComplete', termine)
      tl.progress(progression).play()
    })

    function termine() {
      observer.disconnect()
      resolve()
    }

    observer.observe(document.body, { childList: true, subtree: true })
    tl.eventCallback('onComplete', termine)
    tl.play()
  })
}

// FOND DU DOCUMENT — sombre entre deux pages, clair une fois la page affichée.
//
// Le trou entre deux documents ne peut être peint que par le fond de <html> :
// à cet instant, rien d'autre n'existe encore. Il est donc mis à #222 en CSS
// dans le <head> Webstudio, pour qu'il se confonde avec le rideau au lieu
// d'afficher le blanc par défaut.
//
// Mais ce fond reste visible APRÈS le chargement, et pas qu'un peu : le pin du
// footer crée un `.pin-spacer-footer` en `position:absolute`, donc HORS DU
// FLUX. Le <body> ne le compte pas dans sa hauteur alors qu'il rallonge le
// document — 484px mesurés sur /categories/ (document 4747, body 4263). Cette
// bande en bas de page affichait donc du #222 sous le footer.
//
// On aligne donc <html> sur la couleur du <body> dès que le bundle tourne. Le
// sombre ne sert plus qu'au moment où il est utile. On copie la couleur réelle
// du body plutôt que d'en coder une en dur : elle change d'une page à l'autre
// (blanc sur la home et le contact, #f2f2f2 sur /projets/all et /categories/).
//
// NB : les 484px de vide défilable en bas de chaque page sont un défaut à part
// entière, antérieur à tout ceci — il était simplement invisible tant que la
// bande avait la même couleur que la page.
function aligneFondDocument() {
  const fondBody = getComputedStyle(document.body).backgroundColor
  // Body transparent → on ne sait pas quoi copier, et écraser le #222 par du
  // transparent ramènerait le blanc du canvas. On laisse en l'état.
  if (!fondBody || fondBody === 'rgba(0, 0, 0, 0)') return
  document.documentElement.style.backgroundColor = fondBody
}

// Webstudio publie une app **Remix** : React hydrate la page ~1s après notre
// init et RECRÉE les nœuds du rideau → tous les styles inline posés par GSAP
// (visibility:hidden, translateY:-100vh) sont effacés, le rideau repart à son
// état initial « couvrant » pendant quelques frames, alors que l'intro est
// finie depuis longtemps. C'était le flash noir après le chargement (« le menu
// qui s'affiche entre deux transitions »).
//
// Un style INLINE se fait effacer par l'hydratation ; une règle CSS dans
// <head>, non — et elle s'applique aussi aux nœuds recréés. On verrouille donc
// le rideau en CSS dès que l'intro est finie, et on déverrouille juste avant
// de le rejouer.
//
// `display:none` et surtout PAS `visibility:hidden` : le rideau est un calque
// composité (position:fixed plein écran, z-index 9999, `will-change:transform`
// sur les volets). En `visibility:hidden` le calque RESTE dans l'arbre de
// composition, posé au-dessus du hero — et ce qui est dessous n'est plus
// réinvalidé quand les images finissent de décoder : sur la home, 4 des 7
// vignettes du slider ne se peignaient jamais tant qu'on ne survolait pas une
// vignette (le `style.width` du hover forçait enfin le repaint). Vérifié par
// contrôle : injecter une règle sans effet ne débloque rien, `display:none`
// sur .transition_div débloque les 7 immédiatement.
const DONE_STYLE_ID = 'ws-transition-done'

function lockCurtainHidden() {
  if (document.getElementById(DONE_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = DONE_STYLE_ID
  style.textContent = '.transition_div{display:none!important;}'
  document.head.appendChild(style)
}

function unlockCurtain() {
  document.getElementById(DONE_STYLE_ID)?.remove()
}

// CHIEN DE GARDE — le rideau figé rend la page inutilisable (écran plein).
// Observé sur certaines pages projet atteintes depuis le slider du hero, de
// façon intermittente : l'intro ne se joue jamais et le rideau reste couvrant.
// Non reproduit en test (chargement direct ET clic depuis le hero fonctionnent),
// donc la cause reste ouverte — mais un visiteur ne doit pas rester bloqué.
//
// On vérifie donc tardivement que l'intro a bien eu lieu (le verrou CSS en est
// la preuve). Sinon on journalise l'état complet pour le diagnostic, puis on
// débloque. DELAI généreux : l'intro dure ~1,9s, et l'init peut lui-même partir
// jusqu'à 3s après le chargement si le DOM ne se stabilise pas.
const WATCHDOG_MS = 6000

function surveilleRideau() {
  setTimeout(() => {
    if (document.getElementById(DONE_STYLE_ID)) return // intro terminée : OK

    const panneau = document.querySelector('.transition')
    if (!panneau) return
    const style = getComputedStyle(panneau)
    const couvreEncore =
      style.visibility === 'visible' &&
      panneau.getBoundingClientRect().bottom > 1
    if (!couvreEncore) return

    console.warn(
      '[transition] rideau figé après %dms — déblocage forcé',
      WATCHDOG_MS,
      {
        url: location.pathname,
        inlineDuDiv: document
          .querySelector('.transition_div')
          ?.getAttribute('style'),
        volets: [...document.querySelectorAll('.transition')].map(
          (p) =>
            getComputedStyle(p).visibility + ' ' + getComputedStyle(p).transform
        ),
      }
    )

    gsap.set('.transition', { visibility: 'hidden' })
    lockCurtainHidden()
  }, WATCHDOG_MS)
}

// Le mot « elparo » ne doit pas survivre à la descente du rideau.
//
// Entre deux documents, l'écran n'affiche plus que le fond du nouveau document
// — un aplat #222 posé en CSS dans le <head> Webstudio, sans aucun contenu,
// puisque rien n'est encore peint. Le mot est donc forcément absent pendant ce
// trou. S'il est encore là à la dernière image de la page sortante, on le voit
// disparaître puis revenir : il « saute ». Tant que le trou était blanc, ce
// saut passait inaperçu — noyé dans le flash. Fond continu, saut visible.
//
// On l'efface donc AVANT le trou, en fondu, pour que la dernière image de
// l'ancienne page et la première de la nouvelle soient identiques : un aplat.
// Le retour en fondu, lui, est en CSS côté Webstudio (le mot est déjà dans le
// HTML servi : le masquer en JS le ferait clignoter à la première image, avant
// que le bundle n'ait tourné).
const FONDU_MARQUE = 0.35

function animateTransition() {
  return new Promise((resolve) => {
    unlockCurtain()
    gsap.set('.transition', { visibility: 'visible', translateY: '-100vh' })
    const tl = gsap.timeline({ onComplete: resolve })
    tl.fromTo(
      '.transition',
      { translateY: '-100vh' },
      {
        translateY: 0,
        duration: 1,
        stagger: DECALAGE_VOLETS,
        ease: 'expo.out',
      },
      0
    )
    // Calé sur la FIN du timeline (`>-0.35`), pas sur un instant absolu : la
    // durée totale dépend du nombre de volets via le stagger, et le fondu doit
    // se terminer pile quand la navigation part.
    tl.to(
      '.transition_center',
      { opacity: 0, duration: FONDU_MARQUE, ease: 'power1.in' },
      `>-${FONDU_MARQUE}`
    )
  })
}

// NAVIGATION SPA — on laisse Remix faire son travail au lieu de le contourner.
//
// L'ancienne version interceptait le clic puis faisait `window.location.href`,
// un rechargement complet, UNIQUEMENT pour pouvoir rejouer l'intro. Tout ce
// qu'on a passé des jours à colmater venait de là : le trou blanc entre deux
// documents, la course avec l'hydratation qui recréait les volets en pleine
// animation, la fenêtre morte où les clics n'étaient pas encore interceptés, le
// chien de garde, le verrou CSS. Sans second document, rien de tout ça n'existe.
//
// Comment on rend la main à Remix : on ne peut pas « ne pas intercepter », il
// faut d'abord jouer le rideau. On rejoue donc le clic sur le lien une fois le
// rideau posé, avec un drapeau qui fait passer notre propre écouteur au travers.
// Remix le reçoit alors normalement et fait sa navigation client-side.
//
// Séquencement mesuré sur le site : après le renvoi du clic, l'URL change en
// ~15ms et le contenu de la route suit ~6ms plus tard (data-page à jour, volets
// remplacés par des nœuds neufs). D'où l'attente sur `location.pathname` puis
// deux frames pour laisser le rendu se poser.
let renvoiEnCours = false

// Filet : si Remix ne prend pas la main (lien hors de son routeur, erreur de
// chargement), on retombe sur une navigation dure plutôt que de laisser le
// visiteur devant un rideau qui ne se lèvera jamais.
const DELAI_ROUTE_MS = 3000

function naviguerSPA(link, url) {
  return new Promise((resolve, reject) => {
    renvoiEnCours = true
    link.click()
    renvoiEnCours = false

    const debut = performance.now()
    ;(function attend() {
      if (window.location.pathname === url.pathname) {
        // Deux frames : la première laisse React committer, la seconde laisse le
        // layout se poser avant que les inits ne prennent leurs mesures.
        requestAnimationFrame(() => requestAnimationFrame(resolve))
        return
      }
      if (performance.now() - debut > DELAI_ROUTE_MS) {
        reject(new Error('navigation SPA sans effet'))
        return
      }
      requestAnimationFrame(attend)
    })()
  })
}

// Le menu plein écran est un Dialog Radix. Avec un rechargement complet il
// disparaissait avec le document ; en SPA il resterait monté PAR-DESSUS la
// nouvelle page. On demande donc sa fermeture — Radix écoute Échap sur le
// document — pendant que le rideau couvre l'écran, donc sans que ça se voie.
function fermeMenuSiOuvert() {
  if (!document.querySelector('.w-dialog-content')) return
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  )
}

// Interception des clics sur les liens internes, PAR DÉLÉGATION en phase
// capture. Deux raisons cruciales :
//  1) La délégation capte AUSSI les liens montés après l'init (ex. les liens du
//     menu Radix, ajoutés au DOM à l'ouverture) — un `forEach` sur les <a> à
//     l'init les ratait.
//  2) La capture nous met AVANT les gestionnaires de Remix : on peut donc jouer
//     le rideau d'abord, et ne rendre la main qu'ensuite.
function onLinkClick(e) {
  // Clic qu'on se renvoie à nous-mêmes pour rendre la main à Remix : on le
  // laisse filer sans rien faire, sinon on boucle.
  if (renvoiEnCours) return

  // Laisse passer : clics modifiés (nouvel onglet), clic droit/milieu.
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  )
    return

  const link = e.target.closest('a')
  if (!link) return
  const href = link.getAttribute('href')
  if (!href) return
  // Ignore : ancres, mailto/tel, nouvel onglet, téléchargement.
  if (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    link.target === '_blank' ||
    link.hasAttribute('download')
  )
    return

  const url = new URL(href, window.location.href)
  if (url.origin !== window.location.origin) return // lien externe
  if (url.pathname === window.location.pathname) return // même page

  // Pas de volets dans le DOM → rien à animer. On laisse le lien agir
  // normalement plutôt que d'imposer 1,5s d'attente sur un rideau inexistant.
  if (!document.querySelector('.transition')) return

  // Lien interne → rideau, puis navigation SPA, puis relance de la page.
  e.preventDefault()
  e.stopImmediatePropagation()

  animateTransition()
    .then(() => {
      fermeMenuSiOuvert()
      return naviguerSPA(link, url)
    })
    .then(() => {
      // Le document ne change pas : c'est à nous de remettre la page à zéro.
      // Dans cet ordre, et pendant que le rideau couvre encore l'écran :
      //  1. le scroll, sinon on arrive au milieu de la nouvelle page ;
      //  2. le démontage, sinon les ScrollTrigger de la route précédente
      //     s'empilent (le pin du footer se dupliquerait) ;
      //  3. l'init de la nouvelle page, qui prend ses mesures sur un layout posé.
      noteChemin()
      window.scrollTo(0, 0)
      nettoieRoute()
      lancePageCourante()
      // Même animation qu'au premier chargement : les volets de la nouvelle
      // route arrivent neufs, donc à translateY(0) — déjà couvrants, sans
      // rupture visible avec ceux qu'on vient d'animer.
      return joueIntro()
    })
    .catch((erreur) => {
      // Remix n'a pas pris la main : on ne laisse pas le visiteur sous un
      // rideau figé, on navigue en dur comme avant.
      console.warn('[transition] repli sur navigation dure:', erreur.message)
      window.location.href = url.href
    })
}

// Renvoie une Promise résolue quand le rideau a fini de se lever — le moment où
// la page devient réellement visible. Tout ce qui dépend de pixels réellement
// peints doit attendre ce signal : tant que le rideau couvre l'écran, Chrome ne
// rastérise pas ce qu'il masque.
// L'ÉCOUTEUR EST BRANCHÉ DÈS LE CHARGEMENT DU BUNDLE, hors de `onReady`.
//
// Il l'était auparavant dans `initPageTransition`, donc seulement une fois le
// DOM stabilisé : 150ms de silence, et jusqu'à 3s si la page continue de muter.
// Entre le premier paint et ce moment-là, AUCUN clic n'était intercepté. Remix
// faisait alors sa navigation client-side, et comme le verrou `display:none`
// posé par l'intro précédente survit (même document, pas de rechargement), le
// rideau ne s'affichait pas non plus : la page suivante apparaissait d'un coup,
// sans transition. Symptôme intermittent, puisqu'il dépend de la vitesse à
// laquelle le visiteur clique.
//
// L'écouteur ne dépend de rien : il fonctionne par délégation et vérifie
// lui-même la présence des volets. Rien ne justifie de le faire attendre.
// Le script est en `defer`, donc `document` existe forcément ici.
// RETOUR ARRIÈRE / SUIVANT — le bouton « précédent » du navigateur déclenche une
// navigation Remix que nous ne voyons PAS : notre écouteur ne capte que les
// clics. Sans ce traitement, la nouvelle route s'afficherait sans que son init
// ne tourne (footer, reveal, nuage…), et les ScrollTrigger de la précédente
// resteraient en place et s'empileraient.
//
// Le problème n'existait pas avec le rechargement complet : le navigateur
// repartait de zéro. Il apparaît AVEC la navigation SPA, c'est donc une dette
// que celle-ci crée et qu'elle doit payer.
//
// Pas de rideau ici : on ne peut pas l'abaisser avant, l'événement arrive une
// fois la décision prise. On se contente de remettre la page d'aplomb.
let cheminCourant = window.location.pathname

function noteChemin() {
  cheminCourant = window.location.pathname
}

window.addEventListener('popstate', () => {
  // Remix rend la nouvelle route juste après l'événement (mesuré : ~6ms après
  // le changement d'URL). Deux frames suffisent, précédées d'un court délai
  // pour absorber un rendu plus lent sans imposer d'attente perceptible.
  setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (window.location.pathname === cheminCourant) return
        noteChemin()
        nettoieRoute()
        lancePageCourante()
      })
    })
  }, 100)
})

document.addEventListener('click', onLinkClick, true)

// Dès le chargement du bundle, sans attendre `onReady` : plus tôt <html> reprend
// la couleur de la page, plus courte est la fenêtre où la bande du bas est
// sombre. Le script est en `defer`, donc `document.body` existe forcément ici.
aligneFondDocument()

export default function initPageTransition() {
  // Idempotence : `init` peut rejouer (ré-hydratation, navigation SPA). Sans ce
  // retrait, l'écouteur s'empilerait et `animateTransition` partirait plusieurs
  // fois pour un seul clic.
  document.removeEventListener('click', onLinkClick, true)
  document.addEventListener('click', onLinkClick, true)

  if (document.querySelector('.transition')) return joueIntro()

  // VOLETS ABSENTS À L'INIT — ne surtout pas renoncer.
  //
  // La porte d'attente de webstudio-utils peut s'ouvrir pendant une accalmie du
  // DOM, AVANT que Remix ait fini de rendre la page. Les volets arrivent alors
  // après nous. L'ancienne version retournait ici, et plus rien ne relançait
  // jamais l'intro : le rideau restait figé en position couvrante, écran plein,
  // page inutilisable.
  //
  // Reproduit en naviguant PAR LE MENU vers /projets/all : `init` avait bien
  // tourné mais le z-index inline n'était jamais posé — la signature d'un
  // abandon à cette ligne précise. On attend donc leur apparition.
  return new Promise((resolve) => {
    const abandon = setTimeout(() => {
      observer.disconnect()
      resolve()
    }, 5000)
    const observer = new MutationObserver(() => {
      if (!document.querySelector('.transition')) return
      clearTimeout(abandon)
      observer.disconnect()
      joueIntro().then(resolve)
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  })
}

function joueIntro() {
  // Rejoué ici en plus du niveau module : l'hydratation Remix peut poser la
  // couleur de fond du body après notre premier passage.
  aligneFondDocument()

  // Le rideau DOIT passer au-dessus de tout (navbar, #cloud, images…). La
  // valeur de référence est désormais dans styles/style.css (z-index:9999) —
  // elle s'applique dès l'injection du CSS, sans attendre ce JS. Ce
  // setProperty ne reste qu'en filet de sécurité si une règle Webstudio
  // publiée plus tard venait à reprendre la main.
  document
    .querySelector('.transition_div')
    ?.style.setProperty('z-index', '9999', 'important')

  surveilleRideau()

  // Animation d'intro (le rideau se lève).
  //
  // `opacity: 0.999` — imperceptible à l'œil. Hypothèse : Chrome ne rastérise
  // pas ce qui est intégralement recouvert par un calque OPAQUE (occlusion
  // culling), et une opacité < 1 sort le rideau de cette catégorie.
  //
  // ATTENTION — utilité NON DÉMONTRÉE, à ne pas présenter comme acquise. Le
  // symptôme (seules 3 des 7 vignettes du hero peintes sous Chrome) a en
  // réalité disparu quand le styling des images a été retiré côté Webstudio :
  // leur `min-width: 35vw` les faisait déborder de 467px de chaque côté d'une
  // fenêtre de 91px, soit sept calques de 1024px de large qui se chevauchaient.
  // Une fois l'image ramenée à la taille de son conteneur, plus de bug — la
  // vraie cause était là, pas ici.
  //
  // Cette ligne est donc conservée à titre de garde-fou peu coûteux, mais si
  // elle gêne un jour, la retirer et vérifier sur quelques rechargements que
  // les 7 vignettes tiennent : c'est le test qui tranchera.
  unlockCurtain()
  gsap.set('.transition', {
    visibility: 'visible',
    translateY: 0,
    opacity: 0.999,
  })
  return revealTransition().then(() => {
    gsap.set('.transition', { visibility: 'hidden' })
    lockCurtainHidden() // survit à l'hydratation Remix (voir plus haut)
  })
}
