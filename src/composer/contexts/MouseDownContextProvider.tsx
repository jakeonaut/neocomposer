import React, { createContext, useCallback, useRef, useState } from "react";

export function MouseDownContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [_isCompositionMouseDown, _setIsCompositionMouseDown] = useState(false);

  const isCompositionMouseDownRef = useRef(_isCompositionMouseDown);
  const onCompositionMouseUpRef = useRef(undefined as ((() => void) | undefined));
  const whenWasMouseDownedRef = useRef<number>(0);

  const setIsCompositionMouseDown = useCallback((newIsCompositionMouseDown: boolean) => {
    if (newIsCompositionMouseDown && !isCompositionMouseDownRef.current){
      whenWasMouseDownedRef.current = Date.now();
    }
    isCompositionMouseDownRef.current = newIsCompositionMouseDown;
    _setIsCompositionMouseDown(newIsCompositionMouseDown);
  }, []);

  return (
    <MouseDownContext value={{
      _isCompositionMouseDown, isCompositionMouseDownRef, setIsCompositionMouseDown,
      whenWasMouseDownedRef,
      onCompositionMouseUpRef,
    }}>
      {children}
    </MouseDownContext>
  );
}

export const MouseDownContext = createContext<{
  _isCompositionMouseDown: boolean,
  isCompositionMouseDownRef: React.RefObject<boolean>,
  setIsCompositionMouseDown: (newIsCompositionMouseDown: boolean) => void,
  whenWasMouseDownedRef: React.RefObject<number>,
  onCompositionMouseUpRef: React.RefObject<(() => void) | undefined>,
} | undefined>(undefined);