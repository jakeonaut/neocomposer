import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AudioContextContext, sf2DefaultColours, UserInstrument } from "../consts";
import { Soundfont2Sampler } from "../../smplr/soundfont2";
import { SoundFont2 } from 'soundfont2';

export const UserInstrumentContext = createContext<{
  userInstruments: UserInstrument[],
  setUserInstruments: (userInstruments: UserInstrument[]) => void,
  userInstrumentIndex: number,
  setUserInstrumentIndex: (userInstrumentIndex: number) => void,
  getNewUserInstrument: (audioContext: AudioContext, index: number) => UserInstrument,
} | undefined>(undefined);

export function createUserInstrument(audioContext: AudioContext, index: number, arrayBuffer?: Uint8Array): UserInstrument {
  const sf2Sampler = (() => {
    if (arrayBuffer) {
      const soundfont2Sampler = new Soundfont2Sampler(audioContext, {
        data: arrayBuffer,
        createSoundfont: (data) => new SoundFont2(data),
      })
      const sampler = soundfont2Sampler.load;
      sampler.loadInstrument(sampler.instrumentNames[0]);
      return sampler;
    } else {
      return undefined;
    }
  })();
  return {
    name: `ins${index+1}`,
    color: sf2DefaultColours[index] ?? 'gray',
    sf2Sampler: sf2Sampler,
    sf2InstrumentName: sf2Sampler?.instrumentNames[0],
    volume: 100,
  };
}

export function UserInstrumentContextProvider({ children } : { children: React.ReactNode}) {
  const audioContext = useContext(AudioContextContext)!;
  const [userInstruments, setUserInstruments] = useState<UserInstrument[]>([createUserInstrument(audioContext, 0)]);
  const [userInstrumentIndex, setUserInstrumentIndex] = useState(0);
  const [defaultSoundfontBuffer, setDefaultSoundfontBuffer] = useState<Uint8Array | undefined>(undefined);
  useEffect(() => {
    const fetchAndSetDefaultSoundFontInstrument = async () => {
      const response = await fetch("microgm.sf2");
      const arrayBuffer = await response.arrayBuffer();
      const soundfontBuffer = new Uint8Array(arrayBuffer);
      setDefaultSoundfontBuffer(soundfontBuffer);
      const soundfont2Sampler = new Soundfont2Sampler(audioContext, {
        data: soundfontBuffer,
        createSoundfont: (data) => new SoundFont2(data),
      })
      const sampler = await soundfont2Sampler.load;
      sampler.loadInstrument(sampler.instrumentNames[0]);
      userInstruments[0]!.sf2Sampler = sampler;
      userInstruments[0]!.sf2InstrumentName = sampler.instrumentNames[0];
      setUserInstruments([...userInstruments]);
    }
    fetchAndSetDefaultSoundFontInstrument();
  }, []);
  const getNewUserInstrument = useCallback((audioContext: AudioContext, index: number): UserInstrument => {
    return createUserInstrument(audioContext, index, defaultSoundfontBuffer);
  }, [defaultSoundfontBuffer]);
  return (
    <UserInstrumentContext value={{
      userInstruments,
      setUserInstruments,
      userInstrumentIndex,
      setUserInstrumentIndex,
      getNewUserInstrument,
    }}>
      {children}
    </UserInstrumentContext>
  );
}