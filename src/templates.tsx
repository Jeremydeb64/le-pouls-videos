// Modèles de scènes Le Pouls (charte E « Éditorial papier »).
// Chaque scène reçoit ses props depuis le fichier d'épisode JSON. Les temps « at » sont en secondes depuis le début de la scène.
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";

export const C = {
  paper: "#EFEBE3",
  ink: "#15171A",
  green: "#1E5B4F",
  greenDark: "#16463D",
  muted: "#6B6860",
  line: "#D8D2C5",
  mutedOnGreen: "#A9C2BA",
};
export const SERIF = "Fraunces";
export const SANS = "InterTight";
export const PAD = 90;
export const CONTENT_W = 1080 - PAD - 160; // ~160 px libres à droite (icônes TikTok)

export const fontFaces = `
@font-face{font-family:'Fraunces';src:url('${staticFile("fraunces-700.woff2")}') format('woff2');font-weight:700;}
@font-face{font-family:'Fraunces';src:url('${staticFile("fraunces-900.woff2")}') format('woff2');font-weight:900;}
@font-face{font-family:'InterTight';src:url('${staticFile("inter-500.woff2")}') format('woff2');font-weight:500;}
@font-face{font-family:'InterTight';src:url('${staticFile("inter-800.woff2")}') format('woff2');font-weight:800;}
`;

type Theme = "paper" | "green";
const th = (t: Theme) =>
  t === "green"
    ? { bg: C.green, fg: C.paper, accent: C.paper, sub: C.mutedOnGreen, rule: C.greenDark }
    : { bg: C.paper, fg: C.ink, accent: C.green, sub: C.muted, rule: C.line };

// ---------- primitives ----------
const useAt = () => {
  const { fps } = useVideoConfig();
  return (sec = 0) => Math.round(sec * fps);
};
const useEnter = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.7 } });
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Rise: React.FC<{ delay?: number; dist?: number; children: React.ReactNode }> = ({ delay = 0, dist = 60, children }) => {
  const p = useEnter(delay);
  return <div style={{ opacity: p, translate: `0 ${interpolate(p, [0, 1], [dist, 0])}px` }}>{children}</div>;
};

export const swiss = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "’");
const plain = (n: number) => Math.round(n).toString();

const Counter: React.FC<{ to: number; delay?: number; dur?: number; grouped?: boolean }> = ({ to, delay = 0, dur = 22, grouped = true }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame - delay, [0, dur], [0, to], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <>{(grouped && to >= 10000 ? swiss : plain)(v)}</>;
};

const Frame: React.FC<{ theme: Theme; children: React.ReactNode }> = ({ theme, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 9], [100, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <AbsoluteFill style={{ backgroundColor: th(theme).bg, clipPath: `inset(${p}% 0 0 0)` }}>{children}</AbsoluteFill>;
};

const Body: React.FC<{ top?: number; children: React.ReactNode }> = ({ top = 300, children }) => (
  <div style={{ position: "absolute", left: PAD, top, width: CONTENT_W }}>{children}</div>
);

const Kicker: React.FC<{ color: string; delay?: number; children: React.ReactNode }> = ({ color, delay = 4, children }) => (
  <Rise delay={delay} dist={20}>
    <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, letterSpacing: 5, textTransform: "uppercase", color, marginBottom: 28 }}>{children}</div>
  </Rise>
);

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
  const palette = [C.ink, C.green, C.muted, C.greenDark, "#B9B2A3"];
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
              <span style={{ width: 18, height: 18, borderRadius: 9, background: "#7FD1B9", opacity: blink }} />
              {label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6 }}>
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 300, lineHeight: 1, color: C.paper, letterSpacing: -12 }}>
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

const StatRow: React.FC<{ value: number; label: string; delay: number; color: string; rule: string }> = ({ value, label, delay, color, rule }) => {
  const p = useEnter(delay);
  return (
    <div style={{ opacity: p, translate: `${interpolate(p, [0, 1], [-60, 0])}px 0`, display: "flex", alignItems: "center", gap: 30, borderBottom: `3px solid ${rule}`, padding: "18px 0" }}>
      <Gate color={color} p={p} />
      <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 190, lineHeight: 1, color, width: 380, letterSpacing: -6 }}>
        <Counter to={value} delay={delay} />
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 58, color }}>{label}</div>
    </div>
  );
};

export const Stats: React.FC<P<{ kicker: string; items: { value: number; label: string; at: number }[] }>> = ({ theme, kicker, items }) => {
  const t = th(theme);
  const at = useAt();
  return (
    <Frame theme={theme}>
      <Body top={400}>
        <Kicker color={t.sub}>{kicker}</Kicker>
        {items.map((it) => (
          <StatRow key={it.label} value={it.value} label={it.label} delay={at(it.at)} color={t.fg} rule={t.rule} />
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

export const Statement: React.FC<P<{ text: string }>> = ({ theme, text }) => (
  <Frame theme={theme}>
    <Body top={640}>
      <Rise delay={2}>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 140, lineHeight: 0.98, color: th(theme).fg, letterSpacing: -3 }}>{text}</div>
      </Rise>
    </Body>
  </Frame>
);

export const BigFigure: React.FC<P<{ kicker: string; prefix?: string; value: number; label: string; at: number; grid?: { count: number; value: number; label: string; note: string; at: number } }>> = ({ theme, kicker, prefix, value, label, at: a1, grid }) => {
  const t = th(theme);
  const at = useAt();
  const d1 = at(a1);
  return (
    <Frame theme={theme}>
      <Body top={240}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <Rise delay={d1}>
          {prefix && <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: t.sub }}>{prefix}</div>}
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 330, lineHeight: 0.9, color: t.fg, letterSpacing: -10 }}>
            <Counter to={value} delay={d1} dur={30} />
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: t.fg }}>{label}</div>
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 30, borderBottom: `3px solid ${t.rule}`, padding: "20px 0" }}>
              <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 170, color: t.fg, width: 300, lineHeight: 1 }}>{it.n}</span>
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 54, color: t.fg, lineHeight: 1.1 }}>{it.label}</span>
            </div>
          </Rise>
        ))}
      </Body>
    </Frame>
  );
};

// Photo plein écran (licence libre ou photothèque autorisée), crédit obligatoire en petit
export const Photo: React.FC<P<{ src: string; credit: string; kicker?: string; title?: string }>> = ({ theme, src, credit, kicker, title }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.12]);
  return (
    <Frame theme={theme}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: `${zoom}` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(21,23,26,0.6) 0%, rgba(21,23,26,0) 22%, rgba(21,23,26,0) 38%, rgba(21,23,26,0.82) 62%, rgba(21,23,26,0.9) 100%)" }} />
      {(kicker || title) && (
        <Body top={1040}>
          {kicker && <Kicker color={C.paper}>{kicker}</Kicker>}
          {title && (
            <Rise delay={8}>
              <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 104, lineHeight: 1, color: C.paper, letterSpacing: -2 }}>{title}</div>
            </Rise>
          )}
        </Body>
      )}
      <div style={{ position: "absolute", right: 40, top: 118, maxWidth: 520, textAlign: "right", fontFamily: SANS, fontWeight: 500, fontSize: 22, lineHeight: 1.3, color: "rgba(239,235,227,0.9)" }}>{credit}</div>
    </Frame>
  );
};

export const Outro: React.FC<P<{ tagline: string; cta: string; sources: string }>> = ({ theme, tagline, cta, sources }) => {
  const t = th(theme);
  return (
    <Frame theme={theme}>
      <Body top={420}>
        <Rise delay={3}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 200, color: t.accent, letterSpacing: -14, lineHeight: 1 }}>///</div>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 150, color: t.fg, lineHeight: 1, marginTop: 10 }}>Le Pouls</div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 40, color: t.sub, marginTop: 14 }}>{tagline}</div>
        </Rise>
        <Rise delay={30}>
          <div style={{ display: "inline-block", marginTop: 60, background: C.green, color: C.paper, fontFamily: SANS, fontWeight: 800, fontSize: 46, padding: "22px 40px", borderRadius: 60 }}>{cta}</div>
        </Rise>
        <Rise delay={50}>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: t.sub, marginTop: 70, lineHeight: 1.4 }}>{sources}</div>
        </Rise>
      </Body>
    </Frame>
  );
};


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
              <rect width={220} height={150} rx={8} fill={t.bg === C.paper ? "#FFFFFF" : C.paper} stroke={t.fg} strokeWidth={4} />
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
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 110, lineHeight: 1, color: t.fg, marginTop: 30, letterSpacing: -2 }}>{date}</div>
        </Rise>
        <Rise delay={44}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 60, lineHeight: 1.1, color: t.fg, marginTop: 24 }}>{question}</div>
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
    <div style={{ flex: 1, border: `4px solid ${t.fg}`, borderRadius: 24, padding: "28px 26px", minHeight: 520 }}>
      <Rise delay={at(a)}>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 84, color: t.fg, lineHeight: 1 }}>{titre}</div>
      </Rise>
      {points.map((p, i) => (
        <Rise key={i} delay={at(a) + 12 + i * 14} dist={30}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 36, lineHeight: 1.2, color: t.fg, marginTop: 28, borderTop: `3px solid ${t.rule}`, paddingTop: 20 }}>{p}</div>
        </Rise>
      ))}
    </div>
  );
  return (
    <Frame theme={theme}>
      <Body top={240}>
        <Kicker color={t.accent}>{kicker}</Kicker>
        <div style={{ display: "flex", gap: 24 }}>
          <Col titre={pour.titre || "Oui"} points={pour.points} a={pour.at} />
          <Col titre={contre.titre || "Non"} points={contre.points} a={contre.at} />
        </div>
        {note && <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: t.sub, marginTop: 18 }}>{note}</div>}
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
};
// Scènes sans sous-titres (le texte à l'écran reprend déjà la voix)
export const NO_CAPTIONS = new Set(["statement", "outro"]);
