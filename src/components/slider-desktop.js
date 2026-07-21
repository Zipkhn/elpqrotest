// slider-desktop.js — au survol, la vignette s'élargit et affiche titre + lieu.
export default function initSliderDesktop() {
  const projectContainer = document.querySelectorAll('.project_container')
  if (!projectContainer.length) return

  const title = document.querySelectorAll('.project_title')
  const projectLocation = document.querySelectorAll('.project_location')

  for (let i = 0; i < projectContainer.length; i++) {
    projectContainer[i].addEventListener('mouseover', () => {
      projectContainer[i].style.width = '35vw'
      if (title[i]) title[i].style.opacity = '100%'
      if (projectLocation[i]) projectLocation[i].style.opacity = '100%'

      projectContainer[i].addEventListener('mouseout', () => {
        projectContainer[i].style.width = '7vw'
        if (title[i]) title[i].style.opacity = '0'
        if (projectLocation[i]) projectLocation[i].style.opacity = '0'
      })
    })
  }
}
