import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { TodoList } from "../TodoList";
import { CompositionCanvas } from "./composition/CompositionCanvas";
import { UserInstrumentsHeader } from "./UserInstrumentsHeader";
import { AudioContextContext, getARandomNote, InputMode, keyboardPianoKeys, NoteIdWithOffset, SubdivisionType } from "./consts";
import { CompositionActionsContext, CompositionContext } from "./contexts/CompositionContextProvider";
import { SongOptionsHeader } from "./SongOptionsHeader";
import { UserInstrumentContext } from "./contexts/UserInstrumentContextProvider";
import { ActionButtons } from "./ActionButtons";
import { SubdivisionTypeContext } from "./contexts/SubdivisionTypeContextProvider";
import { PristineContext } from "./contexts/PristineContextProvider";
import { BabyDanceFrameContext, PlayheadContext, PlayheadPosXContext } from "./contexts/PlayheadContextProvider";

const MaestroContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Header = styled.div`
  max-width: 960px;
  display: flex;
  flex-direction: column;
`;

const BabyPlayheadImg = styled.img<{ $frame: number }>`
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  background-image: url("baby_dance_sheet.png");
  position: absolute;
  top: -6px;
  left: 0;
  background-position: ${({ $frame }) => `${$frame * -20}px 0px`};
`;

const Footer = styled.div`
  max-width: 960px;
  display: flex;
  flex-direction: column;
`;

function PlayheadNode() {
  const { babyDanceFrame } = useContext(BabyDanceFrameContext)!;
  const { playheadPosX } = useContext(PlayheadPosXContext)!;

  return (
    <div style={{ marginLeft: 22, height: 15, content: ' ', position: 'relative' }}>
      <BabyPlayheadImg src="trans.png" $frame={babyDanceFrame} style={{
        left: playheadPosX,
        }}/>
    </div>
  );
}

export function Maestro() {
  const [_inputMode, _setInputMode] = useState(InputMode.DEFAULT);
  const audioContext = useContext(AudioContextContext)!;
  const { incrementBabyDanceFrame } = useContext(PlayheadContext)!;
  const { pristine } = useContext(PristineContext)!;

  const {
    userInstrumentsRef,
    userInstrumentIndexRef,
    setUserInstrumentIndex,
  } = useContext(UserInstrumentContext)!;
  const { 
    subdivisionTypeRef,
    setSubdivisionType,
  } = useContext(SubdivisionTypeContext)!;
  const {
    compositionByInstructionIdRef,
    isCompositionMouseDownRef,
    setIsCompositionMouseDown,
    onCompositionMouseUpRef,
    clickedNoteRef,
    setClickedNote,
    selectedNotesRef,
    setSelectedNotes,
    heldPianoKeys,
    setHeldPianoKeys,
    isPlaying,
  } = useContext(CompositionContext)!;
  const {
    removeCompositionNotes,
    handleStopComposition,
    handlePlayComposition,
  } = useContext(CompositionActionsContext)!;

  const inputModeRef = useRef(_inputMode);
  const setInputMode = useCallback((newInputMode: InputMode) => {
    inputModeRef.current = newInputMode;
    _setInputMode(newInputMode);
  }, []);
  const trySetInputMode = useCallback((newInputMode: InputMode) => {
    if (isCompositionMouseDownRef.current) return;
    setInputMode(newInputMode);
  }, [isCompositionMouseDownRef, setInputMode]);

  const onToggleSubdivisionType = useCallback(() => {
      if (subdivisionTypeRef.current === SubdivisionType.q) {
        setSubdivisionType(SubdivisionType.t);
      } else if (subdivisionTypeRef.current === SubdivisionType.t) {
        setSubdivisionType(SubdivisionType.q);
      }
    }, [setSubdivisionType, subdivisionTypeRef]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.repeat) {
        return;
      }
      if (document.activeElement?.tagName === "INPUT") {
        return;
      }
      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        setSelectedNotes({
          ...(Object.entries(compositionByInstructionIdRef.current).reduce((acc, [noteId, _]) => ({
            ...acc,
            [noteId]: {
              noteId: parseInt(noteId),
              offset: { x: 0, y: 0 },
            },
          }), {} as Record<string, NoteIdWithOffset>)),
        });
        e.preventDefault();
        return false;
      }
      if (e.key === "q") {
        onToggleSubdivisionType();
        return false;
      }
      if (e.key === "Backspace") {
        if (isCompositionMouseDownRef.current) {
          setIsCompositionMouseDown(false);
        }
        if (Object.keys(selectedNotesRef.current).length > 0) {
          removeCompositionNotes(Object.keys(selectedNotesRef.current));
          setSelectedNotes({});
          setClickedNote(undefined);
        } else if (clickedNoteRef.current) {
          removeCompositionNotes([clickedNoteRef.current.toString()]);
          setClickedNote(undefined);
        }
        return false;
      }
      if (e.key === "Escape") {
        if (isCompositionMouseDownRef.current) {
          setIsCompositionMouseDown(false);
        }
        if (clickedNoteRef.current) {
          setClickedNote(undefined);
        }
        if (Object.keys(selectedNotesRef.current).length > 0) {
          setSelectedNotes({});
        }
        return false;
      }
      if (!Number.isNaN(parseInt(e.key))) {
        let index = parseInt(e.key);
        if (index === 0) {
          index = 9;
        } else {
          index -= 1
        }
        if (userInstrumentsRef.current.length > index) {
          setUserInstrumentIndex(index);
          userInstrumentsRef.current[index].sf2Sampler?.start({ note: getARandomNote(), duration: 0.25 });
        }
        return false;
      }
      if (e.key === "Shift") {
        trySetInputMode(InputMode.SELECT);
        if (isCompositionMouseDownRef.current) {
          onCompositionMouseUpRef.current = () => setInputMode(InputMode.SELECT);
        }
        return false;
      }
      if (e.code === "Space") {
        isPlaying ? handleStopComposition() : handlePlayComposition({});
        e.preventDefault();
        return false;
      }
      const playedNote = keyboardPianoKeys.has(e.key)
        ? keyboardPianoKeys.get(e.key)
        : undefined;
      if (!playedNote) return;
      heldPianoKeys[playedNote] = true;
      setHeldPianoKeys({...heldPianoKeys});
      const currUserInstrument = userInstrumentsRef.current[userInstrumentIndexRef.current];
      if (!currUserInstrument.sf2Sampler) return;
      currUserInstrument.sf2Sampler.start({
        note: playedNote,
        time: audioContext.currentTime,
        duration: 0.25,
      });
      incrementBabyDanceFrame();
    },
    [heldPianoKeys, setHeldPianoKeys, userInstrumentsRef, userInstrumentIndexRef, audioContext.currentTime, incrementBabyDanceFrame, setSelectedNotes, compositionByInstructionIdRef, onToggleSubdivisionType, isCompositionMouseDownRef, selectedNotesRef, clickedNoteRef, setIsCompositionMouseDown, removeCompositionNotes, setClickedNote, setUserInstrumentIndex, trySetInputMode, onCompositionMouseUpRef, setInputMode, isPlaying, handleStopComposition, handlePlayComposition]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Shift") {
      trySetInputMode(InputMode.DEFAULT);
      if (isCompositionMouseDownRef.current) {
        onCompositionMouseUpRef.current = () => setInputMode(InputMode.DEFAULT);
      }
      return false;
    }
    const playedNote = keyboardPianoKeys.has(e.key)
      ? keyboardPianoKeys.get(e.key)
      : undefined;
    if (!playedNote) return;
    delete heldPianoKeys[playedNote];
    setHeldPianoKeys({...heldPianoKeys});
  }, [heldPianoKeys, setHeldPianoKeys, trySetInputMode, isCompositionMouseDownRef, onCompositionMouseUpRef, setInputMode]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp)
    };
  }, [handleKeyDown, handleKeyUp]);
  useEffect(() => {
    if (pristine) {
      window.onbeforeunload = null;
    } else {
      window.onbeforeunload = () => { return true; };
    }
    return () => {
      window.onbeforeunload = null;
    }
  }, [pristine]);

  return (
    <MaestroContainer>
      <Header>
        <SongOptionsHeader />
        <UserInstrumentsHeader />
      </Header>
      {/* TODO(jaketrower): Can I refactor this now after the ref refactors? */}
      {/* Pass setInputMode in directly since we are firing it at the end of a handleMouseUp callback and
        * isCompositionMouseDown won't update the state and the trySetInputMode function until after the event bubbling */}
      <PlayheadNode />
      <CompositionCanvas _inputMode={_inputMode} inputModeRef={inputModeRef} setInputMode={setInputMode} />
      <Footer>
        <ActionButtons _inputMode={_inputMode} setInputMode={trySetInputMode} />
        <br />
        <div style={{ textAlign: 'left'}}>
        <TodoList />
        <h3>&nbsp;&nbsp;&nbsp;Tips!</h3>
        <ul>
          <li>Click (and drag) the grid to place notes!</li>
          <li>Click a note again to delete it.</li>
          <li>Use asdfghjkl;wetyuop keys to practice!</li>
          <li>Use 1, 2, 3, etc. to quickly swap between instruments!</li>
          <li>Use shift to quickly swap between note pencil and select mode!</li>
          <li>Use Q to toggle triplet-mode! </li>
        </ul>
        </div>
      </Footer>
    </MaestroContainer>
  );
}
