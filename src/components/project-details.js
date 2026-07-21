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

    if (!content.innerHTML) {
      content.style.display = 'none'
      title.style.display = 'none'
    }
  })
}

// Les images portrait occupent deux lignes de la grille
function initGrid() {
  const items = document.querySelectorAll('.grid_item')
  const containers = document.querySelectorAll('.item_container')
  if (!items.length) return

  for (let i = 0; i < items.length; i++) {
    if (items[i].height > items[i].width && containers[i]) {
      containers[i].style.gridRow = 'span 2'
      items[i].style.height = '100%'
      items[i].style.objectFit = 'cover'
    }
  }
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
  const noSource =
    !src ||
    src.trim() === '' ||
    src === 'undefinedenablejsapi=1&rel=0&controls=0&autoplay=1&mute=1&loop=1'

  if (noSource) {
    videoLightbox.style.display = 'none'
  } else {
    videoContainer.style.display = 'block'
  }

  if (videoZoom) {
    videoZoom.addEventListener('click', () => {
      if (videoContainer.style.width === '35vw') {
        videoContainer.style.width = '90vw'
        videoContainer.style.height = '90vh'
        if (videoButtons) videoButtons.style.width = '90vw'
      } else {
        videoContainer.style.width = '35vw'
        videoContainer.style.height = 'auto'
        if (videoButtons) videoButtons.style.width = '35vw'
      }
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
