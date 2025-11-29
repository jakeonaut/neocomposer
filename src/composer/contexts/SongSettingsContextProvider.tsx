import React, { createContext, useState } from "react";

export const SongSettingsContext = createContext<{
  songName: string,
  setSongName: (name: string) => void
  tempo: number,
  setTempo: (tempo: number) => void,
  masterVolume: number,
  setMasterVolume: (volume: number) => void,
} | undefined>(undefined);

export function SongSettingsContextProvider({ children } : { children: React.ReactNode }) {
  const [songName, setSongName] = useState('new_song');
  const [tempo, setTempo] = useState(100);
  const [masterVolume, setMasterVolume] = useState(100);
  return (
    <SongSettingsContext value={{
      songName,
      setSongName,
      tempo,
      setTempo,
      masterVolume,
      setMasterVolume,
    }}>
      {children}
    </SongSettingsContext>
  );
}