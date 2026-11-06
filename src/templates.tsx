// Modèles de scènes Le Pouls — charte V3.1 (vert profond, crème, ocre, Inter Display).
// Chaque scène reçoit ses props depuis le fichier d'épisode JSON. Les temps « at » sont en secondes depuis le début de la scène.
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Loop, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import VALAIS from "./geo/valais.json";

// Jetons de la charte (design-tokens.json V3.1)
export const C = {
  paper: "#F5F2EA",
  ink: "#111A19",
  green: "#1A3A35", // forest : identité principale
  mid: "#3F6B62",
  sage: "#91A883",
  ochre: "#D3A657",
  white: "#FFFFFF",
  softgrey: "#D9DEE1",
  muted: "#647772",
  line: "#CFD6D0",
  greenDark: "#2A4C45", // traits sur fond vert
  mutedOnGreen: "#91A883",
  beige: "#E8E5DA",
};
export const SERIF = "InterDisplay"; // titres, grands chiffres (Inter Display Black)
export const SANS = "Inter"; // texte, sous-titres, légendes
export const PAD = 100;
export const CONTENT_W = 800; // zone essentielle x = 100 à 900 (droite réservée à TikTok)
export const TRACK_TITRE = "-0.035em";
export const TRACK_CHIFFRE = "-0.05em";

export const fontFaces = `
@font-face{font-family:'InterDisplay';src:url('${staticFile("fonts/InterDisplay-ExtraBold.woff2")}') format('woff2');font-weight:700 800;}
@font-face{font-family:'InterDisplay';src:url('${staticFile("fonts/InterDisplay-Black.woff2")}') format('woff2');font-weight:900;}
@font-face{font-family:'Inter';src:url('${staticFile("fonts/Inter-Medium.woff2")}') format('woff2');font-weight:400 500;}
@font-face{font-family:'Inter';src:url('${staticFile("fonts/Inter-SemiBold.woff2")}') format('woff2');font-weight:600;}
@font-face{font-family:'Inter';src:url('${staticFile("fonts/Inter-Bold.woff2")}') format('woff2');font-weight:700;}
@font-face{font-family:'Inter';src:url('${staticFile("fonts/Inter-ExtraBold.woff2")}') format('woff2');font-weight:800 900;}
`;

type Theme = "paper" | "green";
export const th = (t: Theme) =>
  t === "green"
    ? { bg: C.green, fg: C.paper, accent: C.ochre, sub: C.sage, rule: C.greenDark, data: C.sage, card: C.white, cardFg: C.green }
    : { bg: C.paper, fg: C.green, accent: C.mid, sub: C.muted, rule: C.line, data: C.mid, card: C.white, cardFg: C.green };

// ---------- primitives ----------
const useAt = () => {
  const { fps } = useVideoConfig();
  return (sec = 0) => Math.round(sec * fps);
};
// Entrées sans rebond (charte : easeOutCubic, 420 ms)
const useEnter = (delay = 0) => {
  const frame = useCurrentFrame();
  return interpolate(frame - delay, [0, 13], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Révélation par masque vertical + déplacement de 24 px maximum
export const Rise: React.FC<{ delay?: number; dist?: number; children: React.ReactNode }> = ({ delay = 0, dist = 24, children }) => {
  const p = useEnter(delay);
  const d = Math.min(dist, 24);
  return (
    <div style={{ opacity: interpolate(p, [0, 0.4], [0, 1], clamp), translate: `0 ${interpolate(p, [0, 1], [d, 0])}px`, clipPath: `inset(0 0 ${interpolate(p, [0, 1], [100, 0])}% 0)` }}>{children}</div>
  );
};

export const swiss = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "’");
const plain = (n: number) => Math.round(n).toString();

// Données : progression mesurée (easeOutQuart, 700 ms) puis valeur stable
const Counter: React.FC<{ to: number; from?: number; delay?: number; dur?: number; grouped?: boolean }> = ({ to, from = 0, delay = 0, dur = 21, grouped = true }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame - delay, [0, dur], [from, to], { ...clamp, easing: Easing.out(Easing.quad) });
  // Décimales conservées (8,1 % reste 8,1 %), virgule à la française
  const dec = Number.isInteger(to) ? 0 : Math.min(2, (String(to).split(".")[1] || "").length);
  if (dec) return <>{v.toFixed(dec).replace(".", ",")}</>;
  return <>{(grouped && to >= 10000 ? swiss : plain)(v)}</>;
};

// Barre inclinée (18°), élément d'identité
const slashPts = (x: number, y: number, h: number, w: number) => `${x + h * 0.33},${y} ${x + h * 0.33 + w},${y} ${x + w},${y + h} ${x},${y + h}`;
export const Mark: React.FC<{ h?: number; colors: string[]; delays?: number[] }> = ({ h = 60, colors, delays }) => {
  const frame = useCurrentFrame();
  const w = h * 0.24;
  const step = h * 0.33 + 10 * (h / 75);
  const W = step * 2 + h * 0.33 + w + 2;
  return (
    <svg width={W} height={h} viewBox={`0 0 ${W} ${h}`} style={{ overflow: "visible" }}>
      {colors.map((c, i) => {
        const p = delays ? interpolate(frame - delays[i], [0, 8], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
        return <polygon key={i} points={slashPts(i * step, h * (1 - p), h * p, w)} fill={c} />;
      })}
    </svg>
  );
};

// Fond sombre : vignette radiale et fins traits lumineux horizontaux qui glissent lentement
const Ambiance: React.FC = () => {
  const frame = useCurrentFrame();
  const traits = [[300, 0.5, 420], [610, 0.35, 300], [880, 0.45, 520], [1180, 0.3, 360], [1500, 0.4, 460], [1720, 0.3, 280]];
  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 50% at 50% 42%, #24493F 0%, #1A3A35 45%, #10241F 100%)" }} />
      {traits.map(([y, op, w], i) => {
        const x = ((frame * (0.6 + i * 0.15) + i * 260) % 1400) - 300;
        return <div key={i} style={{ position: "absolute", top: y, left: i % 2 ? 1080 - x - w : x, width: w, height: 2, background: `linear-gradient(90deg, rgba(245,242,234,0), rgba(245,242,234,${op * 0.35}), rgba(245,242,234,0))` }} />;
      })}
    </>
  );
};

// Trames diagonales translucides (fonds sombres uniquement)
const Trames: React.FC = () => (
  <svg width={1080} height={1920} viewBox="0 0 1080 720" preserveAspectRatio="xMidYMin slice" style={{ position: "absolute", inset: 0 }}>
    <g opacity={0.16} fill={C.mid}>
      <polygon points="665,0 770,0 465,720 360,720" />
      <polygon points="815,0 865,0 560,720 510,720" />
      <polygon points="970,0 993,0 685,720 662,720" />
    </g>
  </svg>
);

// Barres de rythme (grand chiffre)
const Rythme: React.FC<{ color: string; delay?: number; heights?: number[] }> = ({ color, delay = 0, heights = [95, 155, 222, 277] }) => {
  const frame = useCurrentFrame();
  const w = 40, g = 13, max = Math.max(...heights);
  return (
    <svg width={heights.length * (w + g) + 40} height={max} viewBox={`0 0 ${heights.length * (w + g) + 40} ${max}`}>
      {heights.map((h0, i) => {
        const p = interpolate(frame - delay - i * 3, [0, 18], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
        const h = h0 * p;
        const a = i * (w + g);
        return <polygon key={i} points={`${a + h * 0.33},${max - h} ${a + h * 0.33 + w},${max - h} ${a + w},${max} ${a},${max}`} fill={color} />;
      })}
    </svg>
  );
};

// Visuel généré par IA en arrière-plan d'une scène (image ou courte animation), légendé
export type FondIA = { src: string; video?: boolean; duree?: number; opacite?: number; libre?: boolean };
export const FondContext = React.createContext<FondIA | null>(null);
export const LegendeIA: React.FC<{ clair?: boolean }> = ({ clair = true }) => (
  <div style={{ position: "absolute", right: 180, top: 246, fontFamily: SANS, fontWeight: 600, fontSize: 24, color: clair ? "rgba(245,242,234,0.9)" : "rgba(17,26,25,0.75)", letterSpacing: 0.3 }}>Image générée avec l’IA</div>
);
const CoucheIA: React.FC<{ fond: FondIA; theme: Theme }> = ({ fond, theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.08]);
  // Voile aux couleurs de la scène pour garder les textes lisibles (sauf visuel « libre » en pleine intensité)
  const voile = fond.libre ? 0.25 : 1 - (fond.opacite ?? 0.38);
  const bg = th(theme).bg;
  const media = fond.video ? (
    <Loop durationInFrames={Math.max(1, Math.round((fond.duree || 5) * fps))}>
      <OffthreadVideo src={staticFile(fond.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </Loop>
  ) : (
    <Img src={staticFile(fond.src)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: `${zoom}` }} />
  );
  return (
    <>
      <AbsoluteFill style={{ overflow: "hidden" }}>{media}</AbsoluteFill>
      <AbsoluteFill style={{ background: bg, opacity: voile }} />
    </>
  );
};

const Frame: React.FC<{ theme: Theme; children: React.ReactNode }> = ({ theme, children }) => {
  const frame = useCurrentFrame();
  const fond = React.useContext(FondContext);
  // Volet aligné sur la grille, 280 ms
  const p = interpolate(frame, [0, 8], [100, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: th(theme).bg, clipPath: `inset(${p}% 0 0 0)` }}>
      {fond ? <CoucheIA fond={fond} theme={theme} /> : theme === "green" && <Ambiance />}
      {children}
      {fond && <LegendeIA clair={theme === "green"} />}
    </AbsoluteFill>
  );
};

const Body: React.FC<{ top?: number; children: React.ReactNode }> = ({ top = 320, children }) => (
  <div style={{ position: "absolute", left: PAD, top: Math.max(top, 300), width: CONTENT_W }}>{children}</div>
);

// Cartouche ocre (onglet éditorial)
const Kicker: React.FC<{ color?: string; delay?: number; center?: boolean; children: React.ReactNode }> = ({ delay = 4, center, children }) => (
  <Rise delay={delay}>
    <div style={{ textAlign: center ? "center" : "left" }}>
      <div style={{ display: "inline-block", background: C.ochre, color: C.ink, fontFamily: SANS, fontWeight: 900, fontSize: 34, letterSpacing: 3, textTransform: "uppercase", padding: "12px 26px", borderRadius: 8, marginBottom: 34, maxWidth: CONTENT_W }}>{children}</div>
    </div>
  </Rise>
);

// Mots clés : le texte entre *astérisques* passe en ocre (« UNE *MARCHE* QUI CHANGE »)
export const Mots: React.FC<{ texte: string; accent?: string }> = ({ texte: t0, accent = C.ochre }) => {
  // Espaces insécables avant ? ! : ; (jamais de ponctuation seule sur une ligne)
  const texte = t0.replace(/ ([?!:;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0").replace(/(^|\s)(à|a|y|et|ou|de|du|le|la|un|en|au|À|A|Y|ET|OU|DE|DU|LE|LA|UN|EN|AU) /g, "$1$2\u00a0");
  return (
  <>
    {texte.split(/(\*[^*]+\*)/g).map((m, i) => (m.startsWith("*") && m.endsWith("*") ? <span key={i} style={{ color: accent }}>{m.slice(1, -1)}</span> : <React.Fragment key={i}>{m}</React.Fragment>))}
  </>
  );
};
const sansEtoiles = (t: string) => t.replace(/\*/g, "");

// Double soulignement centré (deux traits ocre de longueurs différentes, tracés l'un après l'autre)
const DoubleTrait: React.FC<{ delay?: number }> = ({ delay = 8 }) => {
  const frame = useCurrentFrame();
  const p1 = interpolate(frame - delay, [0, 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const p2 = interpolate(frame - delay - 4, [0, 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, marginTop: 40 }}>
      <div style={{ width: 300 * p1, height: 12, borderRadius: 6, background: C.ochre }} />
      <div style={{ width: 400 * p2, height: 12, borderRadius: 6, background: C.ochre }} />
    </div>
  );
};

// Trait de soulignement ocre (14 px, plein, sans halo)
const Souligne: React.FC<{ width?: number; delay?: number; color?: string }> = ({ width = 420, delay = 6, color = C.ochre }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <div style={{ width: width * p, height: 14, background: color, marginTop: 26, marginBottom: 26 }} />;
};

// ---------- éléments graphiques ----------
export const Bib: React.FC<{ top: string; number: string; bottom: string; small?: boolean; dark?: boolean }> = ({ top, number, bottom, small, dark }) => {
  const w = small ? 300 : 560;
  const bg = dark ? C.ink : C.paper;
  const fg = dark ? C.paper : C.ink;
  return (
    <div style={{ width: w, background: bg, borderRadius: small ? 22 : 34, overflow: "hidden", position: "relative" }}>
      <div style={{ background: C.green, color: C.paper, fontFamily: SANS, fontWeight: 800, fontSize: small ? 26 : 40, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", padding: small ? "10px 0" : "16px 0" }}>{top}</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: small ? 170 : 300, lineHeight: 1, color: fg, textAlign: "center", letterSpacing: -8, padding: small ? "10px 0" : "18px 0" }}>{number}</div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: small ? 22 : 32, letterSpacing: 2, textTransform: "uppercase", color: fg, textAlign: "center", paddingBottom: small ? 16 : 26 }}>{bottom}</div>
      {[0, 1].map((i) => (
        <div key={i} style={{ position: "absolute", top: small ? 58 : 84, [i ? "right" : "left"]: small ? 16 : 26, width: small ? 16 : 22, height: small ? 16 : 22, borderRadius: 20, background: C.green }} />
      ))}
    </div>
  );
};

const Gate: React.FC<{ color: string; p: number }> = ({ color, p }) => (
  <svg width={70} height={150} viewBox="0 0 70 150" style={{ flexShrink: 0 }}>
    <rect x={8} y={10} width={8} height={140} rx={3} fill={color} />
    <polygon points={`16,14 ${16 + 48 * p},34 16,58`} fill={color} />
  </svg>
);

const Tribune: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = 4;
  const cols = 15;
  const palette = [C.green, C.mid, C.sage, C.ochre, C.muted];
  const wavePos = ((frame % 75) / 75) * (cols + 6) - 3;
  return (
    <svg width={CONTENT_W} height={330} viewBox={`0 0 ${CONTENT_W} 330`}>
      {Array.from({ length: rows }).map((_, r) => {
        const y = 60 + r * 72;
        const inset = (rows - 1 - r) * 22;
        const rowW = CONTENT_W - inset * 2;
        return (
          <g key={r}>
            <rect x={inset - 10} y={y + 44} width={rowW + 20} height={16} rx={4} fill={C.line} />
            {Array.from({ length: cols }).map((__, c) => {
              const x = inset + (c + 0.5) * (rowW / cols);
              const appear = interpolate(frame - 8 - (r * cols + c) * 0.35, [0, 6], [0, 1], clamp);
              const d = Math.abs(c - wavePos);
              const lift = d < 1.6 ? Math.cos((d / 1.6) * (Math.PI / 2)) : 0;
              const col = palette[(r * 7 + c * 3) % palette.length];
              return (
                <g key={c} opacity={appear} transform={`translate(${x} ${y - lift * 18})`}>
                  <rect x={-14} y={8} width={28} height={36} rx={12} fill={col} />
                  <circle cx={0} cy={-2} r={11} fill={col} />
                  {lift > 0.3 && (
                    <>
                      <rect x={-20} y={-26} width={6} height={30} rx={3} fill={col} />
                      <rect x={14} y={-26} width={6} height={30} rx={3} fill={col} />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

const UnitGrid: React.FC<{ count: number; delay: number; shape: "screen" | "square"; color: string; outline: string }> = ({ count, delay, shape, color, outline }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: shape === "screen" ? 6 : 7, width: CONTENT_W }}>
      {Array.from({ length: count }).map((_, i) => {
        const on = interpolate(frame - delay - i * 0.3, [0, 3], [0, 1], clamp);
        return shape === "screen" ? (
          <div key={i} style={{ width: 24, height: 16, borderRadius: 3, border: `2px solid ${outline}`, background: on > 0.5 ? color : "transparent", opacity: 0.25 + on * 0.75 }} />
        ) : (
          <div key={i} style={{ width: 26, height: 26, borderRadius: 4, background: color, opacity: on }} />
        );
      })}
    </div>
  );
};

// ---------- scènes ----------
type P<T> = T & { theme: Theme };

export const Chrono: React.FC<P<{ kicker: string; label: string; value: number; unit: string; headline: string }>> = ({ theme, kicker, label, value, unit, headline }) => {
  const t = th(theme);
  const frame = useCurrentFrame();
  const blink = Math.floor(frame / 15) % 2 === 0 ? 1 : 0.25;
  return (
    <Frame theme={theme}>
      <Body top={400}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <Rise delay={2}>
          <div style={{ background: C.ink, borderRadius: 28, padding: "36px 44px", width: CONTENT_W }}>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 32, letterSpacing: 4, color: C.mutedOnGreen, display: "flex", alignItems: "center", gap: 16, textTransform: "uppercase" }}>
              <span style={{ width: 18, height: 18, borderRadius: 9, background: C.ochre, opacity: blink }} />
              {label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6 }}>
              <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 280, lineHeight: 1, color: C.paper, letterSpacing: TRACK_CHIFFRE }}>
                <Counter to={value} delay={2} dur={26} />
              </span>
              <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 90, color: C.paper }}>{unit}</span>
            </div>
          </div>
        </Rise>
        <Rise delay={30}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 76, lineHeight: 1.08, color: t.fg, marginTop: 30 }}>{headline}</div>
        </Rise>
      </Body>
    </Frame>
  );
};

export const TitleBib: React.FC<P<{ bib: { top: string; number: string; bottom: string }; title: string; logo?: string }>> = ({ theme, bib, title, logo }) => {
  const t = th(theme);
  return (
    <Frame theme={theme}>
      <Body top={330}>
        <Rise delay={3}>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <Bib {...bib} />
            {logo && <Img src={staticFile(logo)} style={{ width: 200, maxHeight: 200, objectFit: "contain" }} />}
          </div>
        </Rise>
        <Rise delay={16}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 82, lineHeight: 1.02, color: t.fg, marginTop: 60 }}>{title}</div>
        </Rise>
      </Body>
    </Frame>
  );
};

export const Calendar: React.FC<P<{ kicker: string; days: number; title: string; fromYear: string; toYear: string; yearsAt: number; yearsCaption: string }>> = ({ theme, kicker, days, title, fromYear, toYear, yearsAt, yearsCaption }) => {
  const t = th(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = useAt();
  const yp = interpolate(frame, [at(yearsAt), at(yearsAt + 1.6)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <Frame theme={theme}>
      <Body top={340}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
          {Array.from({ length: days }).map((_, i) => {
            const p = spring({ frame: frame - 6 - i * 2, fps, config: { damping: 16 } });
            return (
              <div key={i} style={{ height: 104, borderRadius: 10, background: C.green, opacity: p, scale: `${interpolate(p, [0, 1], [0.6, 1])}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 700, fontSize: 48, color: C.paper }}>
                {i + 1}
              </div>
            );
          })}
        </div>
        <Rise delay={30}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 72, lineHeight: 1.05, color: t.fg, marginTop: 44 }}>{title}</div>
        </Rise>
        <div style={{ marginTop: 90, opacity: interpolate(frame, [at(yearsAt - 0.2), at(yearsAt + 0.2)], [0, 1], clamp) }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SERIF, fontWeight: 900, fontSize: 96, color: t.fg }}>
            <span>{fromYear}</span>
            <span style={{ opacity: yp }}>{toYear}</span>
          </div>
          <div style={{ position: "relative", height: 10, background: t.rule, borderRadius: 5, marginTop: 10 }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${yp * 100}%`, background: C.green, borderRadius: 5 }} />
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: t.accent, marginTop: 22 }}>{yearsCaption}</div>
        </div>
      </Body>
    </Frame>
  );
};

const StatRow: React.FC<{ value: number; label: string; delay: number; color: string; rule: string; porte?: boolean }> = ({ value, label, delay, color, rule, porte }) => {
  const p = useEnter(delay);
  const chiffres = (value >= 10000 ? swiss(value) : plain(value)).length;
  const empile = chiffres > 3 || label.length > 14;
  const taille = chiffres <= 3 ? 190 : chiffres <= 5 ? 150 : chiffres <= 7 ? 120 : 96;
  return (
    <div style={{ opacity: p, translate: `${interpolate(p, [0, 1], [-60, 0])}px 0`, display: "flex", alignItems: "center", gap: 30, borderBottom: `3px solid ${rule}`, padding: "18px 0" }}>
      {porte && <Gate color={color} p={p} />}
      <div style={{ display: "flex", flexDirection: empile ? "column" : "row", alignItems: empile ? "flex-start" : "baseline", gap: empile ? 4 : 30, minWidth: 0 }}>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: taille, lineHeight: 1, color, letterSpacing: TRACK_CHIFFRE, whiteSpace: "nowrap", minWidth: empile ? 0 : 340 }}>
          <Counter to={value} delay={delay} />
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: empile ? 40 : 52, lineHeight: 1.15, color, maxWidth: 600 }}>{label}</div>
      </div>
    </div>
  );
};

export const Stats: React.FC<P<{ kicker: string; items: { value: number; label: string; at: number }[]; portes?: boolean }>> = ({ theme, kicker, items, portes }) => {
  const t = th(theme);
  const at = useAt();
  return (
    <Frame theme={theme}>
      <Body top={400}>
        <Kicker color={t.sub}>{kicker}</Kicker>
        {items.map((it) => (
          <StatRow key={it.label} value={it.value} label={it.label} delay={at(it.at)} color={t.fg} rule={t.rule} porte={portes} />
        ))}
      </Body>
    </Frame>
  );
};

export const Crowd: React.FC<P<{ kicker: string; live: { value: number; label: string; at: number }; screens: { value: number; label: string; at: number; note: string } }>> = ({ theme, kicker, live, screens }) => {
  const t = th(theme);
  const frame = useCurrentFrame();
  const at = useAt();
  const d1 = at(live.at);
  const d2 = at(screens.at);
  return (
    <Frame theme={theme}>
      <Body top={210}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <Rise delay={d1}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 140, color: t.fg, lineHeight: 1, letterSpacing: -4 }}>
            <Counter to={live.value} delay={d1} />
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: t.fg, marginTop: 4 }}>{live.label}</div>
        </Rise>
        <div style={{ marginTop: 30 }}>
          <Tribune />
        </div>
        <div style={{ marginTop: 10, opacity: interpolate(frame, [d2 - 4, d2 + 4], [0, 1], clamp) }}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 96, color: t.accent, lineHeight: 1, letterSpacing: -3 }}>
            <Counter to={screens.value} delay={d2} dur={36} /> millions
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: t.fg, marginTop: 4, marginBottom: 22 }}>{screens.label}</div>
          <UnitGrid count={screens.value} delay={d2} shape="screen" color={C.green} outline={t.fg} />
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: t.sub, marginTop: 12 }}>{screens.note}</div>
        </div>
      </Body>
    </Frame>
  );
};

// Taille selon la longueur totale ET le mot le plus long (en capitales, un long mot ne doit jamais sortir du cadre)
const tailleTexte = (t0: string) => {
  const t = sansEtoiles(t0).replace(/ ([?!:;»])/g, "$1");
  const base = t.length <= 30 ? 124 : t.length <= 50 ? 106 : t.length <= 70 ? 90 : t.length <= 120 ? 70 : 58;
  const mot = Math.max(...t.split(/\s+/).map((m) => m.length));
  return Math.min(base, Math.floor(CONTENT_W / (mot * 0.68)));
};
export const Statement: React.FC<P<{ text: string; kicker?: string }>> = ({ theme, text, kicker }) => {
  const court = sansEtoiles(text).length <= 70;
  return (
    <Frame theme={theme}>
      <Body top={court ? 520 : 400}>
        {kicker && <Kicker center>{kicker}</Kicker>}
        <Rise delay={2}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: tailleTexte(text), lineHeight: 1.04, color: C.paper, letterSpacing: "-0.01em", textTransform: court ? "uppercase" : "none", whiteSpace: "pre-line", textAlign: "center" }}>
            <Mots texte={text} />
          </div>
        </Rise>
        <DoubleTrait delay={10} />
      </Body>
    </Frame>
  );
};

export const BigFigure: React.FC<P<{ kicker: string; prefix?: string; value: number; label: string; at: number; grid?: { count: number; value: number; label: string; note: string; at: number } }>> = ({ theme, kicker, prefix, value, label, at: a1, grid }) => {
  const t = th(theme);
  const at = useAt();
  const d1 = at(a1);
  const n = String(Math.round(value)).length;
  // Taille du grand chiffre : jamais plus large que la zone de contenu (séparateur de milliers compris)
  const car = n + (value >= 10000 ? Math.floor((n - 1) / 3) * 0.4 : 0) + (Number.isInteger(value) ? 0 : 2);
  const taille = Math.min(n <= 3 ? 340 : 250, Math.floor(CONTENT_W / (car * 0.66)));
  return (
    <Frame theme={theme}>
      <Body top={grid ? 300 : 470}>
        <Kicker center color={t.accent}>{kicker}</Kicker>
        <Rise delay={d1}>
          <div style={{ textAlign: "center" }}>
            {prefix && <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 48, color: C.sage, textTransform: "uppercase", letterSpacing: 2 }}>{prefix}</div>}
            <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: taille, lineHeight: 0.95, color: C.ochre, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>
              <Counter to={value} delay={d1} dur={21} />
            </div>
            <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: label.length <= 24 ? 64 : 46, lineHeight: 1.1, color: C.paper, textTransform: "uppercase", marginTop: 18 }}>{label}</div>
          </div>
        </Rise>
        {grid && (
          <div style={{ marginTop: 80 }}>
            <UnitGrid count={grid.count} delay={at(grid.at)} shape="square" color={C.green} outline={t.fg} />
            <Rise delay={at(grid.at) + 10}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 24 }}>
                <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 110, color: t.accent, letterSpacing: -3 }}>
                  <Counter to={grid.value} delay={at(grid.at)} dur={30} grouped={false} />
                </span>
                <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: t.fg }}>{grid.label}</span>
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 30, color: t.sub }}>{grid.note}</div>
            </Rise>
          </div>
        )}
      </Body>
    </Frame>
  );
};

export const Finish: React.FC<P<{ arch: string; place: string; intro: string; value: number; unit: string; at: number; share: number; shareAt: number; shareLabel: string }>> = ({ theme, arch, place, intro, value, unit, at: a1, share, shareAt, shareLabel }) => {
  const t = th(theme);
  const frame = useCurrentFrame();
  const at = useAt();
  const d1 = at(a1);
  const d2 = at(shareAt);
  const s = interpolate(frame, [d2, d2 + 24], [0, share], { ...clamp, easing: Easing.out(Easing.cubic) });
  const R = 230;
  const circ = 2 * Math.PI * R;
  return (
    <Frame theme={theme}>
      <Body top={200}>
        <Rise delay={2}>
          <div style={{ marginBottom: 30 }}>
            <svg width={CONTENT_W} height={200} viewBox={`0 0 ${CONTENT_W} 200`}>
              <rect x={20} y={20} width={26} height={180} rx={6} fill={t.fg} />
              <rect x={CONTENT_W - 46} y={20} width={26} height={180} rx={6} fill={t.fg} />
              <rect x={20} y={20} width={CONTENT_W - 40} height={90} rx={12} fill={t.fg} />
              <text x={CONTENT_W / 2} y={84} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={58} letterSpacing={10} fill={t.bg}>{arch}</text>
            </svg>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 32, letterSpacing: 4, color: t.sub, textTransform: "uppercase", marginTop: 14 }}>{place}</div>
          </div>
        </Rise>
        <Rise delay={8}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 68, lineHeight: 1.04, color: t.fg }}>{intro}</div>
        </Rise>
        <Rise delay={d1}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 190, lineHeight: 1, color: t.fg, letterSpacing: -5 }}>
            <Counter to={value} delay={d1} /> {unit}
          </div>
        </Rise>
        <div style={{ display: "flex", alignItems: "center", gap: 50, marginTop: 30, opacity: interpolate(frame, [d2 - 6, d2], [0, 1], clamp) }}>
          <svg width={400} height={400} viewBox="0 0 520 520">
            <circle cx={260} cy={260} r={R} fill="none" stroke={t.rule} strokeWidth={60} />
            <circle cx={260} cy={260} r={R} fill="none" stroke={t.fg} strokeWidth={60} strokeDasharray={`${circ * s} ${circ}`} transform="rotate(-90 260 260)" />
            <text x={260} y={295} textAnchor="middle" fontFamily={SERIF} fontWeight={900} fontSize={120} fill={t.fg}>{Math.round(s * 100)}%</text>
          </svg>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, lineHeight: 1.2, color: t.fg, width: 300 }}>{shareLabel}</div>
        </div>
      </Body>
    </Frame>
  );
};

export const Person: React.FC<P<{ kicker: string; name: string; bib: { top: string; number: string; bottom: string }; bio: string; quote: string; quoteAt: number; quoteSource: string }>> = ({ theme, kicker, name, bib, bio, quote, quoteAt, quoteSource }) => {
  const t = th(theme);
  const at = useAt();
  return (
    <Frame theme={theme}>
      <Body top={380}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <Rise delay={20}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 130, lineHeight: 1, color: t.fg, letterSpacing: -3 }}>{name}</div>
        </Rise>
        <Rise delay={40}>
          <div style={{ display: "flex", gap: 40, marginTop: 40, alignItems: "center" }}>
            <Bib {...bib} small dark={theme === "paper"} />
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, lineHeight: 1.25, color: t.fg, width: 360 }}>{bio}</div>
          </div>
        </Rise>
        <Rise delay={at(quoteAt)}>
          <div style={{ marginTop: 70, borderLeft: `10px solid ${t.accent}`, paddingLeft: 40 }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 78, lineHeight: 1.1, color: t.fg }}>{quote}</div>
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 32, color: t.sub, marginTop: 20 }}>{quoteSource}</div>
          </div>
        </Rise>
      </Body>
    </Frame>
  );
};

export const Recap: React.FC<P<{ kicker: string; items: { n: string; label: string; at: number }[] }>> = ({ theme, kicker, items }) => {
  const t = th(theme);
  const at = useAt();
  return (
    <Frame theme={theme}>
      <Body top={420}>
        <Kicker color={t.sub} delay={2}>{kicker}</Kicker>
        {items.map((it) => (
          <Rise key={it.label} delay={at(it.at)}>
            <div style={{ display: "flex", alignItems: "center", gap: 40, borderBottom: `3px solid ${t.rule}`, padding: "30px 0" }}>
              <span style={{ flexShrink: 0, width: 92, height: 92, borderRadius: 46, background: C.sage, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 52, color: C.green }}>{it.n}</span>
              <span style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 54, color: t.fg, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{it.label}</span>
            </div>
          </Rise>
        ))}
      </Body>
    </Frame>
  );
};

// Photo (licence libre) : image sur le haut de l'écran fondue dans le fond, titre centré, carte « nom / rôle » facultative, crédit en petit
export const Photo: React.FC<P<{ src: string; credit: string; kicker?: string; title?: string; nom?: string; role?: string }>> = ({ theme, src, credit, kicker, title, nom, role }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.1]);
  const carte = interpolate(frame, [10, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <Frame theme={theme}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1250, overflow: "hidden", WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)", maskImage: "linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: `${zoom}` }} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(16,36,31,0.4) 0%, rgba(16,36,31,0) 25%)" }} />
      </div>
      {nom && (
        <div style={{ position: "absolute", left: 0, top: 770, opacity: carte, translate: `${(1 - carte) * -40}px 0`, background: "rgba(16,36,31,0.92)", borderLeft: `14px solid ${C.ochre}`, padding: "22px 40px 22px 70px", borderRadius: "0 12px 12px 0", maxWidth: 820 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 56, color: C.paper, textTransform: "uppercase", lineHeight: 1 }}>{nom}</div>
          {role && <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 32, color: C.ochre, textTransform: "uppercase", letterSpacing: 2, marginTop: 10 }}>{role}</div>}
        </div>
      )}
      {(kicker || title) && (
        <Body top={1030}>
          {kicker && <Kicker center>{kicker}</Kicker>}
          {title && (
            <Rise delay={8}>
              <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: sansEtoiles(title).length <= 18 ? 92 : sansEtoiles(title).length <= 32 ? 72 : 58, lineHeight: 1.04, color: C.paper, textTransform: "uppercase", textAlign: "center", maxHeight: 200, overflow: "hidden" }}>
                <Mots texte={title} />
              </div>
            </Rise>
          )}
        </Body>
      )}
      <div style={{ position: "absolute", left: PAD, width: CONTENT_W, top: 1470, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 22, lineHeight: 1.3, color: "rgba(245,242,234,0.55)" }}>{credit}</div>
    </Frame>
  );
};

// Photo ronde : image découpée en cercle, cerclée d'ocre, avec titre centré dessous
export const PhotoRonde: React.FC<P<{ src: string; credit: string; kicker?: string; title?: string; legende?: string }>> = ({ theme, src, credit, kicker, title, legende }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [2, 16], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const anneau = interpolate(frame, [8, 26], [0, 360], { ...clamp, easing: Easing.out(Easing.cubic) });
  const zoom = interpolate(frame, [0, durationInFrames], [1.05, 1.15]);
  const D = 460;
  return (
    <Frame theme={theme}>
      <div style={{ position: "absolute", left: PAD + CONTENT_W / 2 - D / 2, top: 380, width: D, height: D }}>
        <svg width={D + 40} height={D + 40} style={{ position: "absolute", left: -20, top: -20 }}>
          <circle cx={(D + 40) / 2} cy={(D + 40) / 2} r={D / 2 + 10} fill="none" stroke={C.ochre} strokeWidth={12} strokeDasharray={`${(anneau / 360) * Math.PI * (D + 20)} 9999`} transform={`rotate(-90 ${(D + 40) / 2} ${(D + 40) / 2})`} strokeLinecap="round" />
        </svg>
        <div style={{ width: D, height: D, borderRadius: "50%", overflow: "hidden", scale: `${0.85 + 0.15 * p}`, opacity: p }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: `${zoom}` }} />
        </div>
      </div>
      <Body top={880}>
        {kicker && <Kicker center>{kicker}</Kicker>}
        {title && (
          <Rise delay={10}>
            <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: sansEtoiles(title).length <= 20 ? 88 : 66, lineHeight: 1.04, color: C.paper, textTransform: "uppercase", textAlign: "center" }}>
              <Mots texte={title} />
            </div>
          </Rise>
        )}
        {legende && (
          <Rise delay={16}>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: C.sage, textAlign: "center", marginTop: 20 }}>{legende}</div>
          </Rise>
        )}
      </Body>
      <div style={{ position: "absolute", left: PAD, width: CONTENT_W, top: 1470, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 22, color: "rgba(245,242,234,0.55)" }}>{credit}</div>
    </Frame>
  );
};

// Écran de fin : retour des barres, logo, baseline, maintien
// Visuel IA plein écran (peut sortir de la charte pour coller à l'actualité), toujours légendé
export const Illustration: React.FC<P<{ src: string; video?: boolean; duree?: number; kicker?: string; title?: string }>> = ({ theme, src, video, duree, kicker, title }) => (
  <FondContext.Provider value={{ src, video, duree, libre: true }}>
    <Frame theme={theme}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(17,26,25,0.35) 0%, rgba(17,26,25,0) 30%, rgba(17,26,25,0) 50%, rgba(17,26,25,0.75) 75%, rgba(17,26,25,0.9) 100%)" }} />
      {(kicker || title) && (
        <Body top={980}>
          {kicker && <Kicker>{kicker}</Kicker>}
          {title && (
            <Rise delay={8}>
              <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: title.length <= 18 ? 96 : title.length <= 32 ? 74 : 60, lineHeight: 1.02, color: C.paper, letterSpacing: TRACK_TITRE, textTransform: "uppercase", maxHeight: 220, overflow: "hidden" }}>{title}</div>
            </Rise>
          )}
        </Body>
      )}
    </Frame>
  </FondContext.Provider>
);

export const Outro: React.FC<P<{ tagline?: string; cta?: string; sources: string }>> = ({ cta, sources }) => (
  <Frame theme="green">
    <Body top={420}>
      <div style={{ marginLeft: 30 }}>
        <Mark h={180} colors={[C.sage, C.ochre, C.paper]} delays={[4, 6.4, 8.8]} />
      </div>
      <Rise delay={12}>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 152, color: C.white, lineHeight: 1, letterSpacing: TRACK_TITRE, marginTop: 50 }}>LE POULS</div>
      </Rise>
      <Souligne width={630} delay={18} />
      <Rise delay={22}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 51, color: C.paper, letterSpacing: 1 }}>SENTIR L’ACTUALITÉ</div>
      </Rise>
      {cta && <Rise delay={34}>
        <div style={{ display: "inline-block", marginTop: 70, background: C.ochre, color: C.ink, fontFamily: SANS, fontWeight: 800, fontSize: 40, padding: "20px 34px", borderRadius: 12 }}>{cta}</div>
      </Rise>}
      <Rise delay={46}>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.sage, marginTop: 60, lineHeight: 1.4 }}>{sources}</div>
      </Rise>
    </Body>
  </Frame>
);

// ---------- Votations ----------
export const Ballot: React.FC<P<{ kicker: string; date: string; niveau: string; question: string }>> = ({ theme, kicker, date, niveau, question }) => {
  const t = th(theme);
  const frame = useCurrentFrame();
  const drop = interpolate(frame, [10, 34], [-170, 40], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const fade = interpolate(frame, [30, 38], [1, 0], clamp);
  return (
    <Frame theme={theme}>
      <Body top={260}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <div style={{ position: "relative", height: 380, width: CONTENT_W }}>
          <svg width={CONTENT_W} height={380} viewBox={`0 0 ${CONTENT_W} 380`} style={{ position: "absolute", inset: 0 }}>
            <g transform={`translate(${CONTENT_W / 2 - 110} ${drop})`} opacity={fade}>
              <rect width={220} height={150} rx={8} fill={C.white} stroke={t.fg} strokeWidth={4} />
              <rect x={30} y={34} width={160} height={10} rx={5} fill={t.sub} />
              <rect x={30} y={62} width={120} height={10} rx={5} fill={t.sub} />
              <rect x={30} y={96} width={34} height={34} rx={6} fill="none" stroke={t.fg} strokeWidth={4} />
              <rect x={120} y={96} width={34} height={34} rx={6} fill="none" stroke={t.fg} strokeWidth={4} />
            </g>
            <rect x={CONTENT_W / 2 - 230} y={150} width={460} height={220} rx={18} fill={t.fg} />
            <rect x={CONTENT_W / 2 - 130} y={170} width={260} height={16} rx={8} fill={t.bg} />
            <text x={CONTENT_W / 2} y={300} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={44} letterSpacing={6} fill={t.bg}>{niveau.toUpperCase()}</text>
          </svg>
        </div>
        <Rise delay={30}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 104, lineHeight: 1, color: t.fg, marginTop: 30, letterSpacing: TRACK_TITRE, textTransform: "uppercase" }}>{date}</div>
        </Rise>
        <Souligne width={420} delay={36} />
        <Rise delay={44}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 50, lineHeight: 1.1, color: t.fg, marginTop: 24 }}>{question}</div>
        </Rise>
      </Body>
    </Frame>
  );
};

// Pour et contre : deux colonnes STRICTEMENT identiques (même couleur, même taille, même rythme)
export const Versus: React.FC<P<{ kicker: string; pour: { titre?: string; points: string[]; at: number }; contre: { titre?: string; points: string[]; at: number }; note?: string }>> = ({ theme, kicker, pour, contre, note }) => {
  const t = th(theme);
  const at = useAt();
  const Col: React.FC<{ titre: string; points: string[]; a: number }> = ({ titre, points, a }) => (
    <div style={{ flex: 1, background: C.white, borderRadius: 16, overflow: "hidden", minHeight: 640 }}>
      <div style={{ height: 20, background: C.ochre }} />
      <div style={{ padding: "26px 26px 30px" }}>
        <Rise delay={at(a)}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 64, color: C.green, lineHeight: 1, letterSpacing: TRACK_TITRE, textTransform: "uppercase" }}>{titre}</div>
        </Rise>
        <div style={{ height: 3, background: C.softgrey, margin: "24px 0 6px" }} />
        {points.map((p, i) => (
          <Rise key={i} delay={at(a) + 12 + i * 14}>
            <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
              <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 10, background: C.mid, marginTop: 10 }} />
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 33, lineHeight: 1.2, color: C.ink }}>{p}</span>
            </div>
          </Rise>
        ))}
      </div>
    </div>
  );
  return (
    <Frame theme={theme}>
      <Body top={240}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <div style={{ display: "flex", gap: 40 }}>
          <Col titre={pour.titre || "Oui"} points={pour.points} a={pour.at} />
          <Col titre={contre.titre || "Non"} points={contre.points} a={contre.at} />
        </div>
        {note && <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: t.sub, marginTop: 18 }}>{note}</div>}
      </Body>
    </Frame>
  );
};


// ---------- Carte du Valais (communes réelles, géodonnées swisstopo via swiss-maps) ----------
const normNom = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const COMMUNES = VALAIS.communes as Record<string, { x: number; y: number; d: string }>;
export const trouverCommune = (nom: string) => {
  const n = normNom(nom);
  const cles = Object.keys(COMMUNES);
  const k = cles.find((c) => normNom(c) === n) || cles.find((c) => normNom(c).startsWith(n) || n.startsWith(normNom(c))) || cles.find((c) => normNom(c).includes(n));
  return k ? { nom: k, ...COMMUNES[k] } : null;
};
const REPERES = ["Monthey", "Martigny", "Sion", "Sierre", "Visp", "Brig-Glis"];

export const Carte: React.FC<P<{ kicker: string; communes: string[]; titre?: string; zoom?: number; at?: number }>> = ({ theme, kicker, communes, titre, zoom = 1.8, at: a1 = 0.6 }) => {
  const t = th(theme);
  const frame = useCurrentFrame();
  const at = useAt();
  const cibles = communes.map(trouverCommune).filter(Boolean) as { nom: string; x: number; y: number; d: string }[];
  const cx = cibles.length ? cibles.reduce((s, c) => s + c.x, 0) / cibles.length : VALAIS.w / 2;
  const cy = cibles.length ? cibles.reduce((s, c) => s + c.y, 0) / cibles.length : VALAIS.h / 2;
  const z = cibles.length ? zoom : 1;
  const p = interpolate(frame, [at(a1), at(a1) + 30], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const echelle = 1 + (z - 1) * p;
  const W = CONTENT_W;
  const H = Math.round((VALAIS.h / VALAIS.w) * W);
  // Zoom progressif centré sur la (les) commune(s)
  const centreX = VALAIS.w / 2 + (cx - VALAIS.w / 2) * p;
  const centreY = VALAIS.h / 2 + (cy - VALAIS.h / 2) * p;
  const fondCanton = theme === "green" ? C.mid : "#B1C9BA";
  const surbrillance = C.ochre;
  const pulse = 1;
  return (
    <Frame theme={theme}>
      <Body top={380}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <div style={{ width: W, height: H, overflow: "hidden", borderRadius: 18, marginBottom: 40, background: theme === "green" ? C.greenDark : "#E4EAE4" }}>
          <svg width={W} height={H} viewBox={`0 0 ${VALAIS.w} ${VALAIS.h}`}>
            <g transform={`translate(${VALAIS.w / 2} ${VALAIS.h / 2}) scale(${echelle}) translate(${-centreX} ${-centreY})`}>
              <path d={VALAIS.canton} fill={fondCanton} stroke={theme === "green" ? C.sage : C.mid} strokeWidth={4 / echelle} />
              {VALAIS.lacs.map((d: string, i: number) => <path key={i} d={d} fill="#B9D3DE" />)}
              {Object.values(COMMUNES).map((c, i) => <path key={i} d={c.d} fill="none" stroke={t.fg} strokeOpacity={0.12} strokeWidth={1 / echelle} />)}
              {cibles.map((c, i) => (
                <path key={c.nom} d={c.d} fill={surbrillance} opacity={interpolate(frame, [at(a1) + 10 + i * 6, at(a1) + 24 + i * 6], [0, 1], clamp)} />
              ))}
              {REPERES.filter((r) => !cibles.some((c) => c.nom === r)).map((r) => {
                const c = COMMUNES[r];
                return c ? (
                  <g key={r} opacity={0.55}>
                    <circle cx={c.x} cy={c.y} r={4 / echelle} fill={t.fg} />
                    <text x={r === "Visp" ? c.x - 8 / echelle : c.x + 8 / echelle} y={r === "Visp" ? c.y + 22 / echelle : c.y + 5 / echelle} textAnchor={r === "Visp" ? "end" : "start"} fontFamily={SANS} fontWeight={500} fontSize={18 / echelle} fill={t.fg}>{r === "Brig-Glis" ? "Brigue" : r === "Visp" ? "Viège" : r}</text>
                  </g>
                ) : null;
              })}
              {cibles.map((c) => (
                <g key={"p" + c.nom} opacity={p}>
                  <circle cx={c.x} cy={c.y} r={(10 * pulse) / echelle} fill={C.ochre} stroke={C.green} strokeWidth={4 / echelle} />
                </g>
              ))}
            </g>
          </svg>
        </div>
        <Rise delay={at(a1) + 24}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 92, lineHeight: 1, color: t.fg, letterSpacing: -2 }}>{cibles.map((c) => c.nom).join(", ") || communes.join(", ")}</div>
          {titre && <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, lineHeight: 1.2, color: t.fg, marginTop: 14 }}>{titre}</div>}
        </Rise>
      </Body>
    </Frame>
  );
};

// ---------- Frise chronologique ----------
export const Frise: React.FC<P<{ kicker: string; items: { date: string; label: string; at: number }[] }>> = ({ theme, kicker, items }) => {
  const t = th(theme);
  const frame = useCurrentFrame();
  const at = useAt();
  const dernier = items.length ? at(items[items.length - 1].at) + 10 : 10;
  const ligne = interpolate(frame, [at(items[0]?.at || 0), dernier], [0, 1], clamp);
  return (
    <Frame theme={theme}>
      <Body top={400}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <div style={{ position: "relative", paddingLeft: 70 }}>
          <div style={{ position: "absolute", left: 22, top: 20, width: 8, height: `calc(${ligne * 100}% - 40px)`, background: t.accent, borderRadius: 4 }} />
          {items.map((it, i) => {
            const p = spring({ frame: frame - at(it.at), fps: 30, config: { damping: 16 } });
            return (
              <div key={i} style={{ position: "relative", marginBottom: 64, opacity: p, translate: `${interpolate(p, [0, 1], [40, 0])}px 0` }}>
                <div style={{ position: "absolute", left: -66, top: 14, width: 44, height: 44, borderRadius: 22, background: t.bg, border: `8px solid ${t.accent}` }} />
                <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, letterSpacing: 2, textTransform: "uppercase", color: t.sub }}>{it.date}</div>
                <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 72, lineHeight: 1.08, color: t.fg, marginTop: 6 }}>{it.label}</div>
              </div>
            );
          })}
        </div>
      </Body>
    </Frame>
  );
};

// ---------- Comparaison en barres ----------
export const Barres: React.FC<P<{ kicker: string; items: { label: string; value: number; at: number; accent?: boolean }[]; unite?: string; note?: string }>> = ({ theme, kicker, items, unite = "", note }) => {
  const t = th(theme);
  const frame = useCurrentFrame();
  const at = useAt();
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <Frame theme={theme}>
      <Body top={420}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        {items.map((it, i) => {
          const p = interpolate(frame, [at(it.at), at(it.at) + 22], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          const couleur = t.fg;
          return (
            <div key={i} style={{ marginBottom: 56, opacity: interpolate(p, [0, 0.2], [0, 1], clamp) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: t.fg }}>{it.label}</span>
                <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 76, color: couleur }}>
                  <Counter to={it.value} delay={at(it.at)} /> {unite}
                </span>
              </div>
              <div style={{ height: 70, background: t.rule, borderRadius: 12, marginTop: 10 }}>
                <div style={{ height: 70, width: `${(it.value / max) * 100 * p}%`, background: it.accent ? C.ochre : t.data, borderRadius: 10 }} />
              </div>
            </div>
          );
        })}
        {note && <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: t.sub, marginTop: 10 }}>{note}</div>}
      </Body>
    </Frame>
  );
};

// ---------- Avant / après ----------
export const AvantApres: React.FC<P<{ kicker: string; avant: { label: string; value: number }; apres: { label: string; value: number }; unite?: string; at: number }>> = ({ theme, kicker, avant, apres, unite = "", at: a1 }) => {
  const t = th(theme);
  const at = useAt();
  const d = at(a1);
  const variation = avant.value ? ((apres.value - avant.value) / avant.value) * 100 : 0;
  const Bloc: React.FC<{ b: { label: string; value: number }; delay: number; fort?: boolean; depart?: number }> = ({ b, delay, fort, depart = 0 }) => (
    <Rise delay={delay}>
      <div style={{ border: `4px solid ${t.fg}`, background: fort ? t.fg : "transparent", borderRadius: 24, padding: "40px 34px" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, letterSpacing: 2, textTransform: "uppercase", color: fort ? t.bg : t.sub }}>{b.label}</div>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 150, lineHeight: 1, color: fort ? t.bg : t.fg, letterSpacing: -3, whiteSpace: "nowrap", marginTop: 10 }}>
          <Counter to={b.value} from={depart} delay={delay} dur={14} /> <span style={{ fontSize: 56 }}>{unite}</span>
        </div>
      </div>
    </Rise>
  );
  return (
    <Frame theme={theme}>
      <Body top={380}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <Bloc b={avant} delay={d} />
        <Rise delay={d + 8}>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 110, color: t.accent, textAlign: "center", margin: "30px 0" }}>
            ↓ {unite.includes("%") ? `${apres.value - avant.value > 0 ? "+" : ""}${(Math.round((apres.value - avant.value) * 10) / 10).toString().replace(".", ",")} point${Math.abs(apres.value - avant.value) >= 2 ? "s" : ""}` : `${variation > 0 ? "+" : ""}${Math.round(variation)} %`}
          </div>
        </Rise>
        <Bloc b={apres} delay={d + 12} fort depart={avant.value} />
      </Body>
    </Frame>
  );
};

export const SCENE_TYPES: Record<string, React.FC<any>> = {
  chrono: Chrono,
  titleBib: TitleBib,
  calendar: Calendar,
  stats: Stats,
  crowd: Crowd,
  statement: Statement,
  bigFigure: BigFigure,
  finish: Finish,
  person: Person,
  recap: Recap,
  photo: Photo,
  outro: Outro,
  ballot: Ballot,
  versus: Versus,
  carte: Carte,
  frise: Frise,
  barres: Barres,
  avantApres: AvantApres,
  illustration: Illustration,
  photoRonde: PhotoRonde,
};
// Scènes sans sous-titres (le texte à l'écran reprend déjà la voix)
export const NO_CAPTIONS = new Set(["statement", "outro"]);
