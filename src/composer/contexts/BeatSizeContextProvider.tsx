import React, { createContext, useCallback, useRef, useState } from "react";
import { DEFAULT_BEAT_WIDTH, DEFAULT_BEAT_HEIGHT } from "../consts";

export function BeatSizeContextProvider({ children } : { children: React.ReactNode }) {
  const [_beatWidth, _setBeatWidth] = useState(DEFAULT_BEAT_WIDTH);
  const [_beatHeight, _setBeatHeight] = useState(DEFAULT_BEAT_HEIGHT);

  const beatWidthRef = useRef(_beatWidth);
  const beatHeightRef = useRef(_beatHeight);

  const setBeatWidth = useCallback((newBeatWidth: number) => {
    beatWidthRef.current = newBeatWidth;
    _setBeatWidth(newBeatWidth);
  }, []);

  const setBeatHeight = useCallback((newBeatHeight: number) => {
    beatHeightRef.current = newBeatHeight;
    _setBeatHeight(newBeatHeight);
  }, []);

  return (
    <BeatSizeContext value={{
      _beatWidth,
      beatWidthRef,
      setBeatWidth,
      _beatHeight,
      beatHeightRef,
      setBeatHeight,
    }}>
      {children}
    </BeatSizeContext>
  );
}

export const BeatSizeContext = createContext<{
  _beatWidth: number,
  beatWidthRef: React.RefObject<number>,
  setBeatWidth: (newBeatWidth: number) => void,
  _beatHeight: number,
  beatHeightRef: React.RefObject<number>,
  setBeatHeight: (newBeatHeight: number) => void,
} | undefined>(undefined);