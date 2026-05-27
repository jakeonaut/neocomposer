import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AudioContextContext, DEFAULT_VOLUME, getNewInstrumentColor, UserInstrument } from "../consts";
import { Soundfont2Sampler } from "../../smplr/soundfont2";
import { SoundFont2 } from 'soundfont2';
// import * as randomEmoji from 'random-unicode-emoji';

export const UserInstrumentContext = createContext<{
  _userInstruments: UserInstrument[],
  userInstrumentsRef: React.RefObject<UserInstrument[]>,
  setUserInstruments: (userInstruments: UserInstrument[]) => void,
  _userInstrumentIndex: number,
  userInstrumentIndexRef: React.RefObject<number>,
  setUserInstrumentIndex: (userInstrumentIndex: number) => void,
  howManyInstrumentsIEverMade: number,
  setHowManyInstrumentsIEverMade: (num: number) => void,
  getNewUserInstrument: (audioContext: AudioContext, index: number) => UserInstrument,
  userInstrumentColorInputRef: React.RefObject<HTMLInputElement | null>,
  userInstrumentNameInputRef: React.RefObject<HTMLInputElement | null>,
  userInstrumentVolumeInputRef: React.RefObject<HTMLInputElement | null>,
} | undefined>(undefined);

export function createUserInstrument(audioContext: AudioContext, index: number, arrayBuffer?: Uint8Array): UserInstrument {
  const volume = DEFAULT_VOLUME;
  const { sampler: sf2Sampler, randomInstrumentIdx } = (() => {
    if (arrayBuffer) {
      const soundfont2Sampler = new Soundfont2Sampler(audioContext, {
        data: arrayBuffer,
        createSoundfont: (data) => new SoundFont2(data),
      })
      const sampler = soundfont2Sampler.load;
      const randomInstrumentIdx = Math.floor(Math.random() * sampler.instrumentNames.length);
      sampler.loadInstrument(sampler.instrumentNames[randomInstrumentIdx]);
      return { sampler, randomInstrumentIdx };
    } else {
      return { sampler: undefined, randomInstrumentIdx: undefined };
    }
  })();
  // const randomEmojis = randomEmoji.random({count: 2});
  return {
    // name: `${randomEmojis[0]}${randomEmojis[1]}${index+1}`,
    name: `ins${index+1}`,
    color: getNewInstrumentColor(index),
    sf2Sampler: sf2Sampler,
    sf2InstrumentName: sf2Sampler?.instrumentNames[randomInstrumentIdx],
    volume,
    visible: true,
    solo: false,
  };
}

export function UserInstrumentContextProvider({ children } : { children: React.ReactNode}) {
  const audioContext = useContext(AudioContextContext)!;
  const [_userInstruments, _setUserInstruments] = useState<UserInstrument[]>([createUserInstrument(audioContext, 0)]);
  const [_userInstrumentIndex, _setUserInstrumentIndex] = useState(0);
  const [howManyInstrumentsIEverMade, setHowManyInstrumentsIEverMade] = useState(1);
  const [defaultSoundfontBuffer, setDefaultSoundfontBuffer] = useState<Uint8Array | undefined>(undefined);
  
  const userInstrumentColorInputRef = useRef<HTMLInputElement | null>(null);
  const userInstrumentNameInputRef = useRef<HTMLInputElement | null>(null);
  const userInstrumentVolumeInputRef = useRef<HTMLInputElement | null>(null);
  const userInstrumentsRef = useRef<UserInstrument[]>(_userInstruments);
  const userInstrumentIndexRef = useRef(_userInstrumentIndex);

  const updateInputRefValues = useCallback(() => {
    const currInstrument = userInstrumentsRef.current[userInstrumentIndexRef.current];
    if (userInstrumentColorInputRef.current) {
      userInstrumentColorInputRef.current.value = currInstrument.color;
    }
    if (userInstrumentNameInputRef.current) {
      userInstrumentNameInputRef.current.value = currInstrument.name;
    }
    if (userInstrumentVolumeInputRef.current) {
      userInstrumentVolumeInputRef.current.value = currInstrument.volume.toString();
    }
  }, []);
  const setUserInstruments = useCallback((newUserInstruments: UserInstrument[]) => {
    userInstrumentsRef.current = newUserInstruments;
    updateInputRefValues();
    _setUserInstruments(newUserInstruments);
  }, [updateInputRefValues]);
  const setUserInstrumentIndex = useCallback((newUserInstrumentIndex: number) => {
    userInstrumentIndexRef.current = newUserInstrumentIndex;
    updateInputRefValues();
    _setUserInstrumentIndex(newUserInstrumentIndex);
  }, [updateInputRefValues]);

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
      sampler.player.output.setVolume(userInstrumentsRef.current[0].volume);
      const randomInstrumentIdx = Math.floor(Math.random() * sampler.instrumentNames.length);
      sampler.loadInstrument(sampler.instrumentNames[randomInstrumentIdx]);
      setUserInstruments([{
        ...userInstrumentsRef.current[0],
        sf2Sampler: sampler,
        sf2InstrumentName: sampler.instrumentNames[randomInstrumentIdx],
      }])
    }
    fetchAndSetDefaultSoundFontInstrument();
  }, [audioContext, setUserInstruments]);
  const getNewUserInstrument = useCallback((audioContext: AudioContext, index: number): UserInstrument => {
    return createUserInstrument(audioContext, index, defaultSoundfontBuffer);
  }, [defaultSoundfontBuffer]);
  return (
    <UserInstrumentContext value={{
      _userInstruments,
      userInstrumentsRef,
      setUserInstruments,
      _userInstrumentIndex,
      userInstrumentIndexRef,
      setUserInstrumentIndex,
      howManyInstrumentsIEverMade,
      setHowManyInstrumentsIEverMade,
      getNewUserInstrument,
      userInstrumentColorInputRef,
      userInstrumentNameInputRef,
      userInstrumentVolumeInputRef,
    }}>
      {children}
    </UserInstrumentContext>
  );
}