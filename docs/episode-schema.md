# Format d'un épisode Le Pouls

Une vidéo = un fichier `episodes/AAAA-MM-JJ-sujet.json`. Le rendu se lance avec :

```bash
npx remotion render src/index.ts Episode out/episode.mp4 --props=episodes/AAAA-MM-JJ-sujet.json
```
(le fichier de props contient `{"episode": {...}, "withVoice": true}` ; voir l'exemple Crans-Montana.)

## Champs principaux
| Champ | Rôle |
|---|---|
| `id` | identifiant (date + sujet) |
| `voice` | fichier audio dans `public/` (MP3 ElevenLabs) |
| `duration` | durée totale en secondes (voix + ~2 s de fin) |
| `captions` | `[début, fin, "texte"]` en secondes, chiffres en notation suisse |
| `scenes` | liste des scènes, dans l'ordre |
| `meta` | présentateur, sources, notes pour le contrôle |

Chaque scène : `{ "type", "from", "to", "theme": "paper" | "green", "props": {...} }`. Les temps `at` dans les props sont en secondes **depuis le début de la scène**.

## Types de scènes disponibles
| Type | Usage | Props |
|---|---|---|
| `chrono` | accroche compte à rebours | `kicker, label, value, unit, headline` |
| `titleBib` | carte titre en dossard (+ logo optionnel) | `bib{top,number,bottom}, title, logo?` |
| `calendar` | dates d'un événement + frise entre deux années | `kicker, days, title, fromYear, toYear, yearsAt, yearsCaption` |
| `stats` | 2 à 3 chiffres clés (portes de slalom en option, pour le ski) | `kicker, items[{value,label,at}], portes?` |
| `crowd` | public sur place (tribune qui fait la ola) + écrans | `kicker, live{value,label,at}, screens{value,label,at,note}` |
| `statement` | phrase de relance plein écran | `text` |
| `bigFigure` | un très grand chiffre + grille d'unités | `kicker, prefix?, value, label, at, grid?{count,value,label,note,at}` |
| `finish` | montant + part en anneau, sous une arche | `arch, place, intro, value, unit, at, share (0–1), shareAt, shareLabel` |
| `person` | personne citée (dossard, bio, propos rapportés) | `kicker, name, bib, bio, quote, quoteAt, quoteSource` |
| `recap` | « À retenir » en 3 lignes | `kicker, items[{n,label,at}]` |
| `photo` | photo plein écran avec crédit | `src, credit, kicker?, title?` |
| `outro` | fin : marque, appel à s'abonner, sources | `tagline, cta, sources` |
| `ballot` | votation : urne, date du scrutin, question | `kicker, date, niveau ("cantonal"/"fédéral"), question` |
| `carte` | carte du Valais, zoom sur la ou les communes (noms officiels des 122 communes) | `kicker, communes[], titre?, zoom?, at?` |
| `frise` | frise chronologique, 2 à 4 étapes | `kicker, items[{date,label,at}]` |
| `barres` | comparaison de 2 à 4 valeurs | `kicker, items[{label,value,at,accent?}], unite?, note?` |
| `avantApres` | évolution d'une valeur, variation en % calculée | `kicker, avant{label,value}, apres{label,value}, unite?, at` |
| `versus` | votation : arguments du oui et du non, deux colonnes identiques | `kicker, pour{titre?,points[],at}, contre{titre?,points[],at}, note?` |

Les types `stats`, `titleBib`, `finish`, `person` sont habillés « ski » pour l'épisode pilote. Pour d'autres sujets, le Scénariste demande un nouveau type adapté (urne, carte, chantier, etc.) plutôt que de détourner ces scènes.

## Contraintes de mise en page
- Format 1080 × 1920, 30 images/s.
- Marge gauche 90 px, zone libre à droite 160 px, rien d'important sous y = 1500 (interface TikTok).
- Sous-titres (charte V3.1) : Inter 700, 52 px, blanc sur vert, centrés, bas du bloc à y = 1450, 2 lignes max (29 caractères par ligne environ) ; masqués sur `statement` et `outro`.
- Zone essentielle : x = 100 à 900, y = 300 à 1450. Rien d'important à droite de x = 900 ni sous y = 1450.
