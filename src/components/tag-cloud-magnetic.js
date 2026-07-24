// tag-cloud-magnetic.js — nuage de tags organique branché sur Hygraph.
// 1. Fetch des catégories (title + slug + nb de projets).
// 2. Génération automatique des `.tag` dans `#nuage` : positions (--x/--y),
//    poids (data-w, selon le nb de projets), et lien vers /categories/[slug].
// 3. Animation : flottement continu + magnétisme au survol (GSAP).
// Respecte prefers-reduced-motion et le mode compact (mobile / sans hover).
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

// Attribue un poids 3→5 à chaque catégorie (minimum 3 = plus de mots minuscules).
// Si des projets sont liés : rang par nombre de projets (les plus fournies
// sont les plus grosses). Sinon : distribution déterministe par slug.
function weightResolver(categories) {
  const max = Math.max(0, ...categories.map((c) => c.count))
  if (max > 0) {
    const ranked = [...categories].sort((a, b) => b.count - a.count)
    const weights = {}
    const n = ranked.length
    ranked.forEach((c, i) => {
      const p = n > 1 ? i / (n - 1) : 0 // 0 (plus fournie) → 1 (moins)
      weights[c.slug] = p < 0.12 ? 5 : p < 0.4 ? 4 : 3
    })
    return (c) => weights[c.slug]
  }
  // Pas encore de projets liés : on varie les tailles pour un vrai effet nuage.
  return (c) => {
    const r = rng(hashStr(c.slug))()
    return r < 0.12 ? 5 : r < 0.4 ? 4 : 3
  }
}

// Répartit les catégories sur une grille jitterée (positions en % de #nuage),
// en mélangeant l'ordre des cellules pour éviter un rendu aligné/alphabétique.
function layout(categories) {
  const n = categories.length
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.7))) // ratio paysage
  const rows = Math.max(1, Math.ceil(n / cols))
  const MX = [10, 90] // marges horizontales en %
  const MY = [15, 85] // marges verticales en %

  const cells = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) cells.push({ r, c })

  // Mélange déterministe des cellules (seed fixe → stable au rechargement)
  const shuffle = rng(0x9e3779b9)
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(shuffle() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }

  const cw = (MX[1] - MX[0]) / cols
  const ch = (MY[1] - MY[0]) / rows

  return categories.map((cat, i) => {
    const { r, c } = cells[i]
    const cx = MX[0] + cw * (c + 0.5)
    const cy = MY[0] + ch * (r + 0.5)
    // Jitter léger à l'intérieur de la cellule, stable par slug (l'anti-
    // chevauchement fera l'espacement fin ensuite, donc on reste modéré ici).
    const jit = rng(hashStr(cat.slug))
    const x = cx + (jit() - 0.5) * cw * 0.4
    const y = cy + (jit() - 0.5) * ch * 0.45
    return { ...cat, x: +x.toFixed(2), y: +y.toFixed(2) }
  })
}

function buildTags(nuage, categories) {
  const positioned = layout(categories)
  const weightOf = weightResolver(categories)

  nuage.textContent = '' // on vide les éventuels placeholders
  const frag = document.createDocumentFragment()

  positioned.forEach((cat) => {
    const a = document.createElement('a')
    a.className = 'tag'
    a.dataset.w = String(weightOf(cat))
    // Deux couleurs d'accent au survol (varie l'ambiance), réparties par slug
    a.dataset.cluster =
      rng(hashStr(cat.slug) ^ 0x55)() < 0.5 ? 'digital' : 'image'
    a.style.setProperty('--x', `${cat.x}%`)
    a.style.setProperty('--y', `${cat.y}%`)
    a.setAttribute('href', `${categoryBase()}/${cat.slug}`)

    const span = document.createElement('span')
    span.textContent = cat.title
    a.appendChild(span)
    frag.appendChild(a)
  })

  nuage.appendChild(frag)
}

// Anti-chevauchement : on mesure la vraie boîte de chaque tag (largeur/hauteur
// réelles selon le texte) puis on écarte itérativement les paires qui se
// recouvrent, le long de l'axe de moindre recouvrement. Les positions finales
// sont réécrites dans --x/--y (en %). À lancer une fois, en desktop, quand
// #nuage a sa taille définitive et que les tags sont dans le DOM.
function resolveOverlaps(nuage, tags, { pad = 10, iterations = 120 } = {}) {
  const box = nuage.getBoundingClientRect()
  const W = box.width,
    H = box.height
  if (!W || !H) return

  const marginX = 0.04 * W
  const marginY = 0.06 * H

  const items = tags.map((el) => {
    const b = el.getBoundingClientRect()
    return {
      el,
      hw: b.width / 2 + pad, // demi-largeur + marge de respiration
      hh: b.height / 2 + pad,
      x: (parseFloat(el.style.getPropertyValue('--x')) / 100) * W,
      y: (parseFloat(el.style.getPropertyValue('--y')) / 100) * H,
    }
  })

  for (let it = 0; it < iterations; it++) {
    let moved = false
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i],
          b = items[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const overlapX = a.hw + b.hw - Math.abs(dx)
        const overlapY = a.hh + b.hh - Math.abs(dy)
        if (overlapX > 0 && overlapY > 0) {
          // On repousse selon l'axe où le recouvrement est le plus faible
          if (overlapX < overlapY) {
            const push = (overlapX / 2) * (dx < 0 ? -1 : 1)
            a.x -= push
            b.x += push
          } else {
            const push = (overlapY / 2) * (dy < 0 ? -1 : 1)
            a.y -= push
            b.y += push
          }
          moved = true
        }
      }
    }
    // On garde tout le monde dans le cadre (avec sa demi-taille)
    for (const p of items) {
      p.x = Math.max(marginX + p.hw, Math.min(W - marginX - p.hw, p.x))
      p.y = Math.max(marginY + p.hh, Math.min(H - marginY - p.hh, p.y))
    }
    if (!moved) break
  }

  for (const p of items) {
    p.el.style.setProperty('--x', `${((p.x / W) * 100).toFixed(2)}%`)
    p.el.style.setProperty('--y', `${((p.y / H) * 100).toFixed(2)}%`)
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
    const isCompact = window.matchMedia(
      '(max-width: 820px), (hover: none)'
    ).matches

    if (reduceMotion) return // le CSS suffit

    if (isCompact) {
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
    gsap.set(tags, { x: 0, y: 0, xPercent: -50, yPercent: -50 })

    // Écarte les mots qui se chevauchent (mesure réelle des boîtes) avant
    // de figer les centres au repos.
    resolveOverlaps(nuage, tags)

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

    // 2. Flottement continu : les petits tags dérivent plus vite et plus loin
    tags.forEach((el) => {
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
      })
      // Départ à un point aléatoire du cycle (évite une vague synchronisée)
      flotte.totalTime(gsap.utils.random(0, dur * 2))
    })

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
