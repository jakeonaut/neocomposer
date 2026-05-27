import React, { createContext, useCallback, useRef, useState } from "react";
import { generate } from "random-words";

export const SongSettingsContext = createContext<{
  songName: string,
  setSongName: (name: string) => void
  _tempo: number,
  tempoRef: React.RefObject<number>,
  setTempo: (tempo: number) => void,
  masterVolume: number,
  setMasterVolume: (volume: number) => void,
} | undefined>(undefined);

export function SongSettingsContextProvider({ children } : { children: React.ReactNode }) {
  const [songName, setSongName] = useState((generate(2) as string[]).join(" "));
  const [_tempo, _setTempo] = useState(Math.floor(Math.random() * 40) + 80);
  const [masterVolume, setMasterVolume] = useState(100);

  const tempoRef = useRef(_tempo);

  const setTempo = useCallback((newTempo: number) => {
    tempoRef.current = newTempo;
    _setTempo(newTempo);
  }, []);

  return (
    <SongSettingsContext value={{
      songName,
      setSongName,
      _tempo,
      tempoRef,
      setTempo,
      masterVolume,
      setMasterVolume,
    }}>
      {children}
    </SongSettingsContext>
  );
}