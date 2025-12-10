import React, { createContext, useCallback, useMemo, useRef, useState } from "react";
import { PlayheadBounds } from "../consts";

export function PlayheadContextProvider({ children }: { children: React.ReactNode }) {
  const [babyDanceFrame, _setBabyDanceFrame] = useState(0);
  const incrementBabyDanceFrame = useCallback(
    () => _setBabyDanceFrame((prev) => (prev < 3 ? prev + 1 : 0)),
    []
  );
  const [_isPlaying, _setIsPlaying] = useState<boolean>(false);
  const [_isLooping, _setIsLooping] = useState<boolean>(true);
  
  const isLoopingRef = useRef(_isLooping);
  const isPlayingRef = useRef(_isPlaying);
  const [_playheadPosX, _setPlayheadPosX] = useState(0);
  const [_userPlayheadBounds, _setUserPlayheadBounds] = useState<PlayheadBounds | undefined>(undefined);
  
  const playheadPosXRef = useRef(_playheadPosX);
  const userPlayheadBoundsRef = useRef(_userPlayheadBounds);

  const setPlayheadPosX = useCallback((newPlayheadPosX: number) => {
    playheadPosXRef.current = newPlayheadPosX;
    _setPlayheadPosX(newPlayheadPosX);
  }, []);
  const setUserPlayheadBounds = useCallback((newUserPlayheadBounds: PlayheadBounds | undefined) => {
    userPlayheadBoundsRef.current = newUserPlayheadBounds;
    _setUserPlayheadBounds(newUserPlayheadBounds);
  }, []);

  const playheadContextProvider = useMemo(() => (
    <PlayheadContext value={{
      incrementBabyDanceFrame,
      _isPlaying,
      _setIsPlaying,
      isPlayingRef,
      _isLooping,
      _setIsLooping,
      isLoopingRef,
      setPlayheadPosX,
      _userPlayheadBounds, userPlayheadBoundsRef, setUserPlayheadBounds,
    }}>
      {children}
    </PlayheadContext>
  ), [_isLooping, _isPlaying, _userPlayheadBounds, children, incrementBabyDanceFrame, setPlayheadPosX, setUserPlayheadBounds]);
  const babyDanceFrameContextProvider = useMemo(() => (
    <BabyDanceFrameContext value={{ babyDanceFrame }}>
      {playheadContextProvider}
    </BabyDanceFrameContext>
  ), [babyDanceFrame, playheadContextProvider]);

  return (
    <PlayheadPosXContext value={{ _playheadPosX, playheadPosXRef }}>
      {babyDanceFrameContextProvider}
    </PlayheadPosXContext>
  );
}

export const PlayheadPosXContext = createContext<{
  _playheadPosX: number,
  playheadPosXRef: React.RefObject<number>,
} | undefined>(undefined);

export const BabyDanceFrameContext = createContext<{
  babyDanceFrame: number,
} | undefined>(undefined);

export const PlayheadContext = createContext<{
  incrementBabyDanceFrame: () => void,
  _isPlaying: boolean,
  _setIsPlaying: (_newIsPlaying: boolean) => void,
  isPlayingRef: React.RefObject<boolean>,
  _isLooping: boolean,
  _setIsLooping: (_newIsLooping: boolean) => void,
  isLoopingRef: React.RefObject<boolean>,
  setPlayheadPosX: (newPlayheadPosX: number) => void,
  _userPlayheadBounds: PlayheadBounds | undefined,
  userPlayheadBoundsRef: React.RefObject<PlayheadBounds | undefined>,
  setUserPlayheadBounds: (newUserPlayheadBounds: PlayheadBounds | undefined) => void,
} | undefined>(undefined);