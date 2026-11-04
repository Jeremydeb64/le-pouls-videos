// Lit un épisode (JSON) et assemble la vidéo : scènes, habillage permanent, sous-titres, voix.
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SANS, SERIF, PAD, CONTENT_W, fontFaces, SCENE_TYPES, NO_CAPTIONS } from "./templates";

export type SceneSpec = { type: string; from: number; to: number; theme: "paper" | "green"; props: Record<string, any> };
export type EpisodeSpec = {
  id: string;
  ambiance?: "neutre" | "dynamique" | "sobre" | "aucune"; // fond musical
  voice?: string; // fichier dans public/
  duration: number; // secondes
  captions: [number, number, string][];
  scenes: SceneSpec[];
};

const Chrome: React.FC<{ dark: boolean }> = ({ dark }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fg = dark ? C.paper : C.ink;
  const accent = dark ? C.paper : C.green;
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${(frame / durationInFrames) * 100}%`, background: accent }} />
      <div style={{ position: "absolute", top: 110, left: PAD, display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: accent, letterSpacing: -4 }}>///</span>
        <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 40, color: fg }}>Le Pouls</span>
      </div>
    </>
  );
};

const Captions: React.FC<{ list: [number, number, string][]; dark: boolean }> = ({ list, dark }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cur = list.find(([s, e]) => t >= s - 0.05 && t <= e + 0.12);
  if (!cur) return null;
  const pop = interpolate(t - cur[0], [0, 0.12], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: PAD, width: CONTENT_W, top: 1400, display: "flex" }}>
      <div style={{ scale: `${pop}`, transformOrigin: "left center", background: dark ? C.paper : C.ink, color: dark ? C.ink : C.paper, fontFamily: SANS, fontWeight: 800, fontSize: 50, lineHeight: 1.15, padding: "14px 26px", borderRadius: 14 }}>
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
  const effets = amb !== "sobre" && amb !== "aucune";
  return (
    <>
      {amb !== "aucune" && (
        <Audio
          src={staticFile(`sons/musique-${amb}.mp3`)}
          loop
          volume={(f) => volumeMusique * interpolate(f, [0, fps, durationInFrames - 2 * fps, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
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
  const dark = cur.theme === "green" || cur.type === "photo";
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
            <Comp theme={s.theme} {...s.props} />
          </Sequence>
        );
      })}
      <Chrome dark={dark} />
      {!NO_CAPTIONS.has(cur.type) && <Captions list={episode.captions} dark={dark} />}
      {withVoice && episode.voice && <Audio src={staticFile(episode.voice)} />}
      {withVoice && <Sons episode={episode} />}
    </AbsoluteFill>
  );
};
