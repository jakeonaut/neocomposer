import React, { useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { TodoList } from "../TodoList";
import { CompositionAndPlayhead } from "./CompositionAndPlayhead";
import { UserInstrumentsHeader } from "./UserInstrumentsHeader";
import { AudioContextContext, InputMode, sf2DefaultColours, UserInstrument } from "./consts";
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

const keyboardPianoKeys = new Map(
  Object.entries({
    a: "C4",
    w: "Db4",
    s: "D4",
    e: "Eb4",
    d: "E4",
    f: "F4",
    t: "Gb4",
    g: "G4",
    y: "Ab4",
    h: "A4",
    u: "Bb4",
    j: "B4",
    k: "C5",
    o: "Db5",
    l: "D5",
    p: "Eb5",
    ";": "E5",
    "'": "F5",
  })
);

export function Maestro() {
  const [inputMode, setInputMode] = useState(InputMode.DEFAULT);
  const audioContext = useContext(AudioContextContext)!;
  const {
    babyDanceFrame,
    incrementBabyDanceFrame,
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
          userInstruments[index].sf2Sampler?.start({ note: 'C4', duration: 0.25 });
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
      console.log("keydown before:",heldPianoKeys);
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
    [
      heldPianoKeys,
      userInstruments,
      userInstrumentIndex,
      audioContext,
      incrementBabyDanceFrame,
      isPlaying,
      handleStopComposition,
      handlePlayComposition,
      trySetInputMode,
      isCompositionMouseDown,
      selectedNotes,
    ]
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
  }, [trySetInputMode, isCompositionMouseDown, heldPianoKeys]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp)
    };
  }, [handleKeyDown, handleKeyUp]);

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
