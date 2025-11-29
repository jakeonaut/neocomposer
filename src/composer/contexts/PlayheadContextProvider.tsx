import React, { createContext, useCallback, useMemo, useState } from "react";

export function PlayheadContextProvider({ children }: { children: React.ReactNode }) {
  const [babyDanceFrame, _setBabyDanceFrame] = useState(0);
  const incrementBabyDanceFrame = useCallback(
    () => _setBabyDanceFrame((prev) => (prev < 3 ? prev + 1 : 0)),
    []
  );
  const [playheadPosX, setPlayheadPosX] = useState(0);

  const playheadContextProvider = useMemo(() => (
    <PlayheadContext value={{
      incrementBabyDanceFrame,
      setPlayheadPosX,
    }}>
      {children}
    </PlayheadContext>
  ), [children, incrementBabyDanceFrame]);
  const babyDanceFrameContextProvider = useMemo(() => (
    <BabyDanceFrameContext value={{ babyDanceFrame }}>
      {playheadContextProvider}
    </BabyDanceFrameContext>
  ), [babyDanceFrame, playheadContextProvider]);

  return (
    <PlayheadPosXContext value={{ playheadPosX }}>
      {babyDanceFrameContextProvider}
    </PlayheadPosXContext>
  );
}

export const PlayheadContext = createContext<{
  incrementBabyDanceFrame: () => void,
  setPlayheadPosX: React.Dispatch<React.SetStateAction<number>>,
} | undefined>(undefined);

export const BabyDanceFrameContext = createContext<{
  babyDanceFrame: number,
} | undefined>(undefined);

export const PlayheadPosXContext = createContext<{
  playheadPosX: number,
} | undefined>(undefined);