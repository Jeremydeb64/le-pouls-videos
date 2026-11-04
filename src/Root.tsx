import React from "react";
import { Composition, staticFile } from "remotion";
import { Episode, EpisodeSpec } from "./Episode";
import demo from "../episodes/2026-11-04-mondiaux-crans-montana.json";

// L'épisode est passé en props (--props=episode.json) ; la démo sert de valeur par défaut.
export const RemotionRoot: React.FC = () => (
  <Composition
    id="Episode"
    component={Episode as any}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ episode: demo as unknown as EpisodeSpec, withVoice: true }}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props as any).episode.duration * 30) })}
  />
);
