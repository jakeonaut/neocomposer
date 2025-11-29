import React, { createContext, useState } from "react";

export function PristineContextProvider({ children }: { children: React.ReactNode }) {
  const [pristine, setPristine] = useState(true);

  return (
    <PristineContext value={{ pristine, setPristine }}>
      {children}
    </PristineContext>
  );
}

export const PristineContext = createContext<{
  pristine: boolean,
  setPristine: (pristine: boolean) => void,
} | undefined>(undefined);