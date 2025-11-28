import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { AudioContextContext, Composition, CompositionByInstrument, InstrumentInstruction, InstrumentInstructionWithOffset, SubdivisionType } from "../consts";
import { SongSettingsContext } from "./SongSettingsContextProvider";
import { UserInstrumentContext } from "./UserInstrumentContextProvider";
import _ from "lodash";

export function convertCompositionToCompositionByInstrument(composition: Composition) {
  const compositionByInstrument: CompositionByInstrument = {};
  Object.entries(composition).forEach(([_, row]) => {
    Object.entries(row).forEach(([_, instructions]) => {
      Object.values(instructions).forEach((instruction) => {
        if (!compositionByInstrument[instruction.userInstrumentIndex]) {
          compositionByInstrument[instruction.userInstrumentIndex] = [];
        }
        compositionByInstrument[instruction.userInstrumentIndex].push([
          instruction.midiBeat,
          instruction.midiNote,
          instruction.noteWidth,
          instruction.subdivisionType,
        ]);
      });
    });
  });
  return compositionByInstrument;
}

const BEAT_WIDTH = 15;

export function CompositionContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const audioContext = useContext(AudioContextContext)!;
  const { tempo, setPlayheadPosX } = useContext(SongSettingsContext)!;
  const {
    userInstruments,
    setHowManyInstrumentsIEverMade,
    setUserInstruments,
    getNewUserInstrument,
    setUserInstrumentIndex,
  } = useContext(UserInstrumentContext)!;
  const [subdivisionType, setSubdivisionType] = useState(SubdivisionType.q);
  const [heldPianoKeys, setHeldPianoKeys] = useState<Record<string, boolean>>({});
  const [composition, _setComposition] = useState<Composition>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_clickedNote, _setClickedNote] = useState<InstrumentInstruction | undefined>(undefined);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedNotes, _setSelectedNotes] = useState<Record<string, InstrumentInstructionWithOffset>>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const subdivisionTypeRef = useRef(subdivisionType);
  const clickedNoteRef = useRef(_clickedNote);
  const selectedNotesRef = useRef(_selectedNotes);
  const isCompositionMouseDownRef = useRef(false);
  const onCompositionMouseUpRef = useRef(undefined as ((() => void) | undefined));
  const playerIdRef = useRef(undefined as number | undefined);
  const playheadBeatRef = useRef(1);
  const instructionIdRef = useRef(0);
  const compositionRef = useRef(composition);
  const compositionByInstructionIdRef = useRef<Record<string, InstrumentInstruction>>({});

  const setClickedNote = useCallback((newClickedNote: InstrumentInstruction | undefined) => {
    _setClickedNote(newClickedNote);
  }, []);
  const setSelectedNotes = useCallback((newSelectedNotes: Record<string, InstrumentInstructionWithOffset>) => {
    if (_.isEqual(Object.keys(selectedNotesRef.current), Object.keys(newSelectedNotes))) {
      return;
    }
    _setSelectedNotes(newSelectedNotes);
  }, []);
  const setComposition = useCallback((newComposition: Composition) => {
    const prevCompositionByInstructionId = compositionByInstructionIdRef.current;
    compositionByInstructionIdRef.current = {};
    Object.values(newComposition).forEach((row) => {
      Object.values(row).forEach((instrumentInstructions) => {
        Object.values(instrumentInstructions).forEach((instrumentInstruction) => {
          compositionByInstructionIdRef.current[instrumentInstruction.noteId] = instrumentInstruction;
        });
      });
    });
    compositionRef.current = newComposition;
    if (_.isEqual(Object.keys(compositionByInstructionIdRef), Object.keys(prevCompositionByInstructionId))) {
      return;
    }
    _setComposition(newComposition);
  }, []);

  const convertCompositionByInstrumentToComposition = useCallback((
    compositionByInstrument: CompositionByInstrument
  ) => {
    instructionIdRef.current = 0;
    const composition: Composition = {};
    Object.entries(compositionByInstrument).forEach(([userInstrumentIndex, instructions]) => {
      instructions.forEach((instruction) => {
        const midiBeat = instruction[0] as number;
        const midiNote = instruction[1] as number;
        const noteWidth = instruction[2] as number;
        const subdivisionType = instruction[3] as SubdivisionType || 'q';
        const newInstruction: InstrumentInstruction = {
          noteId: ++instructionIdRef.current,
          userInstrumentIndex: parseInt(userInstrumentIndex),
          midiBeat,
          midiNote,
          noteWidth,
          subdivisionType,
        }
        if (!composition[midiBeat]) composition[midiBeat] = {};
        if (!composition[midiBeat][midiNote]) composition[midiBeat][midiNote] = {};
        composition[midiBeat][midiNote][newInstruction.noteId] = newInstruction;
      });
    });
    return composition;
  }, []);
  const removeCompositionNotes = useCallback((idsToRemove: string[]) => {
    const newComposition = { ...compositionRef.current };
    idsToRemove.forEach((id) => {
      const instrumentInstruction = compositionByInstructionIdRef.current[id];
      if (!instrumentInstruction) return;
      const { midiBeat, midiNote, noteId } = instrumentInstruction;
      delete newComposition[midiBeat][midiNote][noteId];
      if (Object.keys(newComposition[midiBeat][midiNote]).length === 0) {
        delete newComposition[midiBeat][midiNote];
      }
      if (Object.keys(newComposition[midiBeat]).length === 0) {
        delete newComposition[midiBeat];
      }
      delete compositionByInstructionIdRef.current[noteId];
    })
    setComposition(newComposition);
  }, [setComposition]);
  const removeInstrumentFromComposition = useCallback((userInstrumentIndexToDelete: number) => {
    const newComposition = { ...compositionRef.current };
    Object.entries(newComposition).forEach(([midiBeatStr, column]) => {
      Object.entries(column).forEach(([midiNoteStr, row]) => {
        Object.entries(row).forEach(([noteIdStr, instrumentInstruction]) => {
          const midiBeat = parseInt(midiBeatStr);
          const midiNote = parseInt(midiNoteStr);
          const noteId = parseInt(noteIdStr);
          if (instrumentInstruction.userInstrumentIndex === userInstrumentIndexToDelete) {
            delete newComposition[midiBeat][midiNote][noteId];
            if (Object.keys(newComposition[midiBeat][midiNote]).length === 0) {
              delete newComposition[midiBeat][midiNote];
            }
            if (Object.keys(newComposition[midiBeat]).length === 0) {
              delete newComposition[midiBeat];
            }
          } else if (instrumentInstruction.userInstrumentIndex > userInstrumentIndexToDelete) {
            newComposition[midiBeat][midiNote][noteId].userInstrumentIndex -= 1;
          }
        });
      });
    });
    setComposition(newComposition);
  }, [setComposition]);
  const addCompositionNotes = useCallback(
    (notesToAdd: (Omit<InstrumentInstruction, 'noteId'> & { noteId?: number })[]) => {
      const newComposition = { ...compositionRef.current };
      notesToAdd.forEach((noteToAdd) => {
        const { midiBeat, midiNote } = noteToAdd;
        if (!newComposition[midiBeat]) newComposition[midiBeat] = {};
        if (!newComposition[midiBeat][midiNote]) newComposition[midiBeat][midiNote] = {};
        const noteId = noteToAdd.noteId || ++instructionIdRef.current;
        const newInstrumentInstruction = {
          ...noteToAdd,
          noteId,
        };
        newComposition[midiBeat][midiNote][noteId] = newInstrumentInstruction;
        compositionByInstructionIdRef.current[noteId] = newInstrumentInstruction;
      });
      setComposition(newComposition);
    },
    [setComposition]
  );

  const handlePlayComposition = useCallback(() => {
    setPlayheadPosX(0);
    setIsPlaying(true);
    playheadBeatRef.current = 1;
    const bpm = tempo;
    const bps = bpm / 60.0;
    const nthNoteDivision = 4.0;
    const nthNotesPerSec = bps * nthNoteDivision;
    const beatLengthInSeconds = 1 / nthNotesPerSec;
    const beatLengthInMs = beatLengthInSeconds * 1000;
    // TODO(jaketrower): totally based on bpm... 120 beats per minute = 2 beats per second, 32 noteBlocks per second = duration of 0.03125
    // so beatLengthInSeconds = tempo / 2
    function scheduler() {
      // While there are notes that will need to play before the next interval,
      // schedule them and advance the pointer.
      // while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
      //   scheduleNote(currentNote, nextNoteTime);
      //   nextNote();
      // }
      const midiBeat = playheadBeatRef.current;
      const now = audioContext.currentTime;
      if (compositionRef.current[midiBeat]) {
        Object.values(compositionRef.current[midiBeat]).forEach((midiNoteInstructions) => 
          Object.values(midiNoteInstructions).forEach((instrumentInstruction) => {
            const { midiNote } = instrumentInstruction;
            // TODO(jaketrower): in order to achieve ^^, will need playhead to instantiate sampler play at runtime,
            // rather than preprogram them all at PLAY button press...
            const userInstrumentToPlay =
              userInstruments[instrumentInstruction.userInstrumentIndex];
            if (!userInstrumentToPlay?.sf2Sampler) return;
            const durationSec = beatLengthInSeconds * instrumentInstruction.noteWidth;
            const tripletBeatOffsetInSeconds = instrumentInstruction.subdivisionType === SubdivisionType.q
              ? 0
              : ((midiBeat - 1) % 4) * beatLengthInSeconds * ((beatLengthInSeconds * 4.0) / 3.0);
            userInstrumentToPlay.sf2Sampler.start({
              note: midiNote,
              time: now + tripletBeatOffsetInSeconds,
              duration: durationSec,
            });
          })
        );
      }
      setPlayheadPosX(BEAT_WIDTH * playheadBeatRef.current);
      playheadBeatRef.current++;
      playerIdRef.current = window.setTimeout(scheduler, beatLengthInMs);
    }
    window.setTimeout(scheduler, 0);
  }, [audioContext, setPlayheadPosX, tempo, userInstruments]);

  const handleStopComposition = useCallback(() => {
    if (playerIdRef.current) {
      window.clearTimeout(playerIdRef.current);
    }
    playerIdRef.current = undefined;
    userInstruments.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    });
    playheadBeatRef.current = 1;
    setPlayheadPosX(0);
    setIsPlaying(false);
  }, [setPlayheadPosX, userInstruments]);

  const handleStartLoop = useCallback(() => {
    setIsLooping(true);
  }, []);
  const handleStopLoop = useCallback(() => {
    setIsLooping(false);
  }, []);

  const handleClearComposition = useCallback(() => {
    const shouldDelete = window.confirm(
      "Are you sure you want to destroy your creation?"
    );
    if (!shouldDelete) return;
    userInstruments.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    });
    playheadBeatRef.current = 1;
    setPlayheadPosX(0);
    setComposition({});
    setIsPlaying(false);
    setUserInstrumentIndex(0);
    setUserInstruments([getNewUserInstrument(audioContext, 0)]);
    setHowManyInstrumentsIEverMade(1);
  }, [audioContext, getNewUserInstrument, setComposition, setHowManyInstrumentsIEverMade, setPlayheadPosX, setUserInstrumentIndex, setUserInstruments, userInstruments]);

  return (
    <CompositionContext value={{
      compositionByInstructionIdRef,
      composition,
      compositionRef,
      setComposition,
      convertCompositionByInstrumentToComposition,
      isCompositionMouseDownRef,
      onCompositionMouseUpRef,
      subdivisionType,
      subdivisionTypeRef,
      setSubdivisionType,
      heldPianoKeys,
      setHeldPianoKeys,
      clickedNoteRef,
      setClickedNote,
      selectedNotesRef,
      setSelectedNotes,
      addCompositionNotes,
      removeCompositionNotes,
      removeInstrumentFromComposition,
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
  compositionByInstructionIdRef: React.RefObject<Record<string, InstrumentInstruction>>,
  composition: Composition,
  compositionRef: React.RefObject<Composition>,
  setComposition: (composition: Composition) => void,
  convertCompositionByInstrumentToComposition: (compositionByInstrument: CompositionByInstrument) => Composition,
  isCompositionMouseDownRef: React.RefObject<boolean>,
  onCompositionMouseUpRef: React.RefObject<(() => void) | undefined>,
  subdivisionType: SubdivisionType,
  subdivisionTypeRef: React.RefObject<SubdivisionType>,
  setSubdivisionType: (type: SubdivisionType) => void,
  heldPianoKeys: Record<string, boolean>,
  setHeldPianoKeys: (keys: Record<string, boolean>) => void,
  addCompositionNotes: (notesToAdd: (
    Omit<InstrumentInstruction, "noteId"> & {
      noteId?: number;
    })[]) => void,
  removeCompositionNotes: (noteIdsToRemove: string[]) => void,
  removeInstrumentFromComposition: (userInstrumentIndex: number) => void,
  clickedNoteRef: React.RefObject<InstrumentInstruction | undefined>,
  setClickedNote: (note: InstrumentInstruction | undefined) => void
  selectedNotesRef: React.RefObject<Record<string, InstrumentInstructionWithOffset>>,
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