import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AudioContextContext, DEFAULT_VOLUME, getNewInstrumentColor, UserInstrument } from "../consts";
import { Soundfont2Sampler } from "../../smplr/soundfont2";
import { SoundFont2 } from 'soundfont2';
// import * as randomEmoji from 'random-unicode-emoji';

export const UserInstrumentContext = createContext<{
  defaultSoundfontBuffer: Uint8Array | undefined,
  _userInstruments: UserInstrument[],
  userInstrumentsRef: React.RefObject<UserInstrument[]>,
  setUserInstruments: (userInstruments: UserInstrument[]) => void,
  _userInstrumentIndex: number,
  userInstrumentIndexRef: React.RefObject<number>,
  setUserInstrumentIndex: (userInstrumentIndex: number) => void,
  howManyInstrumentsIEverMade: number,
  setHowManyInstrumentsIEverMade: (num: number) => void,
  getNewUserInstrument: (audioContext: AudioContext, index: number) => Promise<UserInstrument>,
  userInstrumentColorInputRef: React.RefObject<HTMLInputElement | null>,
  userInstrumentNameInputRef: React.RefObject<HTMLInputElement | null>,
  userInstrumentVolumeInputRef: React.RefObject<HTMLInputElement | null>,
} | undefined>(undefined);

export async function createUserInstrument(audioContext: BaseAudioContext, index: number, arrayBuffer?: Uint8Array): Promise<UserInstrument> {
  const volume = DEFAULT_VOLUME;
  const { sampler: sf2Sampler, randomInstrumentIdx } = await (async () => {
    if (arrayBuffer) {
      const soundfont2Sampler = new Soundfont2Sampler(audioContext, {
        data: arrayBuffer,
        createSoundfont: (data) => new SoundFont2(data),
      });
      await soundfont2Sampler.ready;
      const randomInstrumentIdx = Math.floor(Math.random() * soundfont2Sampler.instrumentNames.length);
      await soundfont2Sampler.loadInstrument(soundfont2Sampler.instrumentNames[randomInstrumentIdx]);
      return { sampler: soundfont2Sampler, randomInstrumentIdx };
    } else {
      return { sampler: undefined, randomInstrumentIdx: -1 };
    }
  })();
  // const randomEmojis = randomEmoji.random({count: 2});
  return {
    // name: `${randomEmojis[0]}${randomEmojis[1]}${index+1}`,
    name: `ins${index+1}`,
    color: getNewInstrumentColor(index),
    sf2Sampler: sf2Sampler,
    sf2InstrumentName: sf2Sampler?.instrumentNames[randomInstrumentIdx],
    sf2InstrumentIndex: randomInstrumentIdx,
    volume,
    visible: true,
    solo: false,
  };
}

export function UserInstrumentContextProvider({ children } : { children: React.ReactNode}) {
  const audioContext = useContext(AudioContextContext)!;
  const [_userInstruments, _setUserInstruments] = useState<UserInstrument[]>([]);
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
      const userInstrument = await createUserInstrument(audioContext, 0);
      _setUserInstruments([userInstrument]);

      const response = await fetch("microgm.sf2");
      const arrayBuffer = await response.arrayBuffer();
      const soundfontBuffer = new Uint8Array(arrayBuffer);
      setDefaultSoundfontBuffer(soundfontBuffer);
      const soundfont2Sampler = new Soundfont2Sampler(audioContext, {
        data: soundfontBuffer,
        createSoundfont: (data) => new SoundFont2(data),
      })
      await soundfont2Sampler.ready;
      soundfont2Sampler.output.volume = userInstrument.volume;
      const randomInstrumentIdx = Math.floor(Math.random() * soundfont2Sampler.instrumentNames.length);
      await soundfont2Sampler.loadInstrument(soundfont2Sampler.instrumentNames[randomInstrumentIdx]);
      setUserInstruments([{
        ...userInstrument,
        sf2Sampler: soundfont2Sampler,
        sf2InstrumentName: soundfont2Sampler.instrumentNames[randomInstrumentIdx],
      }])
    }
    fetchAndSetDefaultSoundFontInstrument();
  }, [audioContext, setUserInstruments]);
  const getNewUserInstrument = useCallback(async (audioContext: AudioContext, index: number): Promise<UserInstrument> => {
    return createUserInstrument(audioContext, index, defaultSoundfontBuffer);
  }, [defaultSoundfontBuffer]);
  return (
    <UserInstrumentContext value={{
      defaultSoundfontBuffer,
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