import React, { createContext, useState } from "react";
import { sf2DefaultColours, UserInstrument } from "../consts";

export const UserInstrumentContext = createContext<{
  userInstruments: UserInstrument[],
  setUserInstruments: (userInstruments: UserInstrument[]) => void,
  userInstrumentIndex: number,
  setUserInstrumentIndex: (userInstrumentIndex: number) => void,
} | undefined>(undefined);

export function UserInstrumentContextProvider({ children } : { children: React.ReactNode}) {
  const [userInstruments, setUserInstruments] = useState<Array<UserInstrument>>([{
    name: "ins1",
    color: sf2DefaultColours[0],
    sf2Sampler: undefined,
    sf2InstrumentName: undefined,
    volume: 100,
  }]);
  const [userInstrumentIndex, setUserInstrumentIndex] = useState(0);
  return (
    <UserInstrumentContext value={{
      userInstruments,
      setUserInstruments,
      userInstrumentIndex,
      setUserInstrumentIndex,
    }}>
      {children}
    </UserInstrumentContext>
  );
}