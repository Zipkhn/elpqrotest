// hygraph.js — accès à l'API de contenu Hygraph (lecture publique, sans token).
// Le endpoint CDN sert le contenu *publié* et autorise le CORS navigateur,
// donc on peut fetch directement depuis le bundle côté client.

const ENDPOINT =
  'https://eu-west-2.cdn.hygraph.com/content/cmq3seffz02oq07w9vicshgoh/master'

// Requête GraphQL générique. Lève une erreur en cas d'échec HTTP ou GraphQL
// pour que l'appelant puisse retomber sur un fallback.
export async function hygraph(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Hygraph HTTP ${res.status}`)
  const json = await res.json()
  if (json.errors) {
    throw new Error(json.errors.map((e) => e.message).join(' ; '))
  }
  return json.data
}

// Récupère les catégories du nuage.
// `title` et `slug` sont partagés (non localisés) → pas besoin d'argument locale.
// `project` est la relation : sa longueur sert à dimensionner les tags
// (plus une catégorie a de projets, plus son tag est gros).
export async function fetchCategories() {
  const data = await hygraph(`{
    categories(first: 100) {
      title
      slug
      project { id }
    }
  }`)
  return (data.categories || [])
    .filter((c) => c.title && c.slug)
    .map((c) => ({
      title: c.title,
      slug: c.slug,
      count: Array.isArray(c.project) ? c.project.length : 0,
    }))
}
