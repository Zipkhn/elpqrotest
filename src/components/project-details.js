// project-details.js — logique de la page d'un projet :
// masquage des infos vides, mise en page de la grille, lightbox vidéo, date.

// Masque les blocs d'info dont le contenu est vide
function initInfos() {
  const infos = [
    'dimension',
    'materials',
    'location',
    'mecenat',
    'photo_credit',
  ]

  infos.forEach((info) => {
    const content = document.querySelector('.' + info + '_content')
    const title = document.querySelector('.' + info + '_title')
    if (!content || !title) return

    // `textContent.trim()` et pas `innerHTML` : le CMS sert régulièrement un
    // espace insécable ou un `<br>` pour un champ « vide », et ces deux-là sont
    // truthy. Le titre restait alors affiché au-dessus d'un bloc sans contenu.
    if (!content.textContent.trim()) {
      content.style.display = 'none'
      title.style.display = 'none'
    }
  })
}

// Les images portrait occupent deux lignes de la grille.
//
// LA MESURE ATTEND LE CHARGEMENT DE L'IMAGE, et c'est tout le sujet.
//
// L'ancienne version testait `items[i].height > items[i].width`. Sur un <img>,
// ces deux propriétés reflètent les ATTRIBUTS HTML `width`/`height` — et valent
// **0** tant que l'image n'est pas disponible et qu'aucun attribut n'est posé.
// Le test se réduisait donc à `0 > 0`, faux : le `grid-row: span 2` n'était
// jamais appliqué. Sauf quand l'image était déjà en cache, où il l'était.
// D'où une mise en page qui changeait entre le premier affichage et le
// rechargement — sans rien changer au code ni au contenu.
//
// `naturalWidth`/`naturalHeight` donnent les dimensions intrinsèques du fichier,
// indépendamment de tout attribut ; elles ne sont simplement renseignées qu'une
// fois l'image décodée. On attend donc, image par image : chacune se réarrange
// dès qu'elle est prête, sans bloquer les autres.
function initGrid() {
  const items = document.querySelectorAll('.grid_item')
  const containers = document.querySelectorAll('.item_container')
  if (!items.length) return

  const applique = (img, container) => {
    if (!container) return
    if (img.naturalHeight > img.naturalWidth) {
      container.style.gridRow = 'span 2'
      img.style.height = '100%'
      img.style.objectFit = 'cover'
    }
  }

  items.forEach((img, i) => {
    const container = containers[i]
    if (img.complete && img.naturalWidth) {
      applique(img, container)
      return
    }
    // `once: true` — le gestionnaire se retire lui-même, rien à désinscrire.
    img.addEventListener('load', () => applique(img, container), { once: true })
  })
}

// Lightbox vidéo : zoom / fermeture ; masquée si aucune source valide
function initVideo() {
  const videoContent = document.querySelector('.video_content')
  const videoContainer = document.querySelector('.video_container')
  const videoClose = document.querySelector('.video_close')
  const videoZoom = document.querySelector('.video_zoom')
  const videoButtons = document.querySelector('.video_buttons')
  const videoLightbox = document.querySelector('.video_lightbox')

  if (!videoContent || !videoContainer || !videoLightbox) return

  const src = videoContent.getAttribute('src')
  // `includes('undefined')` plutôt que l'égalité à la chaîne complète
  // 'undefinedenablejsapi=1&rel=0&controls=0&autoplay=1&mute=1&loop=1' : cette
  // URL est concaténée côté Webstudio à partir d'un champ vide, et le moindre
  // changement de paramètre YouTube faisait retomber la comparaison à faux —
  // la lightbox s'ouvrait alors sur une vidéo inexistante.
  const noSource = !src || !src.trim() || src.includes('undefined')

  if (noSource) {
    videoLightbox.style.display = 'none'
  } else {
    videoContainer.style.display = 'block'
  }

  if (videoZoom) {
    // État explicite. Il était auparavant déduit de `videoContainer.style.width`
    // — un style inline que seul ce gestionnaire écrit, donc vide au premier
    // clic : on partait systématiquement dans la branche « agrandir », même
    // quand le CSS affichait déjà la vidéo en grand.
    let agrandi = false
    videoZoom.addEventListener('click', () => {
      agrandi = !agrandi
      videoContainer.style.width = agrandi ? '90vw' : '35vw'
      videoContainer.style.height = agrandi ? '90vh' : 'auto'
      if (videoButtons) videoButtons.style.width = agrandi ? '90vw' : '35vw'
    })
  }

  if (videoClose) {
    videoClose.addEventListener('click', () => {
      videoContainer.style.display = 'none'
      if (videoButtons) videoButtons.style.display = 'none'
      videoLightbox.style.display = 'none'
    })
  }
}

// Formate la date "brute" en "Month YYYY"
function initDate() {
  const dateDOM = document.getElementById('date')
  if (!dateDOM) return

  const date = new Date(dateDOM.innerHTML)
  if (isNaN(date)) return

  dateDOM.innerHTML = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export default function initProjectDetails() {
  initInfos()
  initGrid()
  initVideo()
  initDate()
}
