# Le Pouls — vidéos TikTok automatisées

Média TikTok d'actualité valaisanne. Deux éditions par jour, préparées par 4 agents, publiées après validation humaine.

## Comment ça tourne
1. **Édition** (`.github/workflows/edition.yml`, matin et soir) :
   Veilleur (choix du sujet) → Scénariste (article, script, scènes) → voix ElevenLabs (Lucie ou Nicolas) → rendu Remotion → Contrôleur (faits, neutralité, droits, charte ; jusqu'à 2 corrections).
2. **Validation** : chaque vidéo devient une *release* (lecture du MP4 sur téléphone) et une *issue* « à valider » avec les remarques du Contrôleur, les sources et la description TikTok.
3. **Publication** (`.github/workflows/publier.yml`) : commenter **OK** sur l'issue déclenche le Diffuseur (Postiz → TikTok, étiquette IA cochée).

Lancement manuel : onglet **Actions → Édition Le Pouls → Run workflow**.

## Secrets à créer (Settings → Secrets and variables → Actions)
| Secret | Obligatoire | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | oui | agents (Claude) |
| `ELEVENLABS_API_KEY` | oui | voix + minutage |
| `POSTIZ_API_KEY`, `POSTIZ_TIKTOK_ID` | plus tard | publication TikTok |

## Dossiers
- `agents/` : consignes des 4 agents (règles éditoriales)
- `src/templates.tsx` : modèles de scènes, charte « Éditorial papier »
- `docs/episode-schema.md` : format d'un épisode
- `episodes/` : un JSON par vidéo produite (archive)
- `state/status.json` : état de la rédaction (alimente la mini rédaction)
- `config/sources.json` : flux suivis par le Veilleur

## En local
```bash
npm install
npm run studio                 # prévisualiser l'épisode pilote
npm run test:alignement        # test du calage sous-titres
CHROME_PATH=/usr/bin/google-chrome npm run edition   # édition complète (clés API dans l'environnement)
```

Remotion : vérifier la licence entreprise avant diffusion publique (https://www.remotion.dev/license).
