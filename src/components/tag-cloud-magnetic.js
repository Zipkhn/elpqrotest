// tag-cloud-magnetic.js — nuage de tags organique : flottement continu +
// magnétisme au survol. Cible `#nuage` et ses `.tag` (avec data-w, --x/--y).
// Respecte prefers-reduced-motion et le mode compact (mobile / sans hover).
import { gsap } from '../lib/gsap.js'

export default function initTagCloudMagnetic() {
  const nuage = document.getElementById('nuage')
  if (!nuage) return

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  const tags = gsap.utils.toArray('.tag')
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

    // 4. Survol : le tag grossit, ses voisins s'effacent un peu
    const RAYON_VOISIN = 190
    tags.forEach((el, i) => {
      const inner = el.querySelector('span')

      el.addEventListener('mouseenter', () => {
        gsap.to(inner, { scale: 1.06, duration: 0.35, ease: 'power3.out' })
        tags.forEach((autre, j) => {
          if (j === i) return
          const d = Math.hypot(
            centres[i].x - centres[j].x,
            centres[i].y - centres[j].y
          )
          if (d < RAYON_VOISIN)
            gsap.to(autre, { opacity: 0.35, duration: 0.35 })
        })
      })

      el.addEventListener('mouseleave', () => {
        gsap.to(inner, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
        gsap.to(tags, { opacity: 1, duration: 0.4 })
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
