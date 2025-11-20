import React, { useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { TodoList } from "../TodoList";
import { CompositionAndPlayhead } from "./CompositionAndPlayhead";
import { UserInstrumentsHeader } from "./UserInstrumentsHeader";
import { AudioContextContext, getARandomNote, InputMode, keyboardPianoKeys } from "./consts";
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
    isCompositionMouseDown,
    setIsCompositionMouseDown,
    setOnCompositionMouseUp,
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.repeat) {
        return;
      }
      if (document.activeElement?.tagName === "INPUT") {
        return;
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
      if (e.key === "Meta" || e.key === "Control") {
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
    [heldPianoKeys, setHeldPianoKeys, userInstruments, userInstrumentIndex, audioContext.currentTime, incrementBabyDanceFrame, isCompositionMouseDown, selectedNotes, clickedNote, setIsCompositionMouseDown, removeCompositionNotes, setSelectedNotes, setClickedNote, setUserInstrumentIndex, trySetInputMode, setOnCompositionMouseUp, isPlaying, handleStopComposition, handlePlayComposition]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Meta" || e.key === "Control") {
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
    console.log("keyup:",heldPianoKeys);
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
      <SongOptionsHeader />
      <UserInstrumentsHeader />
      {/* Pass setInputMode in directly since we are firing it at the end of a handleMouseUp callback and
        * isCompositionMouseDown won't update the state and the trySetInputMode function until after the event bubbling */}
      <CompositionAndPlayhead inputMode={inputMode} setInputMode={setInputMode} />
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
        <li>Use ctrl/cmd to quickly swap between note pencil and select mode!</li>
      </ul>
      </div>
    </MaestroContainer>
  );
}
