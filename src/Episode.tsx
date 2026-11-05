// Lit un épisode (JSON) et assemble la vidéo : scènes, habillage permanent, sous-titres, voix.
import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SANS, SERIF, PAD, CONTENT_W, fontFaces, SCENE_TYPES, NO_CAPTIONS, Mark, FondContext } from "./templates";

export type SceneSpec = { type: string; from: number; to: number; theme: "paper" | "green"; props: Record<string, any>; fond_ia?: { src?: string; video?: boolean; duree?: number; opacite?: number } };
export type EpisodeSpec = {
  id: string;
  ambiance?: "neutre" | "dynamique" | "sobre" | "aucune"; // fond musical
  voice?: string; // fichier dans public/
  sonsIntegres?: boolean;
  rubrique?: string; // pastille en haut à gauche : VALAIS, VOTATION, ÉCONOMIE, POLITIQUE, SOCIÉTÉ, MONTAGNE, SPORT, ENVIRONNEMENT // la piste « voice » contient déjà musique et effets (re-rendu d'une vidéo existante)
  duration: number; // secondes
  captions: [number, number, string][];
  scenes: SceneSpec[];
};

// Pictogrammes de rubrique (traits simples, sur pastille ocre)
const PICTOS: Record<string, React.ReactNode> = {
  VOTATION: <g fill="none" stroke={C.ink} strokeWidth={5} strokeLinejoin="round"><rect x="16" y="30" width="40" height="28" rx="3" /><path d="M28 30 L28 16 L44 16 L44 30" /><path d="M26 44 h20" /></g>,
  ÉCONOMIE: <g fill="none" stroke={C.ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"><path d="M16 54 V40 M30 54 V30 M44 54 V36 M58 54 V20" /><path d="M14 58 h46" /></g>,
  POLITIQUE: <g fill="none" stroke={C.ink} strokeWidth={5} strokeLinejoin="round"><path d="M14 28 L36 14 L58 28 Z" /><path d="M20 30 V52 M31 30 V52 M41 30 V52 M52 30 V52 M14 56 h44" /></g>,
  MONTAGNE: <g fill="none" stroke={C.ink} strokeWidth={5} strokeLinejoin="round"><path d="M10 56 L28 24 L38 40 L46 30 L62 56 Z" /></g>,
  SPORT: <g fill="none" stroke={C.ink} strokeWidth={5} strokeLinejoin="round"><path d="M24 16 h24 v12 a12 12 0 0 1 -24 0 Z" /><path d="M36 40 v10 M26 56 h20" /></g>,
  SOCIÉTÉ: <g fill="none" stroke={C.ink} strokeWidth={5}><circle cx="26" cy="26" r="7" /><circle cx="46" cy="26" r="7" /><path d="M14 54 a12 12 0 0 1 24 0 M34 54 a12 12 0 0 1 24 0" /></g>,
  ENVIRONNEMENT: <g fill="none" stroke={C.ink} strokeWidth={5} strokeLinejoin="round"><path d="M18 52 C18 28 36 16 56 16 C56 38 44 52 18 52 Z" /><path d="M18 52 L40 30" /></g>,
  VALAIS: <g fill="none" stroke={C.ink} strokeWidth={5} strokeLinejoin="round"><path d="M36 58 C24 44 18 36 18 28 a18 18 0 0 1 36 0 c0 8 -6 16 -18 30 Z" /><circle cx="36" cy="28" r="6" /></g>,
};
const normRub = (r?: string) => {
  const u = (r || "VALAIS").toUpperCase().normalize("NFC");
  return Object.keys(PICTOS).find((k) => k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === u.normalize("NFD").replace(/[\u0300-\u036f]/g, "")) || "VALAIS";
};

// Habillage permanent : barre de progression et pastille de rubrique (logo seulement sur l'écran de fin)
const Chrome: React.FC<{ outro: boolean; rubrique?: string; fondClair: boolean }> = ({ outro, rubrique, fondClair }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (outro) return null;
  const rub = normRub(rubrique);
  const p = interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${(frame / durationInFrames) * 100}%`, background: C.ochre }} />
      <div style={{ position: "absolute", top: 250, left: PAD, display: "flex", alignItems: "center", gap: 22, opacity: p }}>
        <svg width={88} height={88} viewBox="0 0 72 72" style={{ scale: `${0.7 + 0.3 * p}` }}>
          <circle cx="36" cy="36" r="36" fill={C.ochre} />
          {PICTOS[rub]}
        </svg>
        <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: 36, letterSpacing: 3, color: C.ochre, background: fondClair ? "rgba(16,36,31,0.85)" : "transparent", padding: fondClair ? "6px 14px" : 0, borderRadius: 6 }}>{rub}</span>
      </div>
    </>
  );
};

// Sous-titres : gros, gras, centrés, sans fond ; le mot prononcé passe en ocre
const Captions: React.FC<{ list: [number, number, string][] }> = ({ list }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cur = list.find(([s, e]) => t >= s - 0.05 && t <= e + 0.12);
  if (!cur) return null;
  const mots = cur[2].split(/\s+/).filter(Boolean);
  // Répartition du temps proportionnelle à la longueur des mots
  const total = mots.reduce((n, m) => n + m.length + 1, 0);
  const avance = Math.min(1, Math.max(0, (t - cur[0]) / Math.max(0.2, cur[1] - cur[0])));
  let cumul = 0, actif = -1;
  mots.forEach((m, i) => { if (actif < 0 && avance * total < (cumul += m.length + 1)) actif = i; });
  const op = interpolate(t - cur[0], [-0.05, 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: PAD, width: CONTENT_W, bottom: 1920 - 1440, display: "flex", justifyContent: "center", opacity: op }}>
      <div style={{ color: C.paper, fontFamily: SANS, fontWeight: 900, fontSize: 60, lineHeight: 1.15, textAlign: "center", textShadow: "0 3px 14px rgba(0,0,0,0.55)", maxWidth: CONTENT_W }}>
        {mots.map((m, i) => (
          <span key={i} style={{ color: i === actif ? C.ochre : C.paper }}>{m}{i < mots.length - 1 ? " " : ""}</span>
        ))}
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
  return (
    <AbsoluteFill style={{ backgroundColor: C.green }}>
      <style>{fontFaces}</style>
      {scenes.map((s, i) => {
        const Comp = SCENE_TYPES[s.type];
        if (!Comp) throw new Error(`Type de scène inconnu : ${s.type}`);
        const from = Math.round(s.from * fps);
        const dur = Math.round(s.to * fps) - from + (i < scenes.length - 1 ? 10 : 0);
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <FondContext.Provider value={s.fond_ia?.src ? (s.fond_ia as any) : null}>
              <Comp theme="green" {...s.props} />
            </FondContext.Provider>
          </Sequence>
        );
      })}
      <Chrome outro={cur.type === "outro"} rubrique={episode.rubrique} fondClair={cur.type === "photo" || cur.type === "illustration"} />
      {!NO_CAPTIONS.has(cur.type) && <Captions list={episode.captions} />}
      {withVoice && episode.voice && <Audio src={staticFile(episode.voice)} />}
      {withVoice && <Sons episode={episode} />}
    </AbsoluteFill>
  );
};
