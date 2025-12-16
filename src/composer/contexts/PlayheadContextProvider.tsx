import React, { createContext, useCallback, useMemo, useRef, useState } from "react";
import { PlayheadBounds } from "../consts";

export function PlayheadContextProvider({ children }: { children: React.ReactNode }) {
  const [_userPlayheadBounds, _setUserPlayheadBounds] = useState<PlayheadBounds | undefined>(undefined);
  
  const userPlayheadBoundsRef = useRef(_userPlayheadBounds);

  const setUserPlayheadBounds = useCallback((newUserPlayheadBounds: PlayheadBounds | undefined) => {
    userPlayheadBoundsRef.current = newUserPlayheadBounds;
    _setUserPlayheadBounds(newUserPlayheadBounds);
  }, []);

  const playheadContextProvider = useMemo(() => (
    <PlayheadContext value={{
      _userPlayheadBounds, userPlayheadBoundsRef, setUserPlayheadBounds,
    }}>
      {children}
    </PlayheadContext>
  ), [_userPlayheadBounds, children, setUserPlayheadBounds]);
  return playheadContextProvider;
}

export const PlayheadContext = createContext<{
  _userPlayheadBounds: PlayheadBounds | undefined,
  userPlayheadBoundsRef: React.RefObject<PlayheadBounds | undefined>,
  setUserPlayheadBounds: (newUserPlayheadBounds: PlayheadBounds | undefined) => void,
} | undefined>(undefined);