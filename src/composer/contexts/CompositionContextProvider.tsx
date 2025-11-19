import React, { createContext, useCallback, useContext, useState } from "react";
import { AudioContextContext, Composition, InputMode, InstrumentInstruction, InstrumentInstructionWithOffset, MidiBeat, MidiNoteNum, UserInstrument } from "../consts";
import { SongSettingsContext } from "./SongSettingsContextProvider";
import { UserInstrumentContext } from "./UserInstrumentContextProvider";

let globalInstructionId = 0;
let globalIsPlaying = false;
let globalIsLooping = false;
let globalLoopTimeoutId: number | undefined = undefined;
let globalStopHelperTimeoutId: number | undefined = undefined;
let globalCompositionByInstructionId: Record<string, InstrumentInstruction> = {};
function deleteNoteFromComposition(composition: Composition, midiBeat: MidiBeat, midiNote: MidiNoteNum, noteId: number) {
  delete composition[midiBeat][midiNote][noteId];
  if (Object.keys(composition[midiBeat][midiNote]).length === 0) {
    delete composition[midiBeat][midiNote];
  }
  if (Object.keys(composition[midiBeat]).length === 0) {
    delete composition[midiBeat];
  }
  delete globalCompositionByInstructionId[noteId];
}

export function convertCompositionToCompositionByInstrument(composition: Composition) {
  const compositionByInstrument: Record<number, number[][]> = {};
  Object.entries(composition).forEach(([midiBeat, column]) => {
    Object.entries(column).forEach(([midiNote, instructions]) => {
      Object.values(instructions).forEach((instruction) => {
        if (!compositionByInstrument[instruction.userInstrumentIndex]) {
          compositionByInstrument[instruction.userInstrumentIndex] = [];
        }
        compositionByInstrument[instruction.userInstrumentIndex].push([
          instruction.midiBeat,
          instruction.midiNote,
          instruction.noteWidth
        ]);
      });
    });
  });
  return compositionByInstrument;
}
export function convertCompositionByInstrumentToComposition(
  compositionByInstrument: Record<number, number[][]>
) {
  // globalInstructionId = 0;
  const composition: Composition = {};
  Object.entries(compositionByInstrument).forEach(([userInstrumentIndex, instructions]) => {
    instructions.forEach((instruction) => {
      const midiBeat = instruction[0];
      const midiNote = instruction[1];
      const noteWidth = instruction[2];
      const newInstruction: InstrumentInstruction = {
        userInstrumentIndex: parseInt(userInstrumentIndex),
        midiBeat,
        midiNote,
        noteWidth,
        noteId: ++globalInstructionId,
      }
      if (!composition[midiBeat]) composition[midiBeat] = {};
      if (!composition[midiBeat][midiNote]) composition[midiBeat][midiNote] = {};
      composition[midiBeat][midiNote][newInstruction.noteId] = newInstruction;
    });
  });
  return composition;
}

export function CompositionContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const audioContext = useContext(AudioContextContext)!;
  const { songName, tempo, setPlayheadPosX } = useContext(SongSettingsContext)!;
  const { userInstruments, setHowManyInstrumentsIEverMade, setUserInstruments, getNewUserInstrument } = useContext(UserInstrumentContext)!;
  const [heldPianoKeys, setHeldPianoKeys] = useState<Record<string, boolean>>({});
  const [composition, setComposition] = useState<Composition>({});
  const [isCompositionMouseDown, setIsCompositionMouseDown] = useState(false);
  const [onCompositionMouseUp, setOnCompositionMouseUp] = useState<(() => void) | undefined>();
  const [clickedNote, setClickedNote] = useState<InstrumentInstruction | undefined>(undefined);
  const [selectedNotes, setSelectedNotes] = useState<Record<string, InstrumentInstructionWithOffset>>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const removeCompositionNotes = useCallback((idsToRemove: string[]) => {
    const newComposition = { ...composition };
    idsToRemove.forEach((id) => {
      const instrumentInstruction = globalCompositionByInstructionId[id];
      if (!instrumentInstruction) return;
      deleteNoteFromComposition(newComposition, instrumentInstruction.midiBeat, instrumentInstruction.midiNote, instrumentInstruction.noteId);
    })
    setComposition(newComposition);
  }, [composition]);
  const addCompositionNotes = useCallback(
    (notesToAdd: (Omit<InstrumentInstruction, 'noteId'> & { noteId?: number })[]) => {
      const newComposition = { ...composition };
      notesToAdd.forEach((noteToAdd) => {
        const { midiBeat, midiNote, noteWidth } = noteToAdd;
        if (!newComposition[midiBeat]) newComposition[midiBeat] = {};
        if (!newComposition[midiBeat][midiNote]) newComposition[midiBeat][midiNote] = {};
        const noteId = noteToAdd.noteId || ++globalInstructionId;
        const newInstrumentInstruction = {
          ...noteToAdd,
          noteId,
        };
        newComposition[midiBeat][midiNote][noteId] = newInstrumentInstruction;
        globalCompositionByInstructionId[noteId] = newInstrumentInstruction;
      });
      setComposition(newComposition);
    },
    [composition]
  );

  const stopResetHelper = () => {
    globalStopHelperTimeoutId = undefined;
    setPlayheadPosX(1);
    setIsPlaying(false);
    globalIsPlaying = false;
  };
  const handlePlayComposition = useCallback(({ wasStartedFromLoop = false }) => {
    if (wasStartedFromLoop && (!globalIsPlaying || !globalIsLooping)) {
      return;
    }
    const bpm = tempo;
    const bps = bpm / 60.0;
    const nthNoteDivision = 4.0;
    const nthNotesPerSec = bps * nthNoteDivision;
    const beatLengthInSeconds = 1 / nthNotesPerSec;
    // TODO(jaketrower): totally based on bpm... 120 beats per minute = 2 beats per second, 32 noteBlocks per second = duration of 0.03125
    // so beatLengthInSeconds = tempo / 2
    const now = audioContext.currentTime;
    setPlayheadPosX(1);
    let lastBeat = -1; 
    Object.keys(composition).forEach((beatStr) => {
      const beat = parseFloat(beatStr) - 1;
      if (beat > lastBeat) lastBeat = beat;
    });
    Object.entries(composition).forEach(([beatStr, perNoteInstrumentInstructions]) => {
      const beat = parseFloat(beatStr) - 1; // TODO(jaketrower): I think beat should represent... 16th notes?
      Object.values(perNoteInstrumentInstructions).forEach((instrumentInstructions) => {
        Object.values(instrumentInstructions).forEach((instrumentInstruction, instructionIndex) => {
          // TODO(jaketrower): This doesn't currently allow for at-time-of-note-play-swapping of the instrument/sf2
          if (!instrumentInstruction) return;
          const { midiNote } = instrumentInstruction;
          // TODO(jaketrower): in order to achieve ^^, will need playhead to instantiate sampler play at runtime,
          // rather than preprogram them all at PLAY button press...
          const userInstrumentToPlay =
            userInstruments[instrumentInstruction.userInstrumentIndex];
          if (!userInstrumentToPlay?.sf2Sampler) return;
          const durationSec = beatLengthInSeconds * instrumentInstruction.noteWidth;
          const durationPlusOneSec = beatLengthInSeconds * (instrumentInstruction.noteWidth + 1);
          userInstrumentToPlay.sf2Sampler.start({
            note: midiNote,
            time: now + beat * beatLengthInSeconds,
            duration: durationSec,
            onStart: () => {
              setPlayheadPosX(beat + 1);
              if (beat === lastBeat && instructionIndex === 0) {
                if (globalIsLooping) {
                  globalLoopTimeoutId = window.setTimeout(
                    () => handlePlayComposition({ wasStartedFromLoop: true }),
                    durationPlusOneSec * 1000);
                } else {
                  globalStopHelperTimeoutId = window.setTimeout(stopResetHelper, durationPlusOneSec * 1000);
                }
              }
            },
          });
        });
      });
    });
    if (!wasStartedFromLoop) {
      setIsPlaying(true);
      globalIsPlaying = true;
    }
  }, [userInstruments, composition, tempo, isPlaying]);

  const handleStopComposition = useCallback(() => {
    userInstruments.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    });
    if (globalStopHelperTimeoutId) {
      window.clearTimeout(globalStopHelperTimeoutId);
      globalStopHelperTimeoutId = undefined;
    }
    stopResetHelper();
    if (globalLoopTimeoutId) {
      window.clearTimeout(globalLoopTimeoutId);
      globalLoopTimeoutId = undefined;
    }
  }, [userInstruments]);

  const handleStartLoop = useCallback(() => {
    setIsLooping(true);
    globalIsLooping = true;
  }, []);
  const handleStopLoop = useCallback(() => {
    setIsLooping(false);
    globalIsLooping = false;
  }, []);

  const handleClearComposition = useCallback(() => {
    const shouldDelete = window.confirm(
      "Are you sure you want to destroy your creation?"
    );
    if (!shouldDelete) return;
    userInstruments.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    });
    setPlayheadPosX(1);
    setComposition({});
    globalCompositionByInstructionId = {};
    setIsPlaying(false);
    setUserInstruments([getNewUserInstrument(audioContext, 1)]);
    setHowManyInstrumentsIEverMade(1);
  }, [userInstruments]);

  return (
    <CompositionContext value={{
      composition,
      isCompositionMouseDown,
      setIsCompositionMouseDown,
      onCompositionMouseUp,
      setOnCompositionMouseUp,
      heldPianoKeys,
      setHeldPianoKeys,
      clickedNote,
      setClickedNote,
      selectedNotes,
      setSelectedNotes,
      addCompositionNotes,
      removeCompositionNotes,
      handlePlayComposition,
      handleStopComposition,
      handleClearComposition,
      isPlaying,
      handleStartLoop,
      handleStopLoop,
      isLooping,
    }}>
      {children}
    </CompositionContext>
  );
}

export const CompositionContext = createContext<{
  composition: Composition,
  isCompositionMouseDown: boolean,
  setIsCompositionMouseDown: (isMouseDown: boolean) => void,
  onCompositionMouseUp: (() => void) | undefined,
  setOnCompositionMouseUp: (callback: (() => void) | undefined) => void,
  heldPianoKeys: Record<string, boolean>,
  setHeldPianoKeys: (keys: Record<string, boolean>) => void,
  addCompositionNotes: (notesToAdd: (
    Omit<InstrumentInstruction, "noteId"> & {
      noteId?: number;
    })[]) => void,
  removeCompositionNotes: (noteIdsToRemove: string[]) => void,
  clickedNote: InstrumentInstruction | undefined,
  setClickedNote: (note: InstrumentInstruction | undefined) => void
  selectedNotes: Record<string, InstrumentInstructionWithOffset>,
  setSelectedNotes: (notes: Record<string, InstrumentInstructionWithOffset>) => void,
  handlePlayComposition: ({ wasStartedFromLoop }: {
      wasStartedFromLoop?: boolean | undefined;
    }) => void,
  handleStopComposition: () => void,
  handleClearComposition: () => void,
  isPlaying: boolean,
  handleStartLoop: () => void,
  handleStopLoop: () => void,
  isLooping: boolean,
} | undefined>(undefined);