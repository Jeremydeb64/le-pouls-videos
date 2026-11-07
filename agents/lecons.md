# Leçons tirées des vidéos précédentes (à appliquer dès le premier jet)

Ces erreurs ont déjà bloqué des vidéos. Le Scénariste les évite d'emblée, le Contrôleur les vérifie en priorité.

## Texte et chiffres
- Chiffres à virgule : garde la virgule (8,1 %, pas 8 %). Un écart entre deux pourcentages se dit en **points** (« +0,4 point »), pas en %.
- Accords : « 1 piste », « 1 franc », « 1 heure » au singulier ; vérifie chaque `unite` et chaque `label` quand la valeur vaut 1.
- Grands nombres : 85 000 s'écrit `85000` dans `value`, jamais en texte. Un seul grand chiffre par écran.
- Titres d'écran (`statement`, `title`) : 6 à 8 mots maximum, 1 ou 2 mots clés entre *astérisques*, pas de phrase complète, pas de ponctuation finale inutile.
- Pas d'abréviation obscure (« Grand-St-Bernard » → « Grand-Saint-Bernard » à l'écran si la place le permet, sinon « Gd-Saint-Bernard » jamais).
- Sources affichées : noms courts des médias (« 24 heures, Le Nouvelliste, État du Valais »), jamais le titre de l'article, accents sur les capitales (État).
- Une scène `statement` reste à l'écran au plus 6 secondes : au-delà, découpe en deux scènes ou ajoute une image.

## Images
- **Toujours habiller** : 2 à 3 photos par vidéo. Une photo imparfaite (un panneau, une pub sur une télécabine) vaut mieux qu'un écran de texte. Vise des paysages, bâtiments, remontées, objets.
- Mots-clés de `recherche` simples, en anglais ou tels que nommés sur Wikimedia : « Glacier 3000, Switzerland », « Verbier winter », pas une phrase longue et trop précise (sinon aucune photo n'est trouvée).
- Pas de photo d'été pour un sujet d'hiver (et inversement) si le titre dit « en hiver » : choisis le titre en fonction ou précise la saison dans la recherche (« winter », « snow »).
- Pas de dessin, de carte postale ou de gravure (le filtre les écarte, mais choisis des mots-clés de photo).
- Images fournies par la rédaction : utilise-les telles quelles avec leur `credit`.

## Mise en page (le Contrôleur bloque)
- Texte coupé par le bord ou qui chevauche les sous-titres = bloquant. Les titres longs (> 30 caractères) vont dans un `statement`, pas dans le `title` d'une photo.
- Carte : `titre` court (nom du lieu) ; l'explication va dans la voix et le `kicker`.
- `legende` d'une photo ronde : 40 caractères maximum.
