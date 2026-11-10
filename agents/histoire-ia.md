# Mode HISTOIRE IA

Nom de code pour une vidéo **entièrement illustrée par l'IA** : légendes du Valais, sujets de fond, ou une actualité racontée autrement. Elle sort des habitudes du Pouls (pas d'infographie, pas de photo Wikimedia) : une histoire, des images plein écran, deux voix.

## Quand
Uniquement sur demande de Jérémy (« HISTOIRE IA : … »), dans une conversation avec Claude (modèle Fable). Ce mode n'est jamais lancé par l'édition automatique de 14 h : les images sont générées avec l'abonnement Higgsfield de Jérémy, accessible seulement en conversation.

## Déroulé
1. **Recherche** : Claude vérifie la légende ou le sujet (sources locales : offices du tourisme, Médiathèque Valais, communes, médias). Une légende est racontée comme une légende (« on raconte que… »), jamais comme un fait.
2. **Script** : dialogue Lucie + Arthur (voix off), 60 à 90 s, accroche dans les 3 premières secondes, « Salut, c'est Lucie. — Et Arthur. », une chute qui relie l'histoire à aujourd'hui.
3. **Images** : 9 à 12 visuels verticaux 9:16 générés avec Higgsfield, un par moment de l'histoire, dans un style unique pour toute la vidéo (décrit une fois, répété dans chaque prompt). 1 à 3 plans peuvent être animés (image vers vidéo, 5 s). Pas de texte dans les images, pas de personne réelle, pas de logo.
4. **Montage** : le script va dans `histoires/<nom>/script.json` (format « Sortie technique » du Scénariste, scènes `illustration` avec `url` ou `src`), puis `.github/lancer-edition.json` = `{"edition": "histoire", "max_sujets": 1, "histoire": "histoires/<nom>/script.json"}`. GitHub fait les voix, les sous-titres, le rendu, le contrôle visuel et le dépôt Drive.
5. **Contrôle** : Claude regarde les images de la vidéo finie avant de la remettre à Jérémy.

## Règles
- Chaque image porte la légende « Image générée avec l'IA » (ajoutée automatiquement).
- Rubrique : `LÉGENDE` (ou la rubrique du sujet). Ambiance sonore : `sobre`.
- Sur TikTok : étiquette « Contenu généré par l'IA » obligatoire.
- Sources citées sur l'écran de fin et dans le texte de publication.
