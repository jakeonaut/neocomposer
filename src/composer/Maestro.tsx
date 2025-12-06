import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { TodoList } from "../TodoList";
import { CompositionCanvas } from "./composition/CompositionCanvas";
import { UserInstrumentsHeader } from "./UserInstrumentsHeader";
import { AudioContextContext, getARandomNote, InputMode, keyboardPianoKeys, NoteIdWithOffset, SubdivisionType, TimeSignature } from "./consts";
import { CompositionActionsContext, CompositionContext } from "./contexts/CompositionContextProvider";
import { SongOptionsHeader } from "./SongOptionsHeader";
import { UserInstrumentContext } from "./contexts/UserInstrumentContextProvider";
import { ActionButtonFooter } from "./ActionButtonFooter";
import { SubdivisionTypeContext } from "./contexts/SubdivisionTypeContextProvider";
import { PristineContext } from "./contexts/PristineContextProvider";
import { BabyDanceFrameContext, PlayheadContext, PlayheadPosXContext } from "./contexts/PlayheadContextProvider";
import { ClipboardContext } from "./contexts/ClipboardContextProvider";
import { TimeSignatureContext } from "./contexts/TimeSignatureContextProvider";

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
    timeSignatureRef,
    setTimeSignature,
  } = useContext(TimeSignatureContext)!;
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
  const { copiedNotesRef, setCopiedNotes, copiedNotesOffsetRef } = useContext(ClipboardContext)!;
  const {
    addCompositionNotes,
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

  const onToggleTimeSignature = useCallback(() => {
    if (timeSignatureRef.current === TimeSignature.ts4_4) {
      setTimeSignature(TimeSignature.ts3_4);
    } else if (timeSignatureRef.current === TimeSignature.ts3_4) {
      setTimeSignature(TimeSignature.ts4_4);
    }
  }, [setTimeSignature, timeSignatureRef]);

  const tryCopySelectedNotes = useCallback(() => {
    copiedNotesOffsetRef.current = 0;
    if (Object.keys(selectedNotesRef.current).length > 0) {
      let leftmostMidiBeat = 99999;
      let rightmostMidiBeat = -99999;
      const newlyCopiedNotes = Object.keys(selectedNotesRef.current).map((noteId) => {
        const selectedNote = compositionByInstructionIdRef.current[noteId];
        const { midiBeat, noteWidth } = selectedNote;
        if (midiBeat < leftmostMidiBeat) leftmostMidiBeat = midiBeat;
        if (midiBeat + noteWidth > rightmostMidiBeat) rightmostMidiBeat = midiBeat + noteWidth;
        return {
          ...selectedNote,
          noteId: -1,
        }
      });
      setCopiedNotes(newlyCopiedNotes);
      copiedNotesOffsetRef.current = rightmostMidiBeat - leftmostMidiBeat;
    } else if (clickedNoteRef.current) {
      const clickedNote = compositionByInstructionIdRef.current[clickedNoteRef.current];
      setCopiedNotes([{
        ...clickedNote,
        noteId: -1,
      }]);
      copiedNotesOffsetRef.current = clickedNote.noteWidth;
    }
  }, [clickedNoteRef, compositionByInstructionIdRef, copiedNotesOffsetRef, selectedNotesRef, setCopiedNotes]);

  const tryDeleteSelectedNotes = useCallback(() => {
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
  }, [clickedNoteRef, isCompositionMouseDownRef, removeCompositionNotes, selectedNotesRef, setClickedNote, setIsCompositionMouseDown, setSelectedNotes]);

  const tryCutSelectedNotes = useCallback(() => {
    tryCopySelectedNotes();
    tryDeleteSelectedNotes();
    copiedNotesOffsetRef.current = 0;
  }, [copiedNotesOffsetRef, tryCopySelectedNotes, tryDeleteSelectedNotes]);

  const tryPasteCopiedNotes = useCallback(() => {
    console.log("TODO: test this while dragging other selected notes...");
    console.log("TODO: need to test the midiBeat increase with different copied subdivision types?")
    const copiedNotes = Object.values(copiedNotesRef.current);
    if (copiedNotes.length === 0) return;
    const possibleOldUserInstrumentIndex = copiedNotes[0].userInstrumentIndex;
    let newUserInstrumentIndex = -1;
    if (copiedNotes.every((note) => note.userInstrumentIndex === possibleOldUserInstrumentIndex)) {
      newUserInstrumentIndex = userInstrumentIndexRef.current;
    }
    const notesToPaste = copiedNotes.map((copiedNote) => {
      return {
        ...copiedNote,
        noteId: undefined,
        midiBeat: copiedNote.midiBeat + copiedNotesOffsetRef.current,
        ...(newUserInstrumentIndex >= 0 ? { userInstrumentIndex: newUserInstrumentIndex } : {}),
      }
    });
    const pastedNotes = addCompositionNotes(notesToPaste);
    // setIsCompositionMouseDown(true);
    // setClickedNote(topLeftmostCopiedNote.noteId);
    setSelectedNotes(pastedNotes.reduce((acc, note) => {
      return {
        ...acc,
        [note.noteId]: { offset: { x: 0, y: 0 } }
      };
    }, {} as Record<string, NoteIdWithOffset>));
  }, [addCompositionNotes, copiedNotesOffsetRef, copiedNotesRef, setSelectedNotes, userInstrumentIndexRef]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.repeat) {
        return;
      }
      if (document.activeElement?.tagName === "INPUT" && (document.activeElement as HTMLInputElement).type !== "range") {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (clickedNoteRef.current) {
          // Need to update cursorOffset ??? (not just X but Y too...)
          if (Object.entries(selectedNotesRef.current).length > 0) {
            // Move any other selected notes too (offset)
          }
          e.preventDefault();
          return false;
        } else if (Object.entries(selectedNotesRef.current).length > 0) {
          const selectedNoteIds = Object.keys(selectedNotesRef.current);
          const removedNoteToShift = Object.values(removeCompositionNotes(selectedNoteIds));
          addCompositionNotes([
            ...removedNoteToShift.map((noteToShift) => {
              if (e.key === "ArrowDown") {
                noteToShift.midiNote -= 1;
              }
              if (e.key === "ArrowUp") {
                noteToShift.midiNote += 1;
              }
              if (e.key === "ArrowLeft") {
                // TODO(jaketrower): should take into account subdivision type?
                noteToShift.midiBeat -= 1;
              }
              if (e.key === "ArrowRight") {
                noteToShift.midiBeat += 1;
              }
              return { ...noteToShift };
            })
          ])
          e.preventDefault();
          return false;
        }
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
      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        tryCopySelectedNotes();
        return false;
      }
      if (e.key === "x" && (e.ctrlKey || e.metaKey)) {
        tryCutSelectedNotes();
        return false;
      }
      if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
        tryPasteCopiedNotes();
        return false;
      }
      if (e.key === "q") {
        onToggleSubdivisionType();
        return false;
      }
      if (e.key === "r") {
        onToggleTimeSignature();
        return false;
      }
      if (e.key === "Backspace") {
        tryDeleteSelectedNotes();
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
        e.stopPropagation();
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
    [heldPianoKeys, setHeldPianoKeys, userInstrumentsRef, userInstrumentIndexRef, audioContext.currentTime, incrementBabyDanceFrame, clickedNoteRef, selectedNotesRef, removeCompositionNotes, addCompositionNotes, setSelectedNotes, compositionByInstructionIdRef, tryCopySelectedNotes, tryCutSelectedNotes, tryPasteCopiedNotes, onToggleSubdivisionType, onToggleTimeSignature, tryDeleteSelectedNotes, isCompositionMouseDownRef, setIsCompositionMouseDown, setClickedNote, setUserInstrumentIndex, trySetInputMode, onCompositionMouseUpRef, setInputMode, isPlaying, handleStopComposition, handlePlayComposition]
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
        <ActionButtonFooter
          _inputMode={_inputMode}
          setInputMode={trySetInputMode}
          tryCopySelectedNotes={tryCopySelectedNotes}
          tryCutSelectedNotes={tryCutSelectedNotes}
          tryPasteCopiedNotes={tryPasteCopiedNotes}
        />
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
