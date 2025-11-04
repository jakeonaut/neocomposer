import React, { useCallback, useState } from 'react';
import { SampleStart } from '../smplr/player/types';
import { Soundfont2Sampler } from '../smplr';

export type UserInstrument = {
  name: string;
  color: string;
  sf2Sampler: Soundfont2Sampler | undefined;
}
export type MidiNote = string;
export type OctavelessMidiNote = string;
type MidiBeat = number;
type InstrumentInstruction = {
  userInstrumentIndex: number;
  sampleStart: SampleStart;
}
export type Composition = {
  [id: MidiBeat]: {
    [id: MidiNote]: InstrumentInstruction | undefined
  }
}

export function useComposition({ context, userInstruments, userInstrumentIndex, setPlayheadPosX } : {
  context: AudioContext,
  userInstruments: Array<UserInstrument | undefined>,
  userInstrumentIndex: number,
  setPlayheadPosX: (posX: number) => void,
}) {
  console.log("recompose");
  const [composition, setComposition] = useState<Composition>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handleUpdateCompositionAtBeatAndNote = useCallback((midiBeat: number, midiNote: string) => {
    const newComposition = { ...composition };
    if (!newComposition[midiBeat]) {
      newComposition[midiBeat] = {};
    }
    if (newComposition[midiBeat][midiNote]) {
      delete newComposition[midiBeat][midiNote];
    } else {
      newComposition[midiBeat][midiNote] = {
        userInstrumentIndex,
        sampleStart: { note: midiNote, duration: 0.25 }
      };
    }
    setComposition(newComposition);
  }, [composition, userInstrumentIndex]);

  const handlePlayComposition = useCallback(() => {
    const beatLengthInSeconds = 0.25;
    const now = context.currentTime;
    setPlayheadPosX(1);
    Object.entries(composition).forEach(([beatStr, beatNotes]) => {
      const beat = parseFloat(beatStr) - 1;
      Object.values(beatNotes).forEach((instrumentInstruction) => {
        // TODO(jaketrower): This doesn't currently allow for at-time-of-note-play-swapping of the instrument/sf2
        if (!instrumentInstruction) return;
        const { sampleStart } = instrumentInstruction;
        // TODO(jaketrower): in order to achieve ^^, will need playhead to instantiate sampler play at runtime,
        // rather than preprogram them all at PLAY button press...
        const userInstrumentToPlay = userInstruments[instrumentInstruction.userInstrumentIndex];
        if (!userInstrumentToPlay?.sf2Sampler) return;
        userInstrumentToPlay.sf2Sampler.start({
            note: sampleStart.note,
            time: now + beat*beatLengthInSeconds,
            duration: sampleStart.duration,
            onStart: () => { setPlayheadPosX(beat + 1); }
        });
      });
    });
    setIsPlaying(true);
  }, [userInstruments, composition]);

  const handleStopComposition = useCallback(() => {
    setPlayheadPosX(1);
    userInstruments.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    })
    setIsPlaying(false);
  }, [userInstruments]);

  const handleClearComposition = useCallback(() => {
    const shouldDelete = window.confirm('Are you sure you want to destroy your creation?');
    if (!shouldDelete) return;
    userInstruments.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    })
    setComposition({});
    setIsPlaying(false);
  }, [userInstruments])

  return {
    composition,
    setComposition,
    handleUpdateCompositionAtBeatAndNote,
    handlePlayComposition,
    handleStopComposition,
    handleClearComposition,
    isPlaying,
  }
}