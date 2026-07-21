# 🇫🇷 JavaScript avec Webstudio

**Pour l'instant, ce setup ne fonctionne pas avec Safari !**

## Étape 1 : Installation et initialisation 💽

Clonez le repo en cliquant sur "Use this template" et configurer votre nouveau repo avec le nom de votre projet.

**.**

Sur votre machine, ouvrez le terminal et clonez votre nouveau repo en utilisant l'url SSH affichée dans la dropdown "Code" sur GitHub, avec la commande `git clone <URL>`

**.**

Déplacez vous dans le dossier fraichement créé par git avec la commande `cd <NOM_DU_PROJET>`

**.**

Installez les dépendances du projets avec la commande `yarn` . Si vous êtes plus familier avec `npm`, vous pouvez utiliser la commande `npm i`

**.**

Ouvrez VSCode pour ce projet. `code .` dans votre dossier courant depuis votre terminal.

## Étape 2 : Le lancement 🏏

**1.**

Maintenant, vous pouvez commencer à coder ! Ouvrez le fichier `main.js` dans le dossier `src`

ça sera votre fichier d’entré pour votre projet.

jQuery est disponible dans le projet mais reste externalisé du build final. Webstudio n’injecte pas jQuery par défaut : si votre code en a besoin, ajoutez-le vous-même (voir le fichier `example/index.html`).

**2.**

Pour lancer le serveur de dev du projet, ouvrez un terminal à la racine du projet et lancez la commande `yarn dev`

Vous pouvez voir vos fichiers JS générés par Vite à l'adresse `http://localhost:3000/src/main.js`

## Étape 3 : Intégration avec Webstudio 📝

C'est maintenant que les choses vont commencer à être excitante !

Dans Webstudio, deux possibilités:

Dans les deux cas, vous avez le HMR (Hot Module Reload) en place, ça permet de rafraichir la page à chaque fois que vous sauvegarder un fichier JS. C'est pratique et ça vous fera gagner du temps.

- Si vous faites le dev le JS:
  Coller ce script dans la partie `Before </body> tag` du custom code dans les paramètres du projet pour que ça soit chargé sur toutes les pages.
  ```html
  <script type="module" src="http://localhost:3000/@vite/client"></script>
  <script type="module" src="http://localhost:3000/src/main.js"></script>
  ```
## Étape 4 : Mise en production 🚀

**1.**

C'est bon votre code est prêt. C'est l'heure de push !

Faites simplement **commit** puis **push** votre code sur la branche `main` de **GitHub**.

**2.**

Le workflow GitHub Actions (`.github/workflows/cd.yml`) se déclenche automatiquement : il build le projet, commit le `dist/` à jour dans le repo, puis purge le cache jsDelivr. Aucun compte NPM n'est nécessaire.

**3.**

Il ne reste plus qu'à charger votre JS de production sur le site Webstudio via **jsDelivr**, qui sert le fichier directement depuis GitHub. Collez ce script dans le custom code (`Before </body> tag`) :

```html
<script src="https://cdn.jsdelivr.net/gh/Zipkhn/elpqrotest@main/dist/main.js"></script>
```

> Repo servi : `Zipkhn/elpqrotest`.
> L'URL `@main` sert toujours la dernière version : le cache est purgé à chaque push, donc pas besoin de la changer.
> Pour figer une version précise (cache permanent), utilisez un tag git à la place, ex. `@1.0.2`.
