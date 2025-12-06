import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AudioContextContext, Composition, CompositionByInstrument, InstrumentInstruction, NoteId, NoteIdWithOffset, SubdivisionType, TimeSignature } from "../consts";
import { SongSettingsContext } from "./SongSettingsContextProvider";
import { UserInstrumentContext } from "./UserInstrumentContextProvider";
import _ from "lodash";
import { PlayheadContext } from "./PlayheadContextProvider";
import { ClipboardContext } from "./ClipboardContextProvider";
import { TimeSignatureContext } from "./TimeSignatureContextProvider";

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
  const { tempo } = useContext(SongSettingsContext)!;
  const { setCopiedNotes } = useContext(ClipboardContext)!;
  const { setPlayheadPosX, incrementBabyDanceFrame } = useContext(PlayheadContext)!;
  const {
    userInstrumentsRef,
    setHowManyInstrumentsIEverMade,
    setUserInstruments,
    getNewUserInstrument,
    setUserInstrumentIndex,
  } = useContext(UserInstrumentContext)!;
  const { timeSignatureRef } = useContext(TimeSignatureContext)!;
  const [heldPianoKeys, setHeldPianoKeys] = useState<Record<string, boolean>>({});
  const [_composition, _setComposition] = useState<Composition>({});
  const [_isCompositionMouseDown, _setIsCompositionMouseDown] = useState(false);
  const [_clickedNote, _setClickedNote] = useState<NoteId | undefined>(undefined);
  const [_selectedNotes, _setSelectedNotes] = useState<Record<string, NoteIdWithOffset>>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [_isLooping, _setIsLooping] = useState<boolean>(true);
  const [_hasUserSetStartLoopSpot, _setHasUserSetStartLoopSpot] = useState<boolean>(false);

  const hasUserSetStartLoopSpotRef = useRef(_hasUserSetStartLoopSpot);
  const farthestRightNoteEndRef = useRef(1);
  const isLoopingRef = useRef(_isLooping);
  const clickedNoteRef = useRef(_clickedNote);
  const selectedNotesRef = useRef(_selectedNotes);
  const isCompositionMouseDownRef = useRef(_isCompositionMouseDown);
  const onCompositionMouseUpRef = useRef(undefined as ((() => void) | undefined));
  const playerIdRef = useRef(undefined as number | undefined);
  const playheadBeatRef = useRef(1);
  const instructionIdRef = useRef(0);
  const compositionRef = useRef(_composition);
  const compositionByInstructionIdRef = useRef<Record<string, InstrumentInstruction>>({});
  const whenWasMouseDownedRef = useRef<number>(0);

  const manuallyUpdateFartherRightNoteEnd = useCallback(() => {
    farthestRightNoteEndRef.current = 1;
    Object.values(compositionByInstructionIdRef.current).forEach((instrumentInstruction) => {
      if (instrumentInstruction.midiBeat + instrumentInstruction.noteWidth > farthestRightNoteEndRef.current) {
        farthestRightNoteEndRef.current = instrumentInstruction.midiBeat + instrumentInstruction.noteWidth;
      }
    });
  }, []);

  const setIsLooping = useCallback((newIsLooping: boolean) => {
    isLoopingRef.current = newIsLooping;
    _setIsLooping(newIsLooping);
  }, []);
  const setIsCompositionMouseDown = useCallback((newIsCompositionMouseDown: boolean) => {
    if (newIsCompositionMouseDown && !isCompositionMouseDownRef.current){
      whenWasMouseDownedRef.current = Date.now();
    }
    isCompositionMouseDownRef.current = newIsCompositionMouseDown;
    _setIsCompositionMouseDown(newIsCompositionMouseDown);
  }, []);
  const setClickedNote = useCallback((newClickedNote: NoteId | undefined) => {
    clickedNoteRef.current = newClickedNote;
    _setClickedNote(newClickedNote);
  }, []);
  const setSelectedNotes = useCallback((newSelectedNotes: Record<string, NoteIdWithOffset>) => {
    if (_.isEqual(Object.keys(selectedNotesRef.current), Object.keys(newSelectedNotes))) {
      return;
    }
    selectedNotesRef.current = newSelectedNotes;
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
    const removedInstrumentInstructions: Record<NoteId, InstrumentInstruction> = {};
    const newComposition = { ...compositionRef.current };
    idsToRemove.forEach((id) => {
      const instrumentInstruction = compositionByInstructionIdRef.current[id];
      if (!instrumentInstruction) return;
      const { midiBeat, midiNote, noteId } = instrumentInstruction;
      removedInstrumentInstructions[noteId] = instrumentInstruction;
      delete newComposition[midiBeat][midiNote][noteId];
      if (Object.keys(newComposition[midiBeat][midiNote]).length === 0) {
        delete newComposition[midiBeat][midiNote];
      }
      if (Object.keys(newComposition[midiBeat]).length === 0) {
        delete newComposition[midiBeat];
      }
      delete compositionByInstructionIdRef.current[noteId];
      if (farthestRightNoteEndRef.current <= instrumentInstruction.midiBeat + instrumentInstruction.noteWidth) {
        manuallyUpdateFartherRightNoteEnd();
      }
    })
    setComposition(newComposition);
    return removedInstrumentInstructions;
  }, [manuallyUpdateFartherRightNoteEnd, setComposition]);
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
            if (farthestRightNoteEndRef.current <= instrumentInstruction.midiBeat + instrumentInstruction.noteWidth) {
              manuallyUpdateFartherRightNoteEnd();
            }
          } else if (instrumentInstruction.userInstrumentIndex > userInstrumentIndexToDelete) {
            newComposition[midiBeat][midiNote][noteId].userInstrumentIndex -= 1;
          }
        });
      });
    });
    setComposition(newComposition);
  }, [manuallyUpdateFartherRightNoteEnd, setComposition]);
  const addCompositionNotes = useCallback(
    (notesToAdd: (Omit<InstrumentInstruction, 'noteId'> & { noteId?: number })[]): InstrumentInstruction[] => {
      const newComposition = { ...compositionRef.current };
      const addedNotes = notesToAdd.map((noteToAdd) => {
        const { midiBeat, midiNote, noteWidth } = noteToAdd;
        if (!newComposition[midiBeat]) newComposition[midiBeat] = {};
        if (!newComposition[midiBeat][midiNote]) newComposition[midiBeat][midiNote] = {};
        if (midiBeat + noteWidth > farthestRightNoteEndRef.current) {
          farthestRightNoteEndRef.current = midiBeat + noteWidth;
        }
        const noteId = noteToAdd.noteId || ++instructionIdRef.current;
        const newInstrumentInstruction = {
          ...noteToAdd,
          noteId,
        };
        newComposition[midiBeat][midiNote][noteId] = newInstrumentInstruction;
        compositionByInstructionIdRef.current[noteId] = newInstrumentInstruction;
        return newInstrumentInstruction;
      });
      setComposition(newComposition);
      return addedNotes;
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
              userInstrumentsRef.current[instrumentInstruction.userInstrumentIndex];
            if (!userInstrumentToPlay?.sf2Sampler) return;
            const durationSec = beatLengthInSeconds * instrumentInstruction.noteWidth;
            const tripletBeatOffsetInSeconds = instrumentInstruction.subdivisionType === SubdivisionType.q
              ? 0
              : ((midiBeat - 1) % 4) * beatLengthInSeconds * ((beatLengthInSeconds * 4.0) / 3.0);
            userInstrumentToPlay.sf2Sampler.start({
              note: midiNote,
              time: now + tripletBeatOffsetInSeconds,
              duration: durationSec,
              onStart: () => incrementBabyDanceFrame()
            });
          })
        );
      }
      setPlayheadPosX(BEAT_WIDTH * playheadBeatRef.current);
      const timeSignature = timeSignatureRef.current === TimeSignature.ts4_4 ? 4 : 3;
      const measureBeatMultiplier = 4 * timeSignature;
      const endOfMeasureToLoopAtBeat = (
        Math.ceil(
          farthestRightNoteEndRef.current / measureBeatMultiplier
        ) * measureBeatMultiplier
      );
      const shouldLoop = isLoopingRef.current && !hasUserSetStartLoopSpotRef.current && (playheadBeatRef.current >= endOfMeasureToLoopAtBeat);
      if (shouldLoop) {
        playheadBeatRef.current = 1;
      } else {
        playheadBeatRef.current++;
      }
      playerIdRef.current = window.setTimeout(scheduler, beatLengthInMs);
    }
    playerIdRef.current = window.setTimeout(scheduler, 0);
  }, [audioContext.currentTime, incrementBabyDanceFrame, setPlayheadPosX, tempo, timeSignatureRef, userInstrumentsRef]);

  const handleStopComposition = useCallback(() => {
    if (playerIdRef.current) {
      window.clearTimeout(playerIdRef.current);
    }
    playerIdRef.current = undefined;
    userInstrumentsRef.current.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    });
    playheadBeatRef.current = 1;
    setPlayheadPosX(0);
    setIsPlaying(false);
  }, [setPlayheadPosX, userInstrumentsRef]);

  const handleStartLoop = useCallback(() => {
    setIsLooping(true);
  }, [setIsLooping]);
  const handleStopLoop = useCallback(() => {
    setIsLooping(false);
  }, [setIsLooping]);

  const handleClearComposition = useCallback(() => {
    const shouldDelete = window.confirm(
      "Are you sure you want to destroy your creation?"
    );
    if (!shouldDelete) return;
    handleStopComposition();
    setUserInstrumentIndex(0);
    setUserInstruments([getNewUserInstrument(audioContext, 0)]);
    setHowManyInstrumentsIEverMade(1);
    farthestRightNoteEndRef.current = 1;
    setComposition({});
    setCopiedNotes([]);
  }, [audioContext, getNewUserInstrument, handleStopComposition, setComposition, setCopiedNotes, setHowManyInstrumentsIEverMade, setUserInstrumentIndex, setUserInstruments]);

  const compositionActionsContextProvider = useMemo(() => (
    <CompositionActionsContext value={{
      addCompositionNotes,
      removeCompositionNotes,
      removeInstrumentFromComposition,
      handlePlayComposition,
      handleStopComposition,
      handleClearComposition,
      handleStartLoop,
      handleStopLoop,
    }}>
      {children}
    </CompositionActionsContext>
  ), [addCompositionNotes, children, handleClearComposition, handlePlayComposition, handleStartLoop, handleStopComposition, handleStopLoop, removeCompositionNotes, removeInstrumentFromComposition]);
  return (
    <CompositionContext value={{
      instructionIdRef,
      compositionByInstructionIdRef,
      _composition, compositionRef, setComposition,
      convertCompositionByInstrumentToComposition,
      _isCompositionMouseDown, isCompositionMouseDownRef, setIsCompositionMouseDown,
      manuallyUpdateFartherRightNoteEnd,
      whenWasMouseDownedRef,
      onCompositionMouseUpRef,
      heldPianoKeys,
      setHeldPianoKeys,
      _clickedNote, clickedNoteRef, setClickedNote,
      _selectedNotes, selectedNotesRef, setSelectedNotes,
      isPlaying,
      _isLooping,
    }}>
      {compositionActionsContextProvider}
    </CompositionContext>
  );
}

export const CompositionContext = createContext<{
  instructionIdRef: React.RefObject<number>,
  compositionByInstructionIdRef: React.RefObject<Record<string, InstrumentInstruction>>,
  _composition: Composition,
  compositionRef: React.RefObject<Composition>,
  setComposition: (composition: Composition) => void,
  convertCompositionByInstrumentToComposition: (compositionByInstrument: CompositionByInstrument) => Composition,
  _isCompositionMouseDown: boolean,
  isCompositionMouseDownRef: React.RefObject<boolean>,
  setIsCompositionMouseDown: (newIsCompositionMouseDown: boolean) => void,
  manuallyUpdateFartherRightNoteEnd: () => void,
  whenWasMouseDownedRef: React.RefObject<number>,
  onCompositionMouseUpRef: React.RefObject<(() => void) | undefined>,
  heldPianoKeys: Record<string, boolean>,
  setHeldPianoKeys: (keys: Record<string, boolean>) => void,
  _clickedNote: NoteId | undefined,
  clickedNoteRef: React.RefObject<NoteId | undefined>,
  setClickedNote: (noteId: NoteId | undefined) => void,
  _selectedNotes: Record<string, NoteIdWithOffset>,
  selectedNotesRef: React.RefObject<Record<string, NoteIdWithOffset>>,
  setSelectedNotes: (notes: Record<string, NoteIdWithOffset>) => void,
  isPlaying: boolean,
  _isLooping: boolean,
} | undefined>(undefined);

export const CompositionActionsContext = createContext<{
  addCompositionNotes: (notesToAdd: (
    Omit<InstrumentInstruction, "noteId"> & {
      noteId?: NoteId;
    })[]) => InstrumentInstruction[],
  removeCompositionNotes: (noteIdsToRemove: string[]) => Record<NoteId, InstrumentInstruction>,
  removeInstrumentFromComposition: (userInstrumentIndex: number) => void,
  handlePlayComposition: ({ wasStartedFromLoop }: {
      wasStartedFromLoop?: boolean | undefined;
    }) => void,
  handleStopComposition: () => void,
  handleClearComposition: () => void,
  handleStartLoop: () => void,
  handleStopLoop: () => void,
} | undefined>(undefined);