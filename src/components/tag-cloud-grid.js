// tag-cloud-grid.js — génère aléatoirement des mots-clés dans une grille
// `.tagCloud_words`, chacun lié à sa page projet.
const TAGS = [
  'Wood',
  'Upcycling',
  'Metal',
  'Origami',
  'Rorschach',
  'Land Art',
  'Model',
  'Featuring',
  'Ceramic',
  'Wood 2',
  'Upcycling 2',
  'Metal 2',
  'Origami 2',
  'Rorschach 2',
  'Land Art 2',
  'Model 2',
  'Featuring 2',
  'Ceramic 2',
  'Wood 3',
  'Upcycling 3',
  'Metal 3',
  'Origami 3',
  'Rorschach 3',
  'Land Art 3',
  'Model 3',
  'Featuring 3',
]

// Entier aléatoire entre min et max inclus
function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export default function initTagCloudGrid() {
  const words = document.querySelector('.tagCloud_words')
  if (!words) return

  const tags = [...TAGS]

  function createLi(i, j, g) {
    const tag = tags[j]
    if (tag === undefined) return

    const div = document.createElement('div')
    const newLi = document.createElement('p')
    const a = document.createElement('a')

    div.className = 'word_container'
    div.style.gridRow = `${i + 1} / ${i + 1}`
    div.style.gridColumn = `${g} / ${g}`

    newLi.className = `word word_${i}`
    a.textContent = tag
    a.setAttribute('href', `projets/${tag}`)

    words.appendChild(div)
    div.appendChild(newLi)
    newLi.appendChild(a)
  }

  for (let i = 0; i < 13 && tags.length; i++) {
    let j = getRandomInt(0, tags.length - 1)
    let g = getRandomInt(0, 20)

    createLi(i, j, g)
    tags.splice(j, 1)
    if (j < tags.length - 4) {
      j += getRandomInt(0, 3)
    } else {
      j++
    }

    if (g < 5) g += getRandomInt(5, 10)
    else if (g > 13) g -= getRandomInt(3, 10)
    else if (g <= 8) g += getRandomInt(3, 7)
    else if (g >= 9) g -= getRandomInt(3, 8)

    createLi(i, j, g)
    tags.splice(j, 1)
  }
}
