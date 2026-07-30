// page-transition.js — animation de transition entre pages (rideau `.transition`).
// Mutualisé : ce bloc était copié à l'identique dans home / project / projects / contact.
import { ScrollTrigger, gsap } from '../lib/gsap.js'
import lancePageCourante from '../routes.js'
import nettoieRoute from './teardown.js'

// Webstudio sert ses URLs avec un slash final (`/about/`), mais un href écrit à
// la main dans le builder peut ne pas en avoir (`/about`). Toute comparaison de
// chemin doit donc passer par ici, sinon on attend une égalité qui n'arrivera
// jamais : la boucle d'attente de `naviguerSPA` tournerait jusqu'à son délai de
// 3s, rideau baissé, puis retomberait sur une navigation dure.
function normalisePath(p) {
  return p.replace(/\/+$/, '') || '/'
}

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
//
// INTERRUPTIBLE. L'écouteur de clic est branché dès le chargement du bundle,
// donc BIEN AVANT la fin de l'intro : celle-ci dure ~2,2s et peut elle-même
// démarrer jusqu'à 3s après le DOM (`MAX_WAIT_MS` de webstudio-utils). Un clic
// dans cette fenêtre de ~5s lançait `animateTransition()` sur LES MÊMES nœuds
// `.transition`, sans `overwrite` : deux timelines tiraient le rideau en sens
// contraire. Pire, à sa fin l'intro posait `visibility:hidden` + le verrou
// `display:none` — elle effaçait le rideau de la navigation SORTANTE, et on
// voyait la page changer à nu. `stopIntro` permet au clic de reprendre la main
// proprement : on tue le timeline et on signale l'interruption pour que le
// `.then()` de joueIntro ne touche à rien.
let stopIntro = null

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

    // `stopIntro === annule` avant de remettre à null : si une intro plus
    // récente a déjà pris la place, celle-ci ne doit pas effacer son annuleur en
    // se terminant — on laisserait la nouvelle sans moyen d'être interrompue.
    function termine() {
      if (stopIntro === annule) stopIntro = null
      observer.disconnect()
      resolve(true)
    }

    // `tl` est réaffecté par l'observer quand Remix remplace les volets ; la
    // fermeture lit donc bien le timeline COURANT, pas celui du départ.
    const annule = () => {
      if (stopIntro === annule) stopIntro = null
      observer.disconnect()
      tl.kill()
      resolve(false) // interrompue : le rideau appartient au clic, pas à nous
    }

    stopIntro = annule
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
  // Appelée au niveau module (voir tout en bas) : si le <script> venait un jour
  // à être posé dans le <head> sans `defer` côté Webstudio, `document.body`
  // serait null et le TypeError tuerait l'évaluation du module — donc TOUT le
  // bundle, silencieusement. Une ligne pour ne pas dépendre d'un réglage du
  // builder qu'on ne contrôle pas.
  if (!document.body) return
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
//
// ⚠️ IL DOIT ÊTRE ANNULABLE, et ça n'a rien de cosmétique. Son test de sortie
// est « le verrou CSS existe » ; or `animateTransition()` appelle
// `unlockCurtain()`, qui RETIRE ce verrou pour pouvoir rejouer le rideau. Un
// chien de garde armé par l'intro et jamais désarmé se réveillait donc au beau
// milieu d'une navigation VOLONTAIRE : il voyait « pas de verrou + rideau
// couvrant », concluait au blocage, et exécutait son déblocage forcé —
// `visibility:hidden` + verrou — pendant que le rideau descendait. Le rideau
// s'évaporait, on voyait l'ancienne page, puis il revenait.
//
// La fenêtre de déclenchement (~T+4,5s à T+6s après un chargement) correspond
// exactement à la cadence de lecture d'un visiteur avant son premier clic :
// c'était intermittent, mais loin d'être rare.
const WATCHDOG_MS = 6000

let watchdogId

// Appelée dès qu'une transition VOULUE commence : à partir de là, un rideau
// couvrant est l'état normal, plus un symptôme.
function annuleSurveillance() {
  clearTimeout(watchdogId)
}

function surveilleRideau() {
  clearTimeout(watchdogId)
  watchdogId = setTimeout(() => {
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
    // Une transition VOULUE commence : le rideau va être couvrant, et c'est
    // normal. Le chien de garde armé par l'intro précédente doit se taire,
    // sinon il « débloquerait » un rideau qui n'est pas bloqué (voir plus haut).
    annuleSurveillance()
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
// ATTENTE DU RENDU DE LA ROUTE — on attend que le DOM se taise, pas un délai.
//
// Le changement d'URL précède le rendu de React. Mesuré à ~6ms sur une machine
// rapide en navigation par clic, mais bien plus lent au retour arrière : avec un
// délai fixe de 100ms, `lancePageCourante()` partait avant que `.cols_footer`
// n'existe, l'init du footer sortait sans rien faire, et la page se retrouvait
// SANS animation de footer (aucun pin créé — constaté : pinSpacers à 0 sur la
// home après un retour). Une valeur devinée est précisément ce qu'on a passé
// cette session à retirer du code.
// ATTENDRE QUE LE RENDU AIT COMMENCÉ, PAS SEULEMENT QUE LE DOM SE TAISE.
//
// La version précédente armait son compte à rebours de silence IMMÉDIATEMENT.
// Or entre `pushState` et le rendu de React Router, le DOM ne bouge PAS DU
// TOUT : le routeur doit d'abord aller chercher le module et les données de la
// route. Ce silence-là n'est pas celui d'un rendu fini, c'est celui d'un rendu
// qui n'a pas commencé — et on résolvait dessus, 120ms après le clic.
//
// La suite se déroulait alors sur la page qu'on QUITTE : `nettoieRoute()` puis
// `lancePageCourante()` s'exécutaient sur l'ancien DOM, et React remplaçait tout
// juste après. Chaque écouteur, chaque ScrollTrigger et chaque tween qu'on
// venait de créer pointait sur des nœuds jetés → page correcte à l'écran, mais
// entièrement inerte : pas de fondu d'apparition, pas de survol, footer plat.
//
// Mesuré en prod (Slow 3G, /categories → /category/wood par un tag du nuage) :
// URL changée à 1513ms, rendu de la route à 3827ms. Soit 2,3s pendant
// lesquelles on croyait la page prête. Le défaut dépend donc du cache : route
// déjà en mémoire → rendu en quelques ms, on passe dans la fenêtre par chance ;
// cache vide → on la rate. D'où le « ça remarche après un rechargement ».
//
// Il touche surtout les liens FABRIQUÉS EN JS (tags du nuage), parce qu'eux
// passent par `pushState` + `popstate` : rien ne mute d'ici le rendu. Les liens
// de Remix (`data-discover`) mutent le DOM plus tôt et masquaient le problème.
//
// LA SENTINELLE. On retient un nœud de la route qu'on quitte — un volet du
// rideau — et on attend qu'il quitte le document : React les remplace par des
// nœuds neufs en rendant la nouvelle route. Vérifié en prod sur les deux cas
// qui comptent :
//   /categories → /category/wood  : volet détaché à 1615ms, avec data-page
//   /category/wood → /category/metal : volet détaché à 2219ms, data-page
//     INCHANGÉ ("category" des deux côtés) et 5 projets → 3.
// Ce second cas est la raison de ne pas se contenter de `data-page` : entre deux
// routes du même gabarit, il ne change jamais.
const SILENCE_ROUTE_MS = 120
// Plafond du SILENCE, une fois le rendu commencé.
const ATTENTE_ROUTE_MAX_MS = 1500
// Plafond de l'attente DU RENDU lui-même. Généreux : c'est du réseau, et le
// rideau couvre l'écran pendant ce temps — l'attente se lit comme un
// chargement, pas comme un blocage. Il ne sert que si React ne rend jamais.
const ATTENTE_RENDU_MAX_MS = 6000

function attendRenduRoute() {
  return new Promise((resolve) => {
    const sentinelle = document.querySelector('.transition_div')
    // Le rendu a-t-il commencé ? Tant que non, les mutations observées sont
    // celles de la route qu'on quitte : elles ne doivent pas armer le silence.
    let rendu = false
    let minuteur
    let plafondSilence
    const observer = new MutationObserver(surMutation)

    function fini() {
      clearTimeout(minuteur)
      clearTimeout(plafondRendu)
      clearTimeout(plafondSilence)
      observer.disconnect()
      // Une frame de plus : le layout doit être posé quand ScrollTrigger prend
      // ses mesures, sinon les start/end se calculent sur une page en cours.
      requestAnimationFrame(resolve)
    }

    function surMutation() {
      if (!rendu) {
        if (sentinelle && document.contains(sentinelle)) return
        rendu = true
        clearTimeout(plafondRendu)
        // Filet : une page qui mute en continu ne doit pas bloquer la reprise.
        plafondSilence = setTimeout(fini, ATTENTE_ROUTE_MAX_MS)
      }
      clearTimeout(minuteur)
      minuteur = setTimeout(fini, SILENCE_ROUTE_MS)
    }

    const plafondRendu = setTimeout(fini, ATTENTE_RENDU_MAX_MS)
    observer.observe(document.body, { childList: true, subtree: true })
    // PAS d'amorce ici, contrairement à avant : sans mutation, il n'y a rien à
    // reprendre. Sans volet en revanche (`sentinelle` nulle), on retombe sur la
    // première mutation venue — c'est le mieux qu'on puisse faire.
  })
}

let renvoiEnCours = false

// Filet : si Remix ne prend pas la main (lien hors de son routeur, erreur de
// chargement), on retombe sur une navigation dure plutôt que de laisser le
// visiteur devant un rideau qui ne se lèvera jamais.
const DELAI_ROUTE_MS = 3000

function naviguerSPA(link, url) {
  return new Promise((resolve, reject) => {
    // REMIX NE POSSÈDE QUE SES PROPRES LIENS. Ceux qu'il rend portent
    // `data-discover` et un gestionnaire React : leur renvoyer le clic suffit,
    // il fait la navigation client-side.
    //
    // Les liens FABRIQUÉS EN JS n'en ont pas. Les 25 tags du nuage sortent d'un
    // `document.createElement('a')` dans tag-cloud-magnetic.js : aucun
    // gestionnaire React dessus. Un `link.click()` y déclenche une navigation
    // DURE — mesuré sur /categories/, le contexte d'exécution est détruit et le
    // document remplacé, donc le rideau qu'on vient de poser saute avec lui.
    // C'est exactement le trou blanc entre deux documents que le passage en SPA
    // avait supprimé partout ailleurs.
    //
    // Pour ceux-là, on passe par l'History API : React Router écoute `popstate`
    // et rend la nouvelle route dans le MÊME document. Vérifié en prod sur
    // /categories/ → /category/wood : `data-page` passe de "categories" à
    // "category" et le contexte survit.
    if (link.hasAttribute('data-discover')) {
      renvoiEnCours = true
      link.click()
      renvoiEnCours = false
    } else {
      history.pushState({}, '', url.href)
      // `noteChemin()` AVANT d'émettre l'événement, et ce n'est pas cosmétique :
      // notre propre écouteur `popstate` (plus bas) sert à rattraper les retours
      // arrière du navigateur, et il relancerait ici `nettoieRoute()` +
      // `lancePageCourante()` EN DOUBLE avec la chaîne du clic — deux jeux de
      // ScrollTrigger, deux constructions du nuage. En alignant `cheminCourant`
      // sur la nouvelle URL d'abord, son test `pathname === cheminCourant` sort
      // aussitôt : React Router reçoit l'événement, nous l'ignorons.
      noteChemin()
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
    }

    // Comparaison NORMALISÉE : Webstudio sert `/about/` mais un href saisi à la
    // main dans le builder peut valoir `/about`. L'égalité brute n'arrivait
    // alors jamais — on tournait 3s rideau baissé, puis on repliait sur une
    // navigation dure, avec le trou blanc que tout ceci sert à éviter.
    const cible = normalisePath(url.pathname)
    const debut = performance.now()
    ;(function attend() {
      if (normalisePath(window.location.pathname) === cible) {
        attendRenduRoute().then(resolve)
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

  // Une transition est déjà en route (double-clic, ou clic sur un second lien
  // pendant que le rideau descend). On avale le clic : lancer une deuxième
  // chaîne poserait deux rideaux, deux `naviguerSPA` concurrents et deux
  // `lancePageCourante()` sur la même page. On ne laisse surtout pas filer le
  // clic non plus — ce serait une navigation dure par-dessus la nôtre.
  if (navigationEnCours) {
    e.preventDefault()
    e.stopImmediatePropagation()
    return
  }

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
  // Même page — normalisé, sinon `/about` et `/about/` sont vus comme deux
  // routes différentes et on jouerait une transition pour rester sur place.
  if (normalisePath(url.pathname) === normalisePath(window.location.pathname))
    return

  // Pas de volets dans le DOM → rien à animer. On laisse le lien agir
  // normalement plutôt que d'imposer 1,5s d'attente sur un rideau inexistant.
  if (!document.querySelector('.transition')) return

  // Lien interne → rideau, puis navigation SPA, puis relance de la page.
  e.preventDefault()
  e.stopImmediatePropagation()

  // L'intro tourne peut-être encore : elle anime LES MÊMES volets. On lui prend
  // la main avant d'ouvrir la nôtre (voir le commentaire de `revealTransition`).
  stopIntro?.()
  navigationEnCours = true

  animateTransition()
    .then(() => {
      fermeMenuSiOuvert()
      return naviguerSPA(link, url)
    })
    // LE REPLI NE COUVRE QUE LA NAVIGATION, pas la reprise qui suit.
    //
    // Ce `.catch` était placé en fin de chaîne : il rattrapait donc aussi les
    // exceptions de `nettoieRoute()`, `aligneFondDocument()` et consorts. Une
    // simple erreur d'init déclenchait alors `window.location.href = …`, soit un
    // rechargement complet du document — exactement ce que le passage en SPA a
    // supprimé. Ici il ne répond plus qu'à une seule question : Remix a-t-il
    // pris la main ? On relance l'erreur pour ne pas enchaîner sur la reprise
    // d'une route qu'on est en train de quitter en dur.
    .catch((erreur) => {
      console.warn('[transition] repli sur navigation dure:', erreur.message)
      navigationEnCours = false
      window.location.href = url.href
      // Marquée pour que le `.catch` final ne la re-journalise pas : elle est
      // déjà traitée, et la reprise de route ne doit surtout pas s'exécuter sur
      // une page qu'on est en train de quitter en dur.
      erreur.dejaTraite = true
      throw erreur
    })
    .then(() => {
      // Le document ne change pas : c'est à nous de remettre la page à zéro.
      // Le scroll d'abord, sinon on arrive au milieu de la nouvelle page ; le
      // reste est mutualisé avec le retour arrière (voir `repriseDeRoute`).
      window.scrollTo(0, 0)
      repriseDeRoute()
      // Rendue AVANT `joueIntro()` : l'intro qui suit doit rester interruptible,
      // sinon un visiteur pressé se retrouve à devoir attendre 2s avant que son
      // clic suivant ne soit pris en compte.
      navigationEnCours = false
      // Même animation qu'au premier chargement : les volets de la nouvelle
      // route arrivent neufs, donc à translateY(0) — déjà couvrants, sans
      // rupture visible avec ceux qu'on vient d'animer.
      return joueIntro()
    })
    // Filet terminal : une exception dans la REPRISE (aligneFondDocument,
    // rafraichitApresImages, joueIntro…) ne doit ni remonter en promesse non
    // rattrapée, ni laisser `navigationEnCours` levé — le visiteur ne pourrait
    // plus cliquer sur aucun lien du reste de sa visite.
    .catch((erreur) => {
      if (erreur?.dejaTraite) return
      console.error('[transition] reprise de route en échec:', erreur)
      navigationEnCours = false
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
let cheminCourant = normalisePath(window.location.pathname)

// Une transition est en cours : `onLinkClick` avale les clics suivants plutôt
// que d'ouvrir une seconde chaîne concurrente.
let navigationEnCours = false

function noteChemin() {
  cheminCourant = normalisePath(window.location.pathname)
}

// RAFRAÎCHISSEMENT APRÈS DÉCODAGE DES IMAGES — la dette la moins visible de la
// navigation SPA.
//
// `attendRenduRoute()` attend que le DOM se taise. Mais le décodage d'une image
// NE MUTE PAS LE DOM : le silence de 120ms s'ouvre donc pendant que les images
// sont encore vides. La page grandit ensuite de plusieurs milliers de pixels, et
// tous les start/end que ScrollTrigger vient de calculer sont périmés — d'où un
// footer qui part au mauvais moment et des `.item_container` dont le trigger est
// placé hors de la page, donc qui ne se révèlent jamais.
//
// En chargement direct le problème n'existe pas : ScrollTrigger se rafraîchit
// tout seul sur l'événement `load` du document. EN SPA IL N'Y A PAS DE `load`.
// C'est précisément pour ça que le défaut ne se reproduit jamais en F5, et
// seulement en navigation par clic.
function rafraichitApresImages() {
  const chemin = normalisePath(window.location.pathname)
  const enAttente = [...document.images].filter((img) => !img.complete)

  // `decode()` se règle aussi sur une image cassée (il rejette) : `allSettled`
  // nous évite qu'un seul 404 emporte tout le rafraîchissement.
  const pret = enAttente.length
    ? Promise.allSettled(
        enAttente.map((img) =>
          img.decode ? img.decode() : Promise.resolve(null)
        )
      )
    : Promise.resolve(null)

  pret.then(() => {
    // Le visiteur a pu repartir ailleurs entre-temps : rafraîchir maintenant
    // recalculerait sur une route qui n'est plus la nôtre.
    if (normalisePath(window.location.pathname) !== chemin) return
    ScrollTrigger.refresh()
  })
}

// REPRISE D'UNE ROUTE — commun au clic et au retour arrière.
//
// Les deux chemins faisaient la même chose dans un ordre différent
// (`aligneFondDocument()` avant l'init d'un côté, après de l'autre), et celui du
// popstate n'avait aucune protection : une exception dans `nettoieRoute()`
// empêchait `lancePageCourante()` de tourner, donc la nouvelle page s'affichait
// sans footer, sans reveal et sans nuage.
function repriseDeRoute() {
  noteChemin()
  // Le démontage AVANT l'init, sinon les ScrollTrigger de la route précédente
  // s'empilent (le pin du footer se dupliquerait).
  try {
    nettoieRoute()
  } catch (error) {
    console.error('[transition] nettoyage de route en échec:', error)
  }
  aligneFondDocument()
  lancePageCourante() // isole déjà chaque init, voir routes.js:lance()
  rafraichitApresImages()
}

window.addEventListener('popstate', () => {
  // Remix rend la nouvelle route juste après l'événement (mesuré : ~6ms après
  // le changement d'URL). Deux frames suffisent, précédées d'un court délai
  // pour absorber un rendu plus lent sans imposer d'attente perceptible.
  if (normalisePath(window.location.pathname) === cheminCourant) return
  noteChemin()
  // Pas de `window.scrollTo(0, 0)` ici, contrairement au clic : sur un retour
  // arrière, le navigateur restaure la position précédente et c'est ce que le
  // visiteur attend.
  attendRenduRoute().then(repriseDeRoute)
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
  // Une intro précédente qui ne serait jamais arrivée à son terme (volets jamais
  // remplacés, timeline restée en suspens) garderait son MutationObserver
  // branché sur tout le sous-arbre de <body>. On la termine avant d'en ouvrir
  // une nouvelle : sans cela, ils s'accumuleraient de navigation en navigation.
  stopIntro?.()

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

  // Le chien de garde s'arme APRÈS `unlockCurtain()`, jamais avant : l'unlock
  // retire le verrou CSS qui sert justement de preuve « l'intro a eu lieu », et
  // l'armement doit donc lui succéder. Dans l'autre ordre on désarmait le garde
  // dans la foulée de son armement, et le filet ne servait plus à rien.
  surveilleRideau()

  gsap.set('.transition', {
    visibility: 'visible',
    translateY: 0,
    opacity: 0.999,
  })
  return revealTransition().then((estAlleAuBout) => {
    // Interrompue par un clic : le rideau est repassé sous la responsabilité de
    // la transition sortante, qui est en train de le faire DESCENDRE. Le cacher
    // ici — et pire, poser le verrou `display:none` — l'effacerait en pleine
    // navigation. C'était le rideau qui « saute » puis revient.
    if (!estAlleAuBout) return
    gsap.set('.transition', { visibility: 'hidden' })
    lockCurtainHidden() // survit à l'hydratation Remix (voir plus haut)
  })
}
