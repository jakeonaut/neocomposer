import React, { useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { TodoList } from "../TodoList";
import { CompositionAndPlayhead } from "./CompositionAndPlayhead";
import { UserInstrumentsHeader } from "./UserInstrumentsHeader";
import { AudioContextContext, getARandomNote, InputMode, InstrumentInstructionWithOffset, keyboardPianoKeys, SubdivisionType } from "./consts";
import { CompositionContext } from "./contexts/CompositionContextProvider";
import { SongOptionsHeader } from "./SongOptionsHeader";
import { UserInstrumentContext } from "./contexts/UserInstrumentContextProvider";
import { SongSettingsContext } from "./contexts/SongSettingsContextProvider";
import { ActionButtons } from "./ActionButtons";

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

const Footer = styled.div`
  max-width: 960px;
  display: flex;
  flex-direction: column;
`;

export function Maestro() {
  const [inputMode, setInputMode] = useState(InputMode.DEFAULT);
  const audioContext = useContext(AudioContextContext)!;
  const {
    incrementBabyDanceFrame,
    pristine,
  } = useContext(SongSettingsContext)!;
  const {
    userInstruments,
    userInstrumentIndex,
    setUserInstrumentIndex,
  } = useContext(UserInstrumentContext)!;
  const {
    compositionByInstructionIdRef,
    isCompositionMouseDown,
    setIsCompositionMouseDown,
    setOnCompositionMouseUp,
    subdivisionType,
    setSubdivisionType,
    clickedNote,
    setClickedNote,
    selectedNotes,
    setSelectedNotes,
    heldPianoKeys,
    setHeldPianoKeys,
    removeCompositionNotes,
    isPlaying,
    handleStopComposition,
    handlePlayComposition,
  } = useContext(CompositionContext)!;

  const trySetInputMode = useCallback((newInputMode: InputMode) => {
    if (isCompositionMouseDown) return;
    setInputMode(newInputMode);
  }, [isCompositionMouseDown]);

  const onToggleSubdivisionType = useCallback(() => {
      if (subdivisionType === SubdivisionType.q) {
        setSubdivisionType(SubdivisionType.t);
      } else if (subdivisionType === SubdivisionType.t) {
        setSubdivisionType(SubdivisionType.q);
      }
    }, [setSubdivisionType, subdivisionType]);

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
          ...(Object.entries(compositionByInstructionIdRef.current).reduce((acc, [noteId, instrumentInstruction]) => ({
            ...acc,
            [noteId]: {
              instrumentInstruction,
              offset: { x: 0, y: 0 },
            },
          }), {} as Record<string, InstrumentInstructionWithOffset>)),
        });
        e.preventDefault();
        return false;
      }
      if (e.key === "q") {
        onToggleSubdivisionType();
        return false;
      }
      if (e.key === "Backspace") {
        if (isCompositionMouseDown) {
          setIsCompositionMouseDown(false);
        }
        if (Object.keys(selectedNotes).length > 0) {
          removeCompositionNotes(Object.keys(selectedNotes));
          setSelectedNotes({});
          setClickedNote(undefined);
        } else if (clickedNote) {
          removeCompositionNotes([clickedNote.noteId.toString()]);
          setClickedNote(undefined);
        }
        return false;
      }
      if (e.key === "Escape") {
        if (isCompositionMouseDown) {
          setIsCompositionMouseDown(false);
        }
        if (clickedNote) {
          setClickedNote(undefined);
        }
        if (Object.keys(selectedNotes).length > 0) {
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
        if (userInstruments.length > index) {
          setUserInstrumentIndex(index);
          userInstruments[index].sf2Sampler?.start({ note: getARandomNote(), duration: 0.25 });
        }
        return false;
      }
      if (e.key === "Shift") {
        trySetInputMode(InputMode.SELECT);
        if (isCompositionMouseDown) {
          setOnCompositionMouseUp(() => (() => setInputMode(InputMode.SELECT)));
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
      const currUserInstrument = userInstruments[userInstrumentIndex];
      if (!currUserInstrument.sf2Sampler) return;
      currUserInstrument.sf2Sampler.start({
        note: playedNote,
        time: audioContext.currentTime,
        duration: 0.25,
      });
      incrementBabyDanceFrame();
    },
    [heldPianoKeys, setHeldPianoKeys, userInstruments, userInstrumentIndex, audioContext.currentTime, incrementBabyDanceFrame, setSelectedNotes, compositionByInstructionIdRef, onToggleSubdivisionType, isCompositionMouseDown, selectedNotes, clickedNote, setIsCompositionMouseDown, removeCompositionNotes, setClickedNote, setUserInstrumentIndex, trySetInputMode, setOnCompositionMouseUp, isPlaying, handleStopComposition, handlePlayComposition]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Shift") {
      trySetInputMode(InputMode.DEFAULT);
      if (isCompositionMouseDown) {
        setOnCompositionMouseUp(() => (() => setInputMode(InputMode.DEFAULT)));
      }
      return false;
    }
    const playedNote = keyboardPianoKeys.has(e.key)
      ? keyboardPianoKeys.get(e.key)
      : undefined;
    if (!playedNote) return;
    delete heldPianoKeys[playedNote];
    setHeldPianoKeys({...heldPianoKeys});
  }, [heldPianoKeys, setHeldPianoKeys, trySetInputMode, isCompositionMouseDown, setOnCompositionMouseUp]);

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
      {/* Pass setInputMode in directly since we are firing it at the end of a handleMouseUp callback and
        * isCompositionMouseDown won't update the state and the trySetInputMode function until after the event bubbling */}
      <CompositionAndPlayhead inputMode={inputMode} setInputMode={setInputMode} />
      <Footer>
        <ActionButtons inputMode={inputMode} setInputMode={trySetInputMode} />
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
