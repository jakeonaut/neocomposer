import React, { createContext, useMemo, useState } from "react";
import { Composition } from "../consts";

export function CompositionContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [_composition, _setComposition] = useState<Composition>({});
  const [_farthestRightNoteEnd, _setFarthestRightNoteEnd] = useState(1);

  const contextValue = useMemo(() => ({
    _farthestRightNoteEnd,
    _setFarthestRightNoteEnd,
    _composition, 
    _setComposition,
  }), [_composition, _farthestRightNoteEnd, _setComposition, _setFarthestRightNoteEnd]);
  return (
    <CompositionContext value={contextValue}>
      {children}
    </CompositionContext>
  );
}

export const CompositionContext = createContext<{
  _farthestRightNoteEnd: number,
  _setFarthestRightNoteEnd: (newFarthestRightNoteEnd: number) => void,
  _composition: Composition,
  _setComposition: (composition: Composition) => void,
} | undefined>(undefined);