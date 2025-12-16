

import React, { createContext, useCallback, useRef, useState } from "react";

export function PlayheadPosXContextProvider({ children }: { children: React.ReactNode }) {
  const [_playheadPosX, _setPlayheadPosX] = useState(0);
  const playheadPosXRef = useRef(_playheadPosX);

  const setPlayheadPosX = useCallback((newPlayheadPosX: number) => {
    playheadPosXRef.current = newPlayheadPosX;
    _setPlayheadPosX(newPlayheadPosX);
  }, []);

  return (<PlayheadPosXContext value={{
      _playheadPosX,
      playheadPosXRef, 
      setPlayheadPosX,
    }}>
      {children}
    </PlayheadPosXContext>);
}

export const PlayheadPosXContext = createContext<{
  _playheadPosX: number,
  playheadPosXRef: React.RefObject<number>,
  setPlayheadPosX: (newPlayheadPosX: number) => void,
} | undefined>(undefined);