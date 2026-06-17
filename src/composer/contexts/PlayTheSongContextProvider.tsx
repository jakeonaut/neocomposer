import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { PlayheadPosXContext } from "./PlayheadPosXContextProvider";
import { PlayheadContext } from "./PlayheadContextProvider";
import { AudioContextContext, getBeatLengthInMs, getEndOfMeasureToLoopAtBeat, playCompositionNotesAtBeat } from "../consts";
import { UserInstrumentContext } from "./UserInstrumentContextProvider";
import { SongSettingsContext } from "./SongSettingsContextProvider";
import { TimeSignatureContext } from "./TimeSignatureContextProvider";
import { ClipboardContext } from "./ClipboardContextProvider";
import { CompositionActionsContext } from "./CompositionActionsContextProvider";
import { BeatSizeContext } from "./BeatSizeContextProvider";
import { UndoRedoContext } from "./UndoRedoContextProvider";

export function PlayTheSongContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const audioContext = useContext(AudioContextContext)!;
  const { timeSignatureRef } = useContext(TimeSignatureContext)!;
  const {
    userInstrumentsRef,
    setHowManyInstrumentsIEverMade,
    setUserInstruments,
    getNewUserInstrument,
    setUserInstrumentIndex,
  } = useContext(UserInstrumentContext)!;
  const { beatWidthRef } = useContext(BeatSizeContext)!;
  const { setCopiedNotes } = useContext(ClipboardContext)!;
  const { playheadPosXRef, setPlayheadPosX } = useContext(PlayheadPosXContext)!;
  const {
    userPlayheadBoundsRef,
  } = useContext(PlayheadContext)!;
  const {
    compositionRef,
    farthestRightNoteEndRef,
    setFarthestRightNoteEnd,
    setComposition,
  } = useContext(CompositionActionsContext)!;
  const { clearUndoStack } = useContext(UndoRedoContext)!;

  const [babyDanceFrame, _setBabyDanceFrame] = useState(0);
  const incrementBabyDanceFrame = useCallback(
    () => _setBabyDanceFrame((prev) => (prev < 3 ? prev + 1 : 0)),
    []
  );
  const [_isPlaying, _setIsPlaying] = useState<boolean>(false);
  const [_isLooping, _setIsLooping] = useState<boolean>(true);
  
  const isLoopingRef = useRef(_isLooping);
  const isPlayingRef = useRef(_isPlaying);

  const songPlayerIdRef = useRef(undefined as number | undefined);
  const { tempoRef } = useContext(SongSettingsContext)!;

  const setIsPlaying = useCallback((newIsPlaying: boolean) => {
    isPlayingRef.current = newIsPlaying;
    _setIsPlaying(newIsPlaying);
  }, [_setIsPlaying, isPlayingRef])
  const setIsLooping = useCallback((newIsLooping: boolean) => {
    isLoopingRef.current = newIsLooping;
    _setIsLooping(newIsLooping);
  }, [_setIsLooping, isLoopingRef]);

  const handleStopComposition = useCallback(() => {
    if (songPlayerIdRef.current) {
      window.clearTimeout(songPlayerIdRef.current);
    }
    songPlayerIdRef.current = undefined;
    userInstrumentsRef.current.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    });
    setPlayheadPosX(beatWidthRef.current * (userPlayheadBoundsRef.current?.start !== undefined ? userPlayheadBoundsRef.current.start + 1 : 0));
    setIsPlaying(false);
  }, [beatWidthRef, setIsPlaying, setPlayheadPosX, userInstrumentsRef, userPlayheadBoundsRef]);

  const playNextBeatScheduler = useCallback(() => {
    const endOfMeasureToLoopAtBeat = getEndOfMeasureToLoopAtBeat(
      farthestRightNoteEndRef.current, 
      timeSignatureRef.current,
      userPlayheadBoundsRef.current,
    );
    const shouldLoop = isLoopingRef.current && (
      userPlayheadBoundsRef.current?.end
        ? (playheadPosXRef.current === userPlayheadBoundsRef.current.end * beatWidthRef.current)
        : (playheadPosXRef.current === endOfMeasureToLoopAtBeat * beatWidthRef.current)
    );
    // const shouldStop = !isLoopingRef.current && (
    //   userPlayheadBoundsRef.current?.end && playheadPosXRef.current === userPlayheadBoundsRef.current.end + 1
    // );
    const shouldStop = !isLoopingRef.current && (
      userPlayheadBoundsRef.current?.end
        ? (playheadPosXRef.current === userPlayheadBoundsRef.current.end * beatWidthRef.current)
        : false
    );
    if (shouldLoop) {
      setPlayheadPosX(beatWidthRef.current * (userPlayheadBoundsRef.current?.start !== undefined ? userPlayheadBoundsRef.current.start + 1 : 1));
    } else if (shouldStop) {
      handleStopComposition();
      return;
    } else {
      setPlayheadPosX(playheadPosXRef.current + beatWidthRef.current);
    }

    // While there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    // while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
    //   scheduleNote(currentNote, nextNoteTime);
    //   nextNote();
    // }
    const midiBeat = playheadPosXRef.current / beatWidthRef.current;
    playCompositionNotesAtBeat({
      audioContext,
      composition: compositionRef.current,
      midiBeat,
      tempo: tempoRef.current,
      userInstruments: userInstrumentsRef.current,
      incrementBabyDanceFrame,
    });
    const beatLengthInMs = getBeatLengthInMs(tempoRef.current);
    songPlayerIdRef.current = window.setTimeout(playNextBeatScheduler, beatLengthInMs);
  }, [audioContext, beatWidthRef, compositionRef, farthestRightNoteEndRef, handleStopComposition, incrementBabyDanceFrame, playheadPosXRef, setPlayheadPosX, tempoRef, timeSignatureRef, userInstrumentsRef, userPlayheadBoundsRef]);

  const handleQuickPlayResetAtCurrentBeat = useCallback(() => {
    if (songPlayerIdRef.current) {
      window.clearTimeout(songPlayerIdRef.current);
    }
    const midiBeat = playheadPosXRef.current / beatWidthRef.current;
    playCompositionNotesAtBeat({
      audioContext,
      composition: compositionRef.current,
      midiBeat,
      tempo: tempoRef.current,
      userInstruments: userInstrumentsRef.current,
      incrementBabyDanceFrame,
    });
    const beatLengthInMs = getBeatLengthInMs(tempoRef.current);
    songPlayerIdRef.current = window.setTimeout(playNextBeatScheduler, beatLengthInMs);
  }, [audioContext, beatWidthRef, compositionRef, incrementBabyDanceFrame, playNextBeatScheduler, playheadPosXRef, tempoRef, userInstrumentsRef]);
  
  const handlePlayComposition = useCallback(({ shouldLoop }: { shouldLoop?: boolean}) => {
    if (shouldLoop !== undefined) setIsLooping(shouldLoop);
    if (isPlayingRef.current) {
      return
    }
    setIsPlaying(true);
    
    const midiBeat = playheadPosXRef.current / beatWidthRef.current;
    playCompositionNotesAtBeat({
      audioContext,
      composition: compositionRef.current,
      midiBeat,
      tempo: tempoRef.current,
      userInstruments: userInstrumentsRef.current,
      incrementBabyDanceFrame,
    });
    const beatLengthInMs = getBeatLengthInMs(tempoRef.current);
    songPlayerIdRef.current = window.setTimeout(playNextBeatScheduler, beatLengthInMs);
  }, [audioContext, beatWidthRef, compositionRef, incrementBabyDanceFrame, playNextBeatScheduler, playheadPosXRef, setIsLooping, setIsPlaying, tempoRef, userInstrumentsRef]);

  const handleStartLoop = useCallback(() => {
    setIsLooping(true);
  }, [setIsLooping]);
  const handleStopLoop = useCallback(() => {
    setIsLooping(false);
  }, [setIsLooping]);

  const handleClearComposition = useCallback(async () => {
    const shouldDelete = window.confirm(
      "Are you sure you want to destroy your creation?"
    );
    if (!shouldDelete) return;
    handleStopComposition();
    setUserInstrumentIndex(0);
    setUserInstruments([await getNewUserInstrument(audioContext, 0)]);
    setHowManyInstrumentsIEverMade(1);
    setPlayheadPosX(0);
    setFarthestRightNoteEnd(1);
    setComposition({}, false /* shouldAddToUndoStack */);
    clearUndoStack();
    setCopiedNotes([]);
  }, [audioContext, clearUndoStack, getNewUserInstrument, handleStopComposition, setComposition, setCopiedNotes, setFarthestRightNoteEnd, setHowManyInstrumentsIEverMade, setPlayheadPosX, setUserInstrumentIndex, setUserInstruments]);

  const babyDanceFrameContextProvider = useMemo(() => (<BabyDanceFrameContext value={{ babyDanceFrame }}>
    {children}
  </BabyDanceFrameContext>), [babyDanceFrame, children]);

  const contextValue = useMemo(() => ({
    handlePlayComposition,
    handleQuickPlayResetAtCurrentBeat,
    handleStopComposition,
    handleStartLoop,
    handleStopLoop,
    handleClearComposition,
    incrementBabyDanceFrame,
    _isPlaying,
    _setIsPlaying,
    isPlayingRef,
    _isLooping,
    _setIsLooping,
    isLoopingRef,
  }), [_isLooping, _isPlaying, handleClearComposition, handlePlayComposition, handleQuickPlayResetAtCurrentBeat, handleStartLoop, handleStopComposition, handleStopLoop, incrementBabyDanceFrame]);
  return (
    <PlayTheSongContext value={contextValue}>
      {babyDanceFrameContextProvider}
    </PlayTheSongContext>
  );
}

export const BabyDanceFrameContext = createContext<{
  babyDanceFrame: number,
} | undefined>(undefined);

export const PlayTheSongContext = createContext<{
  handlePlayComposition: ({ shouldLoop }: {
      shouldLoop?: boolean | undefined;
    }) => void,
  handleQuickPlayResetAtCurrentBeat: () => void,
  handleStopComposition: () => void,
  handleStartLoop: () => void,
  handleStopLoop: () => void,
  handleClearComposition: () => void,
  incrementBabyDanceFrame: () => void,
  _isPlaying: boolean,
  _setIsPlaying: (_newIsPlaying: boolean) => void,
  isPlayingRef: React.RefObject<boolean>,
  _isLooping: boolean,
  _setIsLooping: (_newIsLooping: boolean) => void,
  isLoopingRef: React.RefObject<boolean>,
} | undefined>(undefined);