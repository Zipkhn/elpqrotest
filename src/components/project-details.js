// project-details.js — logique de la page d'un projet :
// masquage des infos vides, lightbox vidéo, date.
// (la mise en page de la grille est passée en CSS côté Webstudio, voir plus bas)

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

// PAS DE MISE EN PAGE DE LA GRILLE ICI.
//
// `initGrid()` vivait à cet endroit : il mesurait `naturalWidth`/`naturalHeight`
// image par image et posait, en INLINE, `grid-row: span 2` sur les conteneurs
// portrait plus `height: 100%` / `object-fit: cover` sur l'image.
//
// La grille desktop est désormais une mosaïque à motif, décrite entièrement en
// CSS côté Webstudio : trois colonnes, un cycle de dix images (cinq puis cinq en
// miroir) posé avec `nth-child`, et `object-fit: cover` sur toutes les images.
// Deux raisons de retirer le JS :
//
// 1. Il cassait le motif. Un style inline l'emporte sur la feuille de style :
//    le `grid-row: span 2` des portraits écrasait le span du motif et décalait
//    tout ce qui suit. Visible sur /projet/model-2018, seul projet à mélanger
//    portraits et paysages.
// 2. Il ne sert plus à rien. Le recadrage `cover` fait tenir n'importe quel
//    format dans sa tuile ; l'orientation du fichier source n'a plus d'effet
//    sur la mise en page.

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
  initVideo()
  initDate()
}
