// Lit un épisode (JSON) et assemble la vidéo : scènes, habillage permanent, sous-titres, voix.
import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SANS, SERIF, PAD, CONTENT_W, fontFaces, SCENE_TYPES, NO_CAPTIONS, Mark, FondContext } from "./templates";

export type SceneSpec = { type: string; from: number; to: number; theme: "paper" | "green"; props: Record<string, any>; fond_ia?: { src?: string; video?: boolean; duree?: number; opacite?: number } };
export type EpisodeSpec = {
  id: string;
  ambiance?: "neutre" | "dynamique" | "sobre" | "aucune"; // fond musical
  voice?: string; // fichier dans public/
  sonsIntegres?: boolean; // la piste « voice » contient déjà musique et effets (re-rendu d'une vidéo existante)
  duration: number; // secondes
  captions: [number, number, string][];
  scenes: SceneSpec[];
};

// Habillage permanent : barre de progression et pied de page « Sentir l'actualité » (logo seulement sur l'écran de fin)
const Chrome: React.FC<{ dark: boolean; outro: boolean }> = ({ dark, outro }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fg = dark ? C.paper : C.green;
  const filet = dark ? C.ochre : C.mid;
  if (outro) return null;
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: `${(frame / durationInFrames) * 100}%`, background: C.ochre }} />
      <div style={{ position: "absolute", top: 1490, left: PAD, width: CONTENT_W, height: 3, background: dark ? C.paper : C.mid, opacity: 0.6 }} />
      <div style={{ position: "absolute", top: 1512, left: PAD, fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: 1.5, color: dark ? C.paper : C.mid, opacity: 0.8 }}>SENTIR L’ACTUALITÉ</div>
    </>
  );
};

// Sous-titres : Inter 700 52 px, blanc sur vert, 2 lignes max, centrés, apparition par fondu très court
const Captions: React.FC<{ list: [number, number, string][]; dark: boolean }> = ({ list, dark }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cur = list.find(([s, e]) => t >= s - 0.05 && t <= e + 0.12);
  if (!cur) return null;
  const op = interpolate(t - cur[0], [-0.05, 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: PAD, width: CONTENT_W, bottom: 1920 - 1450, display: "flex", justifyContent: "center", opacity: op }}>
      <div style={{ background: dark ? C.ink : C.green, color: C.white, fontFamily: SANS, fontWeight: 700, fontSize: 52, lineHeight: 1.16, padding: "14px 22px", borderRadius: 12, textAlign: "center", maxWidth: CONTENT_W }}>
        {cur[2]}
      </div>
    </div>
  );
};

// Fond musical sous la voix + effets discrets (whoosh aux transitions, pop sur les chiffres)
const SCENES_CHIFFRES = new Set(["stats", "bigFigure", "barres", "avantApres", "crowd", "finish", "chrono"]);
const Sons: React.FC<{ episode: EpisodeSpec }> = ({ episode }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const amb = episode.ambiance || "neutre";
  const volumeMusique = amb === "sobre" ? 0.07 : amb === "dynamique" ? 0.11 : 0.09;
  const integres = !!episode.sonsIntegres;
  const effets = !integres && amb !== "sobre" && amb !== "aucune";
  const outro = episode.scenes.find((s) => s.type === "outro");
  const debutOutro = outro ? Math.round(outro.from * fps) : durationInFrames - 4 * fps;
  return (
    <>
      {/* Signature sonore sur l'écran de fin (le logo n'apparaît qu'à la fin) */}
      <Sequence from={debutOutro + 2} durationInFrames={Math.max(1, durationInFrames - debutOutro - 2)}>
        <Audio src={staticFile("sons/signature.mp3")} volume={(f) => 0.6 * interpolate(f, [durationInFrames - debutOutro - 2 - 8, durationInFrames - debutOutro - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
      {!integres && amb !== "aucune" && (
        <Audio
          src={staticFile(`sons/musique-${amb}.mp3`)}
          loop
          volume={(f) => volumeMusique * interpolate(f, [0, fps, durationInFrames - 2 * fps, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(f, [debutOutro - 10, debutOutro + 20], [1, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      )}
      {effets &&
        episode.scenes.slice(1).map((s, i) => (
          <Sequence key={"w" + i} from={Math.max(0, Math.round(s.from * fps) - 6)} durationInFrames={30}>
            <Audio src={staticFile("sons/whoosh.mp3")} volume={0.18} />
          </Sequence>
        ))}
      {effets &&
        episode.scenes
          .filter((s) => SCENES_CHIFFRES.has(s.type))
          .map((s, i) => (
            <Sequence key={"p" + i} from={Math.round((s.from + 0.5) * fps)} durationInFrames={20}>
              <Audio src={staticFile("sons/pop.mp3")} volume={0.22} />
            </Sequence>
          ))}
    </>
  );
};

export const Episode: React.FC<{ episode: EpisodeSpec; withVoice?: boolean }> = ({ episode, withVoice = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const scenes = episode.scenes;
  const cur = scenes.find((s) => t >= s.from && t < s.to) ?? scenes[scenes.length - 1];
  const dark = cur.theme === "green" || cur.type === "photo" || cur.type === "illustration";
  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      <style>{fontFaces}</style>
      {scenes.map((s, i) => {
        const Comp = SCENE_TYPES[s.type];
        if (!Comp) throw new Error(`Type de scène inconnu : ${s.type}`);
        const from = Math.round(s.from * fps);
        const dur = Math.round(s.to * fps) - from + (i < scenes.length - 1 ? 10 : 0);
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <FondContext.Provider value={s.fond_ia?.src ? (s.fond_ia as any) : null}>
              <Comp theme={s.theme} {...s.props} />
            </FondContext.Provider>
          </Sequence>
        );
      })}
      <Chrome dark={dark} outro={cur.type === "outro"} />
      {!NO_CAPTIONS.has(cur.type) && <Captions list={episode.captions} dark={dark} />}
      {withVoice && episode.voice && <Audio src={staticFile(episode.voice)} />}
      {withVoice && <Sons episode={episode} />}
    </AbsoluteFill>
  );
};
