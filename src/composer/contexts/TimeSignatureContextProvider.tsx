import React, { createContext, useCallback, useRef, useState } from "react";
import { TimeSignature } from "../consts";

export function TimeSignatureContextProvider({ children }: { children: React.ReactNode }) {
  const [_timeSignature, _setTimeSignature] = useState(TimeSignature.ts4_4);

  const timeSignatureRef = useRef(_timeSignature);

  const setTimeSignature = useCallback((newTimeSignature: TimeSignature) => {
    timeSignatureRef.current = newTimeSignature;
    _setTimeSignature(newTimeSignature);
  }, []);

  return (
    <TimeSignatureContext value={{
      _timeSignature,
      timeSignatureRef,
      setTimeSignature,
    }}>
      {children}
    </TimeSignatureContext>
  );
}

export const TimeSignatureContext = createContext<{
  _timeSignature: TimeSignature,
  timeSignatureRef: React.RefObject<TimeSignature>,
  setTimeSignature: (timeSignature: TimeSignature) => void,
} | undefined>(undefined);