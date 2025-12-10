import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioContextContext,
  beatHeight,
  CursorPosition,
  getPlacedNotesFromComposition,
  InputMode,
  MidiBeat,
  MidiNoteNum,
  NoteId,
  NoteIdWithOffset,
  pianoRollKeys,
} from "../consts";
import styled from "styled-components";
import { toMidi } from "../../smplr/player/midi";
import { CompositionActionsContext, CompositionContext } from "../contexts/CompositionContextProvider";
import { UserInstrumentContext } from "../contexts/UserInstrumentContextProvider";
import _ from "lodash";
import { CompositionGrid, getBeatWidth, getGridBeatFromMidiBeat, getMidiBeatFromGridBeat } from "./CompositionGrid";
import { SubdivisionTypeContext } from "../contexts/SubdivisionTypeContextProvider";
import { PristineContext } from "../contexts/PristineContextProvider";
import { AllRenderedNotes } from "./AllRenderedNotes";
import { PlayheadContext } from "../contexts/PlayheadContextProvider";

const CompositionContainer = styled.div`
  display: flex; 
  flex-direction: column;
`;

const PianoRollKeysContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export function CompositionCanvas({
  children,
  _inputMode,
  inputModeRef,
  setInputMode,
}: {
  children: React.ReactNode,
  _inputMode: InputMode,
  inputModeRef: React.RefObject<InputMode>;
  setInputMode: (inputMode: InputMode) => void;
}) {
  const audioContext = useContext(AudioContextContext)!;
  const {
    userInstrumentsRef,
    userInstrumentIndexRef,
    setUserInstrumentIndex,
  } = useContext(UserInstrumentContext)!;
  const { setPristine } = useContext(PristineContext)!;
  const {
    compositionRef,
    compositionByInstructionIdRef,
    isCompositionMouseDownRef: isMouseDownRef,
    setIsCompositionMouseDown: setIsMouseDown,
    whenWasMouseDownedRef,
    onCompositionMouseUpRef,
    clickedNoteRef, setClickedNote,
    selectedNotesRef, setSelectedNotes,
  } = useContext(CompositionContext)!;
  const {
    addCompositionNotes,
    removeCompositionNotes,
  } = useContext(CompositionActionsContext)!;
  const { 
    _subdivisionType,
    subdivisionTypeRef,
    setSubdivisionType,
  } = useContext(SubdivisionTypeContext)!;
  const {
    _userPlayheadBounds,
    userPlayheadBoundsRef,
    setUserPlayheadBounds,
  } = useContext(PlayheadContext)!;
  const pianoKeyWidth = 30;
  const beatWidth = useMemo(() => getBeatWidth(_subdivisionType), [_subdivisionType]);
  
  const [_cursorXOffset, _setCursorXOffset] = useState(0);
  const [_cursorPosition, _setCursorPosition] = useState<
    CursorPosition | undefined
  >();
  const [_startingCursorPos, _setStartingCursorPos] = useState<
    CursorPosition | undefined
  >();

  const cursorXOffsetRef = useRef(_cursorXOffset);
  const hasMouseMovedRef = useRef(false);
  const cursorPositionRef = useRef(_cursorPosition);
  const startingCursorPosRef = useRef(_startingCursorPos);

  const setCursorXOffset = useCallback((newCursorXOffset: number) => {
    cursorXOffsetRef.current = newCursorXOffset;
    _setCursorXOffset(newCursorXOffset); 
  }, []);
  const setCursorPosition = useCallback((newCursorPosition: CursorPosition | undefined) => {
    if (_.isEqual(cursorPositionRef.current, newCursorPosition)) {
      return;
    }
    cursorPositionRef.current = newCursorPosition;
    _setCursorPosition(newCursorPosition);
  }, []);
  const setStartingCursorPos = useCallback((newStartingCursorPos: CursorPosition | undefined) => {
    if (_.isEqual(startingCursorPosRef.current, newStartingCursorPos)) {
      return;
    }
    startingCursorPosRef.current = newStartingCursorPos;
    _setStartingCursorPos(newStartingCursorPos);
  }, []);

  const isNoteSelected = useCallback((noteId: NoteId) => {
    return !!Object.keys(selectedNotesRef.current).find((n) => parseInt(n) === noteId);
  }, [selectedNotesRef]);

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: MidiBeat,
      midiNote: MidiNoteNum,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      onCompositionMouseUpRef.current = undefined;
      setIsMouseDown(true);
      setCursorPosition({ midiNote, midiBeat: midiBeat - cursorXOffsetRef.current });
      setStartingCursorPos({ midiNote, midiBeat });
      if (!clickedNoteRef.current && inputModeRef.current === InputMode.DEFAULT) {
        if (audioContext.state === "suspended") {
          audioContext.resume();
        }
        userInstrumentsRef.current[userInstrumentIndexRef.current].sf2Sampler?.start({ note: midiNote, duration: 0.25 });
      }
      hasMouseMovedRef.current = false;
      if (inputModeRef.current === InputMode.DEFAULT && (!clickedNoteRef.current || !isNoteSelected(clickedNoteRef.current))) {
        setSelectedNotes({});
      }
      return false;
    },
    [onCompositionMouseUpRef, setIsMouseDown, setCursorPosition, setStartingCursorPos, clickedNoteRef, inputModeRef, isNoteSelected, audioContext, userInstrumentsRef, userInstrumentIndexRef, setSelectedNotes]
  );
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (isMouseDownRef.current && cursorPositionRef.current && startingCursorPosRef.current) {
        const midiNote = cursorPositionRef.current.midiNote;
        if (inputModeRef.current === InputMode.DEFAULT) {
          if ((!clickedNoteRef.current || hasMouseMovedRef.current)) {
            setPristine(false);
            if (!clickedNoteRef.current) {
              const noteWidth = Math.abs(cursorPositionRef.current.midiBeat - startingCursorPosRef.current.midiBeat) + 1;
              const gridBeat = Math.min(cursorPositionRef.current.midiBeat, startingCursorPosRef.current.midiBeat);
              const midiBeat = getMidiBeatFromGridBeat(gridBeat, subdivisionTypeRef.current, subdivisionTypeRef.current);
              addCompositionNotes([{
                midiBeat,
                midiNote,
                noteWidth,
                userInstrumentIndex: userInstrumentIndexRef.current,
                subdivisionType: subdivisionTypeRef.current,
              }]);
            } else {
              const clickedNote = compositionByInstructionIdRef.current[clickedNoteRef.current!.toString()];
              const instrumentInstructionsById = removeCompositionNotes([
                clickedNoteRef.current.toString(),
                ...Object.keys(selectedNotesRef.current).filter((noteId) => noteId !== clickedNoteRef.current!.toString()),
              ]);
              const gridBeat = cursorPositionRef.current.midiBeat + cursorXOffsetRef.current;
              const midiBeat = getMidiBeatFromGridBeat(gridBeat, subdivisionTypeRef.current, clickedNote.subdivisionType);
              addCompositionNotes([
                // Place the note that you were clicking and dragging
                {
                  noteId: clickedNoteRef.current,
                  midiBeat,
                  midiNote: toMidi(midiNote)!,
                  noteWidth: clickedNote.noteWidth,
                  userInstrumentIndex: clickedNote.userInstrumentIndex,
                  subdivisionType: clickedNote.subdivisionType,
                },
                // Place all other notes that were currently selected
                ...(Object.entries(selectedNotesRef.current).filter(
                  ([noteId, _]) => noteId !== clickedNoteRef.current!.toString()
                ).map(
                  ([noteId, noteWithOffset]) => {
                    const instrumentInstruction = instrumentInstructionsById[parseInt(noteId)];
                    const offset = noteWithOffset.offset;
                    const gridBeat = cursorPositionRef.current!.midiBeat + cursorXOffsetRef.current + offset.x;
                    const newMidiBeat = getMidiBeatFromGridBeat(gridBeat, subdivisionTypeRef.current, instrumentInstruction.subdivisionType);
                    const newMidiNote = toMidi(midiNote)! - offset.y;
                    // Update the offset and midiBeat / midiNote for the selection too.....
                    // globalSelectedNotes[noteId].instrumentInstruction.midiBeat = newMidiBeat;
                    // globalSelectedNotes[noteId].instrumentInstruction.midiNote = newMidiNote;
                    // globalSelectedNotes[noteId].offset = { x: 0, y: 0 };
                    return {
                      noteId: parseInt(noteId),
                      midiBeat: newMidiBeat,
                      midiNote: newMidiNote,
                      noteWidth: instrumentInstruction.noteWidth,
                      userInstrumentIndex: instrumentInstruction.userInstrumentIndex,
                      subdivisionType: instrumentInstruction.subdivisionType,
                    };
                  }))
              ]);
              // fuck it just clear the selected notes
              setSelectedNotes({});
            }
          } else if (clickedNoteRef.current && !hasMouseMovedRef.current) {
            const secondsSince = (Date.now() - whenWasMouseDownedRef.current) / 1000.0;
            if (secondsSince < 0.2) {
              removeCompositionNotes([clickedNoteRef.current.toString()]);
              removeCompositionNotes(Object.keys(selectedNotesRef.current));
              setSelectedNotes({});
            }
            // const clickedNote = compositionByInstructionIdRef.current[clickedNoteRef.current.toString()];
            // const newSelectedNotes = {
            //   ...selectedNotesRef.current,
            //   [clickedNote.noteId]: {
            //     instrumentInstruction: clickedNote,
            //     offset: { x: 0, y: 0 },
            //   }
            // };
            // setSelectedNotes(newSelectedNotes);
          }
        } else if (inputModeRef.current === InputMode.SELECT) {
          const bounds = {
            left: getMidiBeatFromGridBeat(Math.min(cursorPositionRef.current.midiBeat, startingCursorPosRef.current.midiBeat), subdivisionTypeRef.current, subdivisionTypeRef.current),
            top: Math.min(toMidi(cursorPositionRef.current.midiNote)!, toMidi(startingCursorPosRef.current.midiNote)!), 
            right: getMidiBeatFromGridBeat(Math.max(cursorPositionRef.current.midiBeat, startingCursorPosRef.current.midiBeat), subdivisionTypeRef.current, subdivisionTypeRef.current, true),
            bottom: Math.max(toMidi(cursorPositionRef.current.midiNote)!, toMidi(startingCursorPosRef.current.midiNote)!),
          }
          const newlySelectedNotes = getPlacedNotesFromComposition(compositionRef.current, bounds);
          let newSelectedNotes = selectedNotesRef.current;
          if (Object.keys(newlySelectedNotes).length === 0 && !hasMouseMovedRef.current) {
            newSelectedNotes = {};
          } else if (Object.keys(newlySelectedNotes).length > 0) {
            newSelectedNotes = {
              ...newSelectedNotes,
              ...(Object.values(newlySelectedNotes).reduce((acc, note) => (
                {
                  ...acc,
                  [note.noteId]: {
                    instrumentInstruction: note,
                    offset: { x: 0, y: 0 },
                  }
                } as NoteIdWithOffset), {})
              ),
            };

            let possibleUserInstrumentIndex = compositionByInstructionIdRef.current[Object.keys(newSelectedNotes)[0]].userInstrumentIndex;
            if (Object.keys(newSelectedNotes).every(
              (noteId) => compositionByInstructionIdRef.current[noteId].userInstrumentIndex === possibleUserInstrumentIndex)) {
              setUserInstrumentIndex(possibleUserInstrumentIndex);
            }
          }
          setSelectedNotes(newSelectedNotes);
        }
      }
      setClickedNote(undefined);
      setIsMouseDown(false);
      setCursorPosition(undefined);
      setStartingCursorPos(undefined);
      if (onCompositionMouseUpRef.current) {
        onCompositionMouseUpRef.current();
      } else if (!e.shiftKey) {
        setInputMode(InputMode.DEFAULT);
      }
      onCompositionMouseUpRef.current = undefined;
      setCursorXOffset(0);
      hasMouseMovedRef.current = false;
      // TODO(jaketrower): do this with the window documnet too like handleKeyDown
      return false;
    },
    [isMouseDownRef, setClickedNote, setIsMouseDown, setCursorPosition, setStartingCursorPos, onCompositionMouseUpRef, setCursorXOffset, inputModeRef, clickedNoteRef, setPristine, subdivisionTypeRef, addCompositionNotes, userInstrumentIndexRef, compositionByInstructionIdRef, removeCompositionNotes, selectedNotesRef, setSelectedNotes, whenWasMouseDownedRef, compositionRef, setUserInstrumentIndex, setInputMode]
  );
  const handleMouseMove = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: MidiBeat,
      midiNote: MidiNoteNum
    ) => {
      if (
        isMouseDownRef.current &&
        cursorPositionRef.current &&
        (cursorPositionRef.current.midiBeat !== midiBeat ||
          cursorPositionRef.current.midiNote !== midiNote)
      ) {
        hasMouseMovedRef.current = true;
        if (inputModeRef.current === InputMode.DEFAULT) {
          if (midiNote !== cursorPositionRef.current.midiNote) {
            if (clickedNoteRef.current) {
              userInstrumentsRef.current[userInstrumentIndexRef.current].sf2Sampler?.start({
                note: midiNote,
                duration: 0.25,
              });
            } else {
              userInstrumentsRef.current[userInstrumentIndexRef.current].sf2Sampler?.start({
                note: midiNote,
                duration: 0.25,
              });
            }
          }
        }
        setCursorPosition({ midiNote, midiBeat });
      }
      return false;
    },
    [isMouseDownRef, inputModeRef, setCursorPosition, clickedNoteRef, userInstrumentsRef, userInstrumentIndexRef]
  );

  const handlePlacedNoteMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      noteId: NoteId,
    ) => {
      e.preventDefault();
      if (inputModeRef.current !== InputMode.DEFAULT) return;
      const clientRect = (e.target as Element).getBoundingClientRect();
      setCursorXOffset(-Math.floor((e.pageX - clientRect.left) / beatWidth));
      const instrumentInstruction = compositionByInstructionIdRef.current[noteId];
      if (isNoteSelected(noteId)) {
        setClickedNote(noteId);
        Object.entries(selectedNotesRef.current).forEach(([noteWithOffsetId, noteWithOffset]) => {
          if (noteWithOffsetId === noteId.toString()) return;
          const instrumentInstructionWithOffset = compositionByInstructionIdRef.current[noteWithOffsetId];
          // offset: { }
          noteWithOffset.offset = {
            x: instrumentInstructionWithOffset.midiBeat - instrumentInstruction.midiBeat,
            y: instrumentInstruction.midiNote - instrumentInstructionWithOffset.midiNote,
          }
        });
        setSelectedNotes({...selectedNotesRef.current});
      } else {
        setClickedNote(noteId);
        setSelectedNotes({});
      }
      userInstrumentsRef.current[instrumentInstruction.userInstrumentIndex].sf2Sampler?.start({ note: instrumentInstruction.midiNote, duration: 0.25 });

      setSubdivisionType(instrumentInstruction.subdivisionType);
      handleMouseDown(
        e, 
        getGridBeatFromMidiBeat(instrumentInstruction.midiBeat, instrumentInstruction.subdivisionType),
        instrumentInstruction.midiNote
      );
    },
    [inputModeRef, setCursorXOffset, beatWidth, compositionByInstructionIdRef, isNoteSelected, userInstrumentsRef, setSubdivisionType, handleMouseDown, setClickedNote, selectedNotesRef, setSelectedNotes]
  );

  const resetUserPlayheadBounds = useCallback(() => {
    if (!userPlayheadBoundsRef.current) return;
    setUserPlayheadBounds(undefined);
  }, [setUserPlayheadBounds, userPlayheadBoundsRef]);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
    };
  }, [handleMouseUp]);

  const resetUserPlayheadButton = useMemo(
    () => (<div style={{
      cursor: _userPlayheadBounds === undefined ? 'default' : 'pointer',
      opacity: _userPlayheadBounds === undefined ? 0.25 : 1,
      position: 'absolute',
      top: -20,
      left: 13,
      fontSize: 14,
    }} onClick={resetUserPlayheadBounds}>🈁</div>), 
    [resetUserPlayheadBounds, _userPlayheadBounds]
  );

  const renderedPianoRollKeys = useMemo(() => (
    <PianoRollKeysContainer>
      {resetUserPlayheadButton}
      {pianoRollKeys.map((midiNote, _) => (
        <div
          key={`row-${midiNote}`}
          style={{
            height: beatHeight - 1,
            // ...(heldPianoKeys[midiNote] ? {
            //   background: currUserInstrument ? `${currUserInstrument.color}40` : '#b2bcc240',
            // } : {}),
          }}
        >
          <div
            style={{
              // outline: "1px solid black",
              // zIndex: 3,
              // background: "white",
              // position: "fixed",
              width: pianoKeyWidth,
              minWidth: pianoKeyWidth,
              textAlign: "left",
              userSelect: "none",
              cursor: 'pointer',
              // ...(heldPianoKeys[midiNote] ? {
              //   fontWeight: 700,
              //   fontSize: 16,
              //   marginTop: -2,
              // } : {}),
            }}
            // onMouseDown={() => { currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 }); }}
          >
            {midiNote}
          </div>
        </div>
      ))}
    </PianoRollKeysContainer>
  ), [resetUserPlayheadButton])

  const allRenderedNotes = useMemo(() => (
    <AllRenderedNotes
      handlePlacedNoteMouseDown={handlePlacedNoteMouseDown}
      _inputMode={_inputMode}
      _cursorXOffset={_cursorXOffset}
      _cursorPosition={_cursorPosition}
      _startingCursorPos={_startingCursorPos}
    />
  ), [_cursorPosition, _cursorXOffset, _inputMode, _startingCursorPos, handlePlacedNoteMouseDown]);

  const renderedCompositionGrid = useMemo(() => (
    <CompositionGrid
      handleMouseDown={handleMouseDown}
      handleMouseMove={handleMouseMove}>
      {children}
      {allRenderedNotes}
    </CompositionGrid>
  ), [children, allRenderedNotes, handleMouseDown, handleMouseMove]);

  return (
    <CompositionContainer>
      <div style={{ position: 'relative', display: 'flex', marginTop: 16 }}>
        {renderedPianoRollKeys}
        {renderedCompositionGrid}
      </div>
    </CompositionContainer>
  );
}
