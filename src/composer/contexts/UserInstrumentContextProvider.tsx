import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AudioContextContext, DEFAULT_SOUNDFONT_FILE_NAME, DEFAULT_VOLUME, getNewInstrumentColor, UserInstrument } from "../consts";
import { Soundfont2Sampler } from "../../smplr/soundfont2";
import { SoundFont2 } from 'soundfont2';
// import * as randomEmoji from 'random-unicode-emoji';

export const UserInstrumentContext = createContext<{
  defaultSoundfontBuffer: Uint8Array | undefined,
  setDefaultSoundfontBuffer: React.Dispatch<React.SetStateAction<Uint8Array | undefined>>,
  defaultSoundfontFileName: string,
  setDefaultSoundfontFileName: React.Dispatch<React.SetStateAction<string>>,
  _userInstruments: UserInstrument[],
  userInstrumentsRef: React.RefObject<UserInstrument[]>,
  setUserInstruments: (userInstruments: UserInstrument[]) => void,
  _userInstrumentIndex: number,
  userInstrumentIndexRef: React.RefObject<number>,
  setUserInstrumentIndex: (userInstrumentIndex: number) => void,
  howManyInstrumentsIEverMade: number,
  setHowManyInstrumentsIEverMade: (num: number) => void,
  getNewUserInstrument: (audioContext: AudioContext, index: number, overrideBuffer?: Uint8Array) => Promise<UserInstrument>,
  userInstrumentColorInputRef: React.RefObject<HTMLInputElement | null>,
  userInstrumentNameInputRef: React.RefObject<HTMLInputElement | null>,
  userInstrumentVolumeInputRef: React.RefObject<HTMLInputElement | null>,
  createUserInstrument(audioContext: BaseAudioContext, index: number, arrayBuffer?: Uint8Array | undefined): Promise<UserInstrument>,
} | undefined>(undefined);

export function UserInstrumentContextProvider({ children } : { children: React.ReactNode}) {
  const audioContext = useContext(AudioContextContext)!;
  const [_userInstruments, _setUserInstruments] = useState<UserInstrument[]>([]);
  const [_userInstrumentIndex, _setUserInstrumentIndex] = useState(0);
  const [howManyInstrumentsIEverMade, setHowManyInstrumentsIEverMade] = useState(1);
  const [defaultSoundfontBuffer, setDefaultSoundfontBuffer] = useState<Uint8Array | undefined>(undefined);
  const [defaultSoundfontFileName, setDefaultSoundfontFileName] = useState(DEFAULT_SOUNDFONT_FILE_NAME);
  
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
  const setUserInstrumentIndex = useCallback((newUserInstrumentIndex: number) => {
    userInstrumentIndexRef.current = newUserInstrumentIndex;
    updateInputRefValues();
    _setUserInstrumentIndex(newUserInstrumentIndex);
  }, [updateInputRefValues]);
  const setUserInstruments = useCallback((newUserInstruments: UserInstrument[]) => {
    const oldLength = userInstrumentsRef.current.length;
    userInstrumentsRef.current = newUserInstruments;
    if (userInstrumentIndexRef.current >= newUserInstruments.length) {
      setUserInstrumentIndex(newUserInstruments.length - 1);
    } else if (oldLength < newUserInstruments.length) {
      setUserInstrumentIndex(newUserInstruments.length - 1); 
    } else {
      // Do it in an else because setUserInstrumentIndex also calls updateInputRefValues
      updateInputRefValues();
    }
    _setUserInstruments(newUserInstruments);
  }, [setUserInstrumentIndex, updateInputRefValues]);

  const createUserInstrument = useCallback(async (audioContext: BaseAudioContext, index: number, arrayBuffer?: Uint8Array) => {
    const volume = DEFAULT_VOLUME;
    const { sampler: sf2Sampler, randomInstrumentIdx } = await (async () => {
      if (arrayBuffer) {
        const soundfont2Sampler = new Soundfont2Sampler(audioContext, {
          data: arrayBuffer,
          createSoundfont: (data: Uint8Array) => new SoundFont2(data),
        });
        await soundfont2Sampler.ready;
        soundfont2Sampler.output.volume = volume;
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
      fileName: defaultSoundfontFileName,
      color: getNewInstrumentColor(index),
      sf2Sampler: sf2Sampler,
      sf2InstrumentName: sf2Sampler?.instrumentNames[randomInstrumentIdx],
      sf2InstrumentIndex: randomInstrumentIdx,
      volume,
      visible: true,
      solo: false,
    };
  }, [defaultSoundfontFileName]);

  useEffect(() => {
    const fetchAndSetDefaultSoundFontInstrument = async () => {
      const userInstrument = await createUserInstrument(audioContext, 0);
      _setUserInstruments([userInstrument]);

      try {
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
      } catch (e) {
        setUserInstruments([{
          ...userInstrument,
          sf2Sampler: undefined,
          sf2InstrumentName: undefined,
        }])
        console.log("ERROR: ", e);
      }
    }
    fetchAndSetDefaultSoundFontInstrument();
  }, [audioContext, createUserInstrument, setUserInstruments]);
  const getNewUserInstrument = useCallback(async (audioContext: AudioContext, index: number, overrideBuffer?: Uint8Array): Promise<UserInstrument> => {
    return createUserInstrument(audioContext, index, overrideBuffer ?? defaultSoundfontBuffer);
  }, [createUserInstrument, defaultSoundfontBuffer]);
  return (
    <UserInstrumentContext value={{
      defaultSoundfontBuffer,
      setDefaultSoundfontBuffer,
      defaultSoundfontFileName,
      setDefaultSoundfontFileName,
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
      createUserInstrument,
    }}>
      {children}
    </UserInstrumentContext>
  );
}