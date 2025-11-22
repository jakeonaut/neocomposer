import React, { createContext, useCallback, useState } from "react";

export const SongSettingsContext = createContext<{
  pristine: boolean,
  setPristine: (pristine: boolean) => void,
  songName: string,
  setSongName: (name: string) => void
  tempo: number,
  setTempo: (tempo: number) => void,
  masterVolume: number,
  setMasterVolume: (volume: number) => void,
  babyDanceFrame: number,
  incrementBabyDanceFrame: () => void,
  playheadPosX: number,
  setPlayheadPosX: React.Dispatch<React.SetStateAction<number>>,
} | undefined>(undefined);

export function SongSettingsContextProvider({ children } : { children: React.ReactNode }) {
  const [pristine, setPristine] = useState(true);
  const [songName, setSongName] = useState('new_song');
  const [tempo, setTempo] = useState(100);
  const [masterVolume, setMasterVolume] = useState(100);
  const [babyDanceFrame, _setBabyDanceFrame] = useState(0);
  const incrementBabyDanceFrame = useCallback(
    () => _setBabyDanceFrame((prev) => (prev < 3 ? prev + 1 : 0)),
    []
  );
  const [playheadPosX, setPlayheadPosX] = useState(0);
  return (
    <SongSettingsContext value={{
      pristine,
      setPristine,
      songName,
      setSongName,
      tempo,
      setTempo,
      masterVolume,
      setMasterVolume,
      babyDanceFrame,
      incrementBabyDanceFrame,
      playheadPosX,
      setPlayheadPosX,
    }}>
      {children}
    </SongSettingsContext>
  );
}