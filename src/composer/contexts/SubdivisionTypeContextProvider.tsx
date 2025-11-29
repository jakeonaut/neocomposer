import React, { createContext, useCallback, useRef, useState } from "react";
import { SubdivisionType } from "../consts";

export function SubdivisionTypeContextProvider({ children }: { children: React.ReactNode }) {
  const [_subdivisionType, _setSubdivisionType] = useState(SubdivisionType.q);

  const subdivisionTypeRef = useRef(_subdivisionType);

  const setSubdivisionType = useCallback((newSubdivisionType: SubdivisionType) => {
    subdivisionTypeRef.current = newSubdivisionType;
    _setSubdivisionType(newSubdivisionType);
  }, []);
  return (
    <SubdivisionTypeContext value={{
      _subdivisionType,
      subdivisionTypeRef,
      setSubdivisionType,
    }}>
      {children}
    </SubdivisionTypeContext>
  );
}

export const SubdivisionTypeContext = createContext<{
  _subdivisionType: SubdivisionType,
  subdivisionTypeRef: React.RefObject<SubdivisionType>,
  setSubdivisionType: (type: SubdivisionType) => void,
} | undefined>(undefined);