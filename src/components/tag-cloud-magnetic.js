// tag-cloud-magnetic.js — nuage de tags organique branché sur Hygraph.
// 1. Fetch des catégories (title + slug + nb de projets).
// 2. Génération automatique des `.tag` dans `#nuage` : poids (data-w) puis
//    placement en spirale d'or (--x/--y), et lien vers /categories/[slug].
// 3. Animation : flottement continu + magnétisme au survol (GSAP).
// Respecte prefers-reduced-motion et le mode compact (mobile / sans hover).
//
// COMPOSITION AU NOMBRE D'OR — pourquoi la grille a été abandonnée.
// L'ancien placement tirait une grille de `ceil(sqrt(n * 1.7))` colonnes et
// jitterait chaque mot dans sa cellule. Mesuré sur /categories/ avec 25 mots :
// 7 colonnes × 4 rangées = 28 cellules, donc TROIS trous béants tirés au sort,
// et des `--y` qui se rangeaient malgré tout en quatre bandes (≈21%, 40%, 59%,
// 76%) parce que le jitter vertical (±7,9%) était plus petit que le pas de la
// grille. L'œil lisait donc des rangées, mais l'horizontal restait aléatoire :
// ni grille assumée, ni nuage — d'où l'impression d'éparpillement. Les mots ne
// couvraient que 10,4% du cadre, et les trois plus gros étaient tombés par
// hasard dans la même bande basse, sans hiérarchie pour ancrer le regard.
//
// Trois leviers, tous dérivés de φ, remplacent ça (voir `placeTags`) :
//   1. La SPIRALE (angle d'or) supprime rangées et trous.
//   2. Le RAYON PROPORTIONNEL À L'AIRE donne à chaque mot la place que son
//      encombrement réclame → densité d'encre constante partout.
//   3. L'ELLIPSE D'OR cadre l'ensemble, gros au centre, petits en périphérie.
import { gsap } from '../lib/gsap.js'
import { fetchCategories } from '../lib/hygraph.js'

// Base d'URL d'une page catégorie, PAR LANGUE. Le slug (ex. "wood") est
// partagé FR/EN ; seul le segment de chemin change selon la langue de la page.
//   EN → /category/wood     FR → /categorie/wood
const CATEGORY_BASE_BY_LANG = { en: '/category', fr: '/categorie' }

// Langue courante lue sur <html lang="…"> (posée par Webstudio selon la locale).
// Si un jour le routing FR utilise un préfixe (ex. /fr/…), il suffira d'ajuster ici.
function categoryBase() {
  const lang = (document.documentElement.lang || 'en').toLowerCase()
  return lang.startsWith('fr')
    ? CATEGORY_BASE_BY_LANG.fr
    : CATEGORY_BASE_BY_LANG.en
}

export default function initTagCloudMagnetic() {
  // #nuage est parfois rendu APRÈS l'exécution de home() : Webstudio hydrate le
  // DOM côté React, et au moment de l'init `getElementById('nuage')` peut encore
  // être null. L'ancienne version abandonnait alors sans rien faire (nuage vide
  // en prod, selon le timing de chargement). On observe donc son apparition et
  // on construit dès qu'il est là — comme la résilience du slider mobile.
  let done = false
  let categoriesPromise = null
  const ensureCategories = () => {
    if (!categoriesPromise) categoriesPromise = fetchCategories()
    return categoriesPromise
  }

  async function tryBuild() {
    if (done) return
    const nuage = document.getElementById('nuage')
    if (!nuage || nuage.querySelector('.tag')) return // absent, ou déjà peuplé
    try {
      const categories = await ensureCategories()
      // un appel concurrent (mutations rapprochées) a pu construire entre-temps
      if (done || nuage.querySelector('.tag')) return
      if (!categories.length) return
      buildTags(nuage, categories)
      done = true
      observer.disconnect()
      // Le placement se déduit de la LARGEUR MESURÉE de chaque mot : mesurer
      // avant que Rakkas ne soit appliquée donnerait les largeurs de la fonte
      // de secours, donc une composition fausse. On attend la fonte, avec un
      // garde-fou : un CDN muet ne doit pas retenir le nuage indéfiniment.
      await Promise.race([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        new Promise((r) => setTimeout(r, 1200)),
      ])
      placeTags(nuage, [...nuage.querySelectorAll('.tag')])
      animate(nuage)
    } catch (err) {
      console.warn('[nuage] fetch Hygraph échoué, fallback DOM :', err.message)
    }
  }

  const observer = new MutationObserver(tryBuild)
  observer.observe(document.body, { childList: true, subtree: true })

  tryBuild() // cas où #nuage est déjà présent
}

/* ====================================================================
   GÉNÉRATION DES TAGS
   ==================================================================== */

// LE NOMBRE D'OR ET SON ANGLE.
// φ est le plus irrationnel des nombres : c'est celui qu'aucune fraction
// n'approche bien. L'angle d'or, 2π/φ² = 137,507°, hérite de cette propriété —
// en tournant de cet angle à chaque mot, on ne retombe JAMAIS sur une direction
// déjà servie. Aucune rangée ne se forme, aucune direction n'est privilégiée,
// et l'espace se remplit à densité constante. C'est la loi de rangement des
// graines de tournesol, et c'est exactement ce qui manquait à la grille.
const PHI = (1 + Math.sqrt(5)) / 2
const ANGLE_OR = (2 * Math.PI) / (PHI * PHI)

// Réglages de composition. Ce sont les seules valeurs à toucher pour resserrer
// ou aérer le nuage.
const COMPO = {
  margeX: 0.03, // marge gauche/droite, en fraction de la largeur de #nuage
  margeY: 0.05, // marge haut/bas
  // Ratio largeur/hauteur de l'ellipse d'ensemble.
  //   PHI  → le nuage dessine lui-même un rectangle d'or, quelle que soit la
  //          forme de la section. C'est le parti pris actuel.
  //   null → l'ellipse épouse le cadre : plus dense, mais la silhouette du
  //          nuage n'est plus qu'un reflet de la hauteur de section.
  // Sur la section réelle (1499×806, soit 1,86), φ laisse ~190px de marge à
  // gauche et à droite contre ~60px en haut et en bas : c'est le prix à payer
  // pour que la composition soit d'or et non celle du viewport.
  ratio: PHI,
  phase: 0, // rotation de la spirale entière, en radians (0 → 2π)
  respiration: 8, // px minimum entre deux boîtes de mots
  relaxations: 60, // passes d'écartement après le placement en spirale
}

const estCompact = () =>
  window.matchMedia('(max-width: 820px), (hover: none)').matches

// Hash déterministe d'une chaîne → entier 32 bits (pour un placement stable
// d'un chargement à l'autre : même catégorie = même position/poids).
function hashStr(s) {
  let h = 1779033703 ^ s.length
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h ^ (h >>> 16)) >>> 0
}

// PRNG déterministe (mulberry32) : renvoie une fonction () => [0,1).
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// RÉPARTITION DES POIDS, elle aussi au nombre d'or : on veut les trois familles
// (gros, moyens, petits) dans les proportions 1 : φ : φ². La somme vaut
// 1 + φ + φ² = 2φ², donc les seuils tombent juste :
//   gros          → p < 1 / 2φ²   = 0,1910
//   gros + moyens → p < φ² / 2φ²  = 0,5
// Sur 25 catégories cela donne 5 / 7 / 13 au lieu de l'ancien 3 / 7 / 15.
// Deux gros mots de plus, c'est deux ancres de plus pour le regard et un nuage
// sensiblement plus dense — l'ancienne répartition laissait quinze mots
// minuscules flotter sans rien pour les tenir.
const SEUIL_GROS = 1 / (2 * PHI * PHI)
const SEUIL_MOYEN = 0.5

// Attribue un poids 3→5 à chaque catégorie (minimum 3 = plus de mots minuscules).
// Si des projets sont liés : rang par nombre de projets (les plus fournies
// sont les plus grosses). Sinon : distribution déterministe par slug.
function weightResolver(categories) {
  const poids = (p) => (p < SEUIL_GROS ? 5 : p < SEUIL_MOYEN ? 4 : 3)
  const max = Math.max(0, ...categories.map((c) => c.count))
  if (max > 0) {
    const ranked = [...categories].sort((a, b) => b.count - a.count)
    const weights = {}
    const n = ranked.length
    ranked.forEach((c, i) => {
      // (i + 0.5) / n plutôt que i / (n - 1) : découpe équitable des tranches,
      // sans forcer le dernier rang à p = 1 exactement.
      weights[c.slug] = poids((i + 0.5) / n)
    })
    return (c) => weights[c.slug]
  }
  // Pas encore de projets liés : on varie les tailles pour un vrai effet nuage.
  return (c) => poids(rng(hashStr(c.slug))())
}

// Crée les `.tag` SANS position : le placement a besoin de mesurer la largeur
// réelle de chaque mot une fois la fonte appliquée, ce qui suppose qu'ils
// soient déjà dans le DOM. Le nuage est donc masqué le temps de ce cycle
// mesure → placement (sinon on verrait un tas de mots empilés à l'origine).
function buildTags(nuage, categories) {
  const weightOf = weightResolver(categories)

  nuage.textContent = '' // on vide les éventuels placeholders
  nuage.style.visibility = 'hidden'
  const frag = document.createDocumentFragment()

  categories.forEach((cat) => {
    const a = document.createElement('a')
    a.className = 'tag'
    a.dataset.w = String(weightOf(cat))
    // Deux couleurs d'accent au survol (varie l'ambiance), réparties par slug
    a.dataset.cluster =
      rng(hashStr(cat.slug) ^ 0x55)() < 0.5 ? 'digital' : 'image'
    a.setAttribute('href', `${categoryBase()}/${cat.slug}`)

    const span = document.createElement('span')
    span.textContent = cat.title
    a.appendChild(span)
    frag.appendChild(a)
  })

  nuage.appendChild(frag)
}

/* ====================================================================
   PLACEMENT — spirale d'or (phyllotaxie)
   ==================================================================== */

// Écrit --x/--y sur chaque `.tag`, en pourcentages de #nuage.
//
// Trois idées, toutes tirées de φ :
//
// 1. L'ANGLE. Le mot n° i est posé à l'angle i × 137,507°. Comme cet angle est
//    incommensurable avec le tour complet, aucun mot ne se retrouve jamais
//    aligné avec un précédent : ni rangées, ni colonnes, ni rayons.
//
// 2. LE RAYON. Pas r = √(i/n), qui répartirait uniformément des POINTS, mais
//    r = √(aire cumulée / aire totale), qui répartit uniformément de l'ENCRE.
//    Un mot large consomme ainsi plus de spirale qu'un mot court, et la densité
//    reste constante du centre au bord. C'est ce qui remplace le jitter : plus
//    besoin de tirer au sort, la place de chaque mot est déduite de sa taille.
//
// 3. LE CADRE. Les mots sont triés du plus gros au plus petit, donc les gros
//    occupent le centre et l'œil a où se poser avant de dérouler la spirale.
//    L'ensemble est inscrit dans la plus grande ellipse de ratio φ tenant dans
//    la section (ici 1499×806, soit un cadre en 1,86 : c'est la hauteur qui
//    contraint, l'ellipse fait environ 1100×680).
function placeTags(nuage, tags) {
  nuage.style.visibility = ''
  // En compact le CSS repasse les tags en `position: static` dans un flex
  // centré : --x/--y n'y sont pas lus, inutile de calculer quoi que ce soit.
  if (estCompact()) return

  const W = nuage.clientWidth
  const H = nuage.clientHeight
  if (!W || !H || !tags.length) return

  // Encombrement réel : dépend du texte ET de la fonte chargée.
  const mots = tags.map((el) => {
    const b = el.getBoundingClientRect()
    return {
      el,
      hw: b.width / 2,
      hh: b.height / 2,
      aire: b.width * b.height,
      cle: el.textContent,
    }
  })

  // Du plus gros au plus petit. Départage par le texte : à aire égale, l'ordre
  // reste le même d'un chargement à l'autre.
  mots.sort((a, b) => b.aire - a.aire || (a.cle < b.cle ? -1 : 1))

  // L'ELLIPSE D'OR : la plus grande ellipse de ratio φ qui tient dans le cadre,
  // une fois retirée la place que les mots débordent autour de leur centre
  // (ils sont centrés sur --x/--y par translate(-50%, -50%)).
  const demiL = mots.reduce((s, m) => s + m.hw, 0) / mots.length
  const demiH = mots.reduce((s, m) => s + m.hh, 0) / mots.length
  let rx = W / 2 - COMPO.margeX * W - demiL
  let ry = H / 2 - COMPO.margeY * H - demiH
  if (rx <= 0 || ry <= 0) return
  const ratio = COMPO.ratio || rx / ry
  if (rx / ry > ratio)
    rx = ry * ratio // cadre trop large → la hauteur contraint
  else ry = rx / ratio // cadre trop haut → la largeur contraint

  const aireTotale = mots.reduce((s, m) => s + m.aire, 0) || 1
  let cumul = 0
  mots.forEach((m, i) => {
    // Milieu de la tranche d'aire occupée par ce mot → son rayon.
    const t = (cumul + m.aire / 2) / aireTotale
    cumul += m.aire
    const r = Math.sqrt(t)
    const angle = i * ANGLE_OR + COMPO.phase
    m.x = W / 2 + rx * r * Math.cos(angle)
    m.y = H / 2 + ry * r * Math.sin(angle)
  })

  ecarte(mots, W, H)

  for (const m of mots) {
    m.el.style.setProperty('--x', `${((m.x / W) * 100).toFixed(2)}%`)
    m.el.style.setProperty('--y', `${((m.y / H) * 100).toFixed(2)}%`)
  }
}

// Retouche fine : la spirale garantit une densité constante, pas l'absence de
// contact entre deux boîtes voisines. On écarte donc les paires qui se
// recouvrent, le long de l'axe où le recouvrement est le plus faible (c'est le
// plus court déplacement qui sépare deux rectangles). Après un placement en
// spirale il y a peu à corriger : la boucle sort d'elle-même en quelques
// passes, et la composition d'ensemble n'est pas déformée.
function ecarte(mots, W, H) {
  const pad = COMPO.respiration
  const limX = COMPO.margeX * W
  const limY = COMPO.margeY * H

  for (let it = 0; it < COMPO.relaxations; it++) {
    let bouge = false
    for (let i = 0; i < mots.length; i++) {
      for (let j = i + 1; j < mots.length; j++) {
        const a = mots[i]
        const b = mots[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const chevX = a.hw + b.hw + pad - Math.abs(dx)
        const chevY = a.hh + b.hh + pad - Math.abs(dy)
        if (chevX > 0 && chevY > 0) {
          if (chevX < chevY) {
            const p = (chevX / 2) * (dx < 0 ? -1 : 1)
            a.x -= p
            b.x += p
          } else {
            const p = (chevY / 2) * (dy < 0 ? -1 : 1)
            a.y -= p
            b.y += p
          }
          bouge = true
        }
      }
    }
    // Personne ne sort du cadre : la section est en `overflow: hidden`, un mot
    // qui dépasse serait coupé net.
    for (const m of mots) {
      m.x = Math.max(limX + m.hw, Math.min(W - limX - m.hw, m.x))
      m.y = Math.max(limY + m.hh, Math.min(H - limY - m.hh, m.y))
    }
    if (!bouge) break
  }
}

/* ====================================================================
   ANIMATION (flottement + magnétisme) — inchangée dans l'esprit,
   s'applique aux `.tag` présents dans #nuage.
   ==================================================================== */
function animate(nuage) {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  const tags = gsap.utils.toArray('#nuage .tag')
  if (!tags.length) return

  // Exécute `action` la première fois que le nuage entre dans le viewport (25%).
  function quandVisible(action) {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect()
          action()
        }
      },
      { threshold: 0.25 }
    )
    obs.observe(nuage)
  }

  function boot() {
    if (reduceMotion) return // le CSS suffit

    // Même critère que `placeTags` : les deux doivent basculer ensemble, sinon
    // on animerait un placement absolu que le CSS a remis en flux (ou l'inverse).
    if (estCompact()) {
      // Compact : simple entrée en fondu décalé à l'arrivée à l'écran
      gsap.set(tags, { autoAlpha: 0 })
      quandVisible(() => {
        gsap.to(tags, {
          autoAlpha: 1,
          y: 0,
          startAt: { y: 14 },
          duration: 0.7,
          ease: 'power2.out',
          stagger: { each: 0.03, from: 'random' },
        })
      })
    } else {
      initDesktop()
    }
  }

  function initDesktop() {
    // GSAP reprend le `translate(-50%, -50%)` du CSS : il écrase la propriété
    // `transform` entière, il faut donc lui redonner le centrage.
    gsap.set(tags, { x: 0, y: 0, xPercent: -50, yPercent: -50 })

    // Centres "au repos" (repère du nuage), recalculés au resize
    let centres = []
    function calculeCentres() {
      const w = nuage.clientWidth,
        h = nuage.clientHeight
      centres = tags.map((el) => ({
        x: (parseFloat(el.style.getPropertyValue('--x')) / 100) * w,
        y: (parseFloat(el.style.getPropertyValue('--y')) / 100) * h,
      }))
    }
    calculeCentres()
    window.addEventListener('resize', calculeCentres)

    // 1. Entrée : fondu + remontée à l'arrivée à l'écran
    gsap.set(tags, { autoAlpha: 0 })
    quandVisible(() => {
      gsap.to(tags, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        startAt: { y: 30, scale: 0.92 },
        duration: 1,
        ease: 'power3.out',
        stagger: { each: 0.045, from: 'random' },
        onComplete: initMagnetisme,
      })
    })

    // 2. Flottement continu : les petits tags dérivent plus vite et plus loin.
    //
    // Ces tweens sont INFINIS (`repeat: -1`). Auparavant ils démarraient ici,
    // tout de suite : le ticker GSAP réécrivait donc des transformations sur 50
    // éléments (25 tags + leur span) à chaque frame, EN PERMANENCE — alors que
    // #nuage est tout en bas de la page et que l'utilisateur regarde le hero.
    // Cette pression continue sur le compositeur affamait la rastérisation du
    // reste : sur la home, des vignettes du slider restaient décodées mais
    // jamais peintes, uniquement sous Chrome (Safari et Firefox ordonnancent
    // leur rastérisation autrement), et de façon aléatoire d'un chargement à
    // l'autre — la signature d'une course, pas d'un problème de poids.
    //
    // On les crée donc en pause, et un IntersectionObserver ne les fait tourner
    // que lorsque le nuage est réellement à l'écran.
    const flottements = tags.map((el) => {
      const w = parseInt(el.dataset.w, 10)
      const inner = el.querySelector('span')
      const amp = gsap.utils.mapRange(1, 5, 14, 5, w)
      const dur =
        gsap.utils.mapRange(1, 5, 2.6, 5.2, w) * gsap.utils.random(0.85, 1.15)
      const flotte = gsap.to(inner, {
        y: gsap.utils.random(-amp, amp),
        x: gsap.utils.random(-amp, amp) * 0.6,
        duration: dur,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        paused: true,
      })
      // Départ à un point aléatoire du cycle (évite une vague synchronisée)
      flotte.totalTime(gsap.utils.random(0, dur * 2))
      return flotte
    })

    new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting)
        for (const flotte of flottements) {
          if (visible) flotte.play()
          else flotte.pause()
        }
      },
      { threshold: 0 }
    ).observe(nuage)

    // 3. Magnétisme : les tags proches du curseur s'écartent
    function initMagnetisme() {
      const RAYON = 100,
        POUSSEE = 12
      const setters = tags.map((el) => ({
        x: gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' }),
      }))

      window.addEventListener('mousemove', (e) => {
        const rect = nuage.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top

        tags.forEach((el, i) => {
          const dx = centres[i].x - mx
          const dy = centres[i].y - my
          const dist = Math.hypot(dx, dy)

          if (dist < RAYON && dist > 0.01) {
            const proximite = 1 - dist / RAYON
            const force = proximite * proximite * POUSSEE
            setters[i].x((dx / dist) * force)
            setters[i].y((dy / dist) * force)
          } else {
            setters[i].x(0)
            setters[i].y(0)
          }
        })
      })
    }

    // 4. Survol : le tag grossit (les voisins ne changent plus d'opacité).
    tags.forEach((el) => {
      const inner = el.querySelector('span')

      el.addEventListener('mouseenter', () => {
        gsap.to(inner, { scale: 1.06, duration: 0.35, ease: 'power3.out' })
      })

      el.addEventListener('mouseleave', () => {
        gsap.to(inner, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
      })
    })
  }

  // Onglet pré-rendu / iframe cachée : attendre une vraie taille de viewport
  if (window.innerWidth > 0) {
    boot()
  } else {
    const attend = () => {
      if (window.innerWidth > 0) {
        window.removeEventListener('resize', attend)
        document.removeEventListener('visibilitychange', attend)
        boot()
      }
    }
    window.addEventListener('resize', attend)
    document.addEventListener('visibilitychange', attend)
  }
}
