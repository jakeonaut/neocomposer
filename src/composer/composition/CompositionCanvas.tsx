import React, { CSSProperties, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioContextContext,
  CursorPosition,
  getRelativeBeatWidth,
  getGridBeatFromMidiBeat,
  getMidiBeatFromGridBeat,
  getPlacedNotesFromComposition,
  InputMode,
  MidiBeat,
  MidiNoteNum,
  NoteId,
  NoteIdWithOffset,
  pianoRollKeys,
  zIndex_resetPlayheadButton,
  getStartOfMeasureFromBeat,
  getEndOfMeasureFromBeat,
  DOUBLE_CLICK_SECOND_BUFFER,
  DELETE_CLICK_BUFFER,
  InstrumentInstruction,
} from "../consts";
import styled from "styled-components";
import { toMidi } from "../../smplr/smplr/midi";
import { UserInstrumentContext } from "../contexts/UserInstrumentContextProvider";
import _ from "lodash";
import { CompositionGrid } from "./CompositionGrid";
import { SubdivisionTypeContext } from "../contexts/SubdivisionTypeContextProvider";
import { PristineContext } from "../contexts/PristineContextProvider";
import { AllRenderedNotes } from "./AllRenderedNotes";
import { PlayheadContext } from "../contexts/PlayheadContextProvider";
import { MouseDownContext } from "../contexts/MouseDownContextProvider";
import { ClickedSelectedNotesContext } from "../contexts/ClickedSelectedNotesContextProvider";
import { CompositionActionsContext } from "../contexts/CompositionActionsContextProvider";
import { useThrottledCallback } from "use-debounce";
import { BeatSizeContext } from "../contexts/BeatSizeContextProvider";
import { TimeSignatureContext } from "../contexts/TimeSignatureContextProvider";
import { UndoRedoContext } from "../contexts/UndoRedoContextProvider";

const CompositionContainer = styled.div`
  display: flex; 
  flex-direction: column;
`;

const CompositionGridContainer = styled.div`
  position: relative;
  display: flex;
  height: 400px;
`;

const PianoRollKeysContainer = styled.div`
  display: flex;
  flex-direction: column;
  position: sticky;
  left: 0px;
`;

const PianoRollKeysSubContainer = styled.div<{ $beatHeight: number }>`
  position: absolute;
  top: ${({ $beatHeight }) => `-${($beatHeight - 1) * (pianoRollKeys.length + 1) - $beatHeight}px`};
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
    _compositionByInstructionIdRef,
  } = useContext(CompositionActionsContext)!;
  const { timeSignatureRef } = useContext(TimeSignatureContext)!;
  const {
    isCompositionMouseDownRef: isMouseDownRef,
    setIsCompositionMouseDown: setIsMouseDown,
    whenWasMouseDownedRef,
    onCompositionMouseUpRef,
  } = useContext(MouseDownContext)!;
  const {
    clickedNoteRef, setClickedNote,
    selectedNotesRef, setSelectedNotes,
    toggleSelectionOnNoteSet,
  } = useContext(ClickedSelectedNotesContext)!;
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
  const { addToUndoStack } = useContext(UndoRedoContext)!;
  const { _beatWidth, _beatHeight } = useContext(BeatSizeContext)!;
  const pianoKeyWidth = 30;
  const beatWidth = useMemo(() => getRelativeBeatWidth(_subdivisionType, _beatWidth), [_subdivisionType, _beatWidth]);
  
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
      if (inputModeRef.current === InputMode.DEFAULT
          && Object.values(selectedNotesRef.current).length > 0
          && (!clickedNoteRef.current || !isNoteSelected(clickedNoteRef.current))) {
        setSelectedNotes({});
        return false;
      }
      const secondsSince = (Date.now() - whenWasMouseDownedRef.current) / 1000.0;
      if (secondsSince < DOUBLE_CLICK_SECOND_BUFFER) {
        return false;
      }
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
      return false;
    },
    [onCompositionMouseUpRef, inputModeRef, selectedNotesRef, clickedNoteRef, isNoteSelected, whenWasMouseDownedRef, setIsMouseDown, setCursorPosition, setStartingCursorPos, setSelectedNotes, audioContext, userInstrumentsRef, userInstrumentIndexRef]
  );
  const justSelectedNoteRef = useRef<InstrumentInstruction | undefined>(undefined);
  const handleDoubleClick = useCallback((
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    midiBeat: MidiBeat,
    midiNote: MidiNoteNum,
  ) => {
    if (inputModeRef.current !== InputMode.SELECT) { return false; }
    debugger;
    const startOfMeasure = getStartOfMeasureFromBeat(midiBeat, timeSignatureRef.current);
    const endOfMeasure = getEndOfMeasureFromBeat(midiBeat, timeSignatureRef.current);
    // Quickly temporarily reverse the selection of the justSelectedNote so that when we
    // toggle on the set below, it's in the right "state". (otherwise shift double clicking
    // reverses the selection of the clicked on note twice, leaving it unchanged...) 
    if (justSelectedNoteRef.current) {
      const selectedNoteIds = Object.keys(selectedNotesRef.current);
      if (selectedNoteIds.includes(justSelectedNoteRef.current.noteId.toString())) {
        delete selectedNotesRef.current[justSelectedNoteRef.current.noteId.toString()];
      } else {
        selectedNotesRef.current = {
          ...selectedNotesRef.current,
          [justSelectedNoteRef.current.noteId.toString()]: {
            noteId: justSelectedNoteRef.current.noteId,
            offset: { x: 0, y: 0 },
          },
        };
      }
    }
    justSelectedNoteRef.current = undefined;
    toggleSelectionOnNoteSet({
      ...(Object.entries(_compositionByInstructionIdRef.current).reduce((acc, [noteId, instrumentInstruction]) => {
        if (instrumentInstruction.midiBeat > startOfMeasure && instrumentInstruction.midiBeat <= endOfMeasure) {
          return {
            ...acc,
            [noteId]: {
              noteId: parseInt(noteId),
              offset: { x: 0, y: 0 },
            },
          };
        }
        return acc;
      }, {} as Record<string, NoteIdWithOffset>)),
    });
    return false;
  }, [inputModeRef, timeSignatureRef, toggleSelectionOnNoteSet, _compositionByInstructionIdRef, selectedNotesRef]);
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
              addCompositionNotes(
                [{
                  midiBeat,
                  midiNote,
                  noteWidth,
                  userInstrumentIndex: userInstrumentIndexRef.current,
                  subdivisionType: subdivisionTypeRef.current,
                }],
                true, /* shouldAddToUndoStack */
              );
            } else {
              const clickedNote = _compositionByInstructionIdRef.current[clickedNoteRef.current!.toString()];
              const prevCompositionByInstructionId = {..._compositionByInstructionIdRef.current};
              const instrumentInstructionsById = removeCompositionNotes(
                [
                  clickedNoteRef.current.toString(),
                  ...Object.keys(selectedNotesRef.current).filter((noteId) => noteId !== clickedNoteRef.current!.toString()),
                ],
                // We're about to do that at the end of this function, so don't do it here
                false, /* shouldAddToUndoStack */
              );
              const gridBeat = cursorPositionRef.current.midiBeat + cursorXOffsetRef.current;
              const midiBeat = getMidiBeatFromGridBeat(gridBeat, subdivisionTypeRef.current, clickedNote.subdivisionType);
              addCompositionNotes(
                [
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
                      // Update the offset and midiBeat / midiNote for the selection too..,
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
                ],
                // We're about to do that at the end of this function, so don't do it here
                false, /* shouldAddToUndoStack */
              );
              addToUndoStack({
                newState: {composition: {..._compositionByInstructionIdRef.current}},
                oldState: {composition: {...prevCompositionByInstructionId}},
              });
              // fuck it just clear the selected notes
              // setSelectedNotes({});
            }
          } else if (clickedNoteRef.current && !hasMouseMovedRef.current) {
            const secondsSince = (Date.now() - whenWasMouseDownedRef.current) / 1000.0;
            if (secondsSince < DELETE_CLICK_BUFFER) {
              removeCompositionNotes([clickedNoteRef.current.toString()], false /* shouldAddToUndoStack */);
              removeCompositionNotes(Object.keys(selectedNotesRef.current), true /* shouldAddToUndoStack */);
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
          const newlySelectedNotes = Object.values(getPlacedNotesFromComposition(compositionRef.current, userInstrumentsRef.current, bounds));
          if (newlySelectedNotes.length === 1) {
            justSelectedNoteRef.current = newlySelectedNotes[0];
          }
          const newlySelectedNotesToSelect = {
            ...(newlySelectedNotes.reduce((acc, note) => (
              {
                ...acc,
                [note.noteId]: {
                  instrumentInstruction: note,
                  offset: { x: 0, y: 0 },
                }
              } as NoteIdWithOffset), {})
            ),
          };
          toggleSelectionOnNoteSet(newlySelectedNotesToSelect);
          // TODO(jaketrower): Should this happen in other cases ? should it always be the case when modifying setSelectedNotes ?
          const selectedNoteIds = Object.keys(selectedNotesRef.current);
          let possibleUserInstrumentIndex = _compositionByInstructionIdRef.current[selectedNoteIds[0]]?.userInstrumentIndex;
          if (selectedNoteIds.length > 0 && selectedNoteIds.every(
            (noteId) => _compositionByInstructionIdRef.current[noteId].userInstrumentIndex === possibleUserInstrumentIndex)) {
            setUserInstrumentIndex(possibleUserInstrumentIndex);
          }
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
    [isMouseDownRef, setClickedNote, setIsMouseDown, setCursorPosition, setStartingCursorPos, onCompositionMouseUpRef, setCursorXOffset, inputModeRef, clickedNoteRef, setPristine, subdivisionTypeRef, addCompositionNotes, userInstrumentIndexRef, _compositionByInstructionIdRef, removeCompositionNotes, selectedNotesRef, addToUndoStack, whenWasMouseDownedRef, setSelectedNotes, compositionRef, userInstrumentsRef, toggleSelectionOnNoteSet, setUserInstrumentIndex, setInputMode]
  );
  const handleMouseMove = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: MidiBeat,
      midiNote: MidiNoteNum
    ) => {
      // console.log("HELLO?!");
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
  const throttledHandleMouseMove = useThrottledCallback(handleMouseMove, 10);

  const handlePlacedNoteMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      noteId: NoteId,
    ) => {
      e.preventDefault();
      if (inputModeRef.current !== InputMode.DEFAULT) return;
      const clientRect = (e.target as Element).getBoundingClientRect();
      setCursorXOffset(-Math.floor((e.pageX - clientRect.left) / beatWidth));
      const instrumentInstruction = _compositionByInstructionIdRef.current[noteId];
      if (isNoteSelected(noteId)) {
        setClickedNote(noteId);
        Object.entries(selectedNotesRef.current).forEach(([noteWithOffsetId, noteWithOffset]) => {
          if (noteWithOffsetId === noteId.toString()) return;
          const instrumentInstructionWithOffset = _compositionByInstructionIdRef.current[noteWithOffsetId];
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
    [inputModeRef, setCursorXOffset, beatWidth, _compositionByInstructionIdRef, isNoteSelected, userInstrumentsRef, setSubdivisionType, handleMouseDown, setClickedNote, selectedNotesRef, setSelectedNotes]
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
      position: 'relative',
      top: -4,
      left: 10,
      fontSize: 18,
      border: '1px solid black',
      padding: '0px 2px 2px 2px',
      lineHeight: '14px',
      width: 12,
      zIndex: zIndex_resetPlayheadButton,
    }} onClick={resetUserPlayheadBounds}>↺</div>), 
    [resetUserPlayheadBounds, _userPlayheadBounds]
  );

  const pianoRollKeysContainerStyle = useMemo(() => ({
    height: _beatHeight - 1,
    // ...(heldPianoKeys[midiNote] ? {
    //   background: currUserInstrument ? `${currUserInstrument.color}40` : '#b2bcc240',
    // } : {}),
  }), [_beatHeight]);
  const pianoRollKeyBaseStyle = useMemo(() => ({
    // outline: "1px solid black",
    // zIndex: 3,
    // background: "white",
    // position: "fixed",
    width: pianoKeyWidth,
    minWidth: pianoKeyWidth,
    textAlign: "right",
    userSelect: "none",
    cursor: 'pointer',
    borderRight: '1px solid black',
    borderBottom: '1px solid black',
    height: 13,
    fontSize: 12,
    background: 'white',
    color: 'black',
    // ...(heldPianoKeys[midiNote] ? {
    //   fontWeight: 700,
    //   fontSize: 16,
    //   marginTop: -2,
    // } : {}),
  }), []);
  const pianoRollKeyStyle = useCallback((midiNote: string) => ({
    ...pianoRollKeyBaseStyle,
    ...(midiNote[1] === 'b' ? {
      background: 'gray',
      color: 'white',
    } : {}),
  } as CSSProperties), [pianoRollKeyBaseStyle]);
  const renderedPianoRollKeys = useMemo(() => (
    <PianoRollKeysContainer>
      <PianoRollKeysSubContainer $beatHeight={_beatHeight}>
        {pianoRollKeys.map((midiNote, _) => (
          <div
            key={`row-${midiNote}`}
            style={pianoRollKeysContainerStyle}
          >
            <div style={pianoRollKeyStyle(midiNote)}
              onMouseDown={() => {
                userInstrumentsRef.current[userInstrumentIndexRef.current].sf2Sampler?.start({ note: midiNote, duration: 0.25 }); 
              }}
              onMouseOver={(e) => {
                if (e.buttons === 1) {
                  userInstrumentsRef.current[userInstrumentIndexRef.current].sf2Sampler?.start({ note: midiNote, duration: 0.25 }); 
                }
              }}
            >
              {midiNote}
            </div>
          </div>
        ))}
      </PianoRollKeysSubContainer>
    </PianoRollKeysContainer>
  ), [_beatHeight, pianoRollKeyStyle, pianoRollKeysContainerStyle, userInstrumentIndexRef, userInstrumentsRef])

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
      handleDoubleClick={handleDoubleClick}
      handleMouseMove={throttledHandleMouseMove}>
      {children}
      {renderedPianoRollKeys}
      {allRenderedNotes}
    </CompositionGrid>
  ), [handleMouseDown, handleDoubleClick, throttledHandleMouseMove, children, renderedPianoRollKeys, allRenderedNotes]);

  return (
    <CompositionContainer>
      {resetUserPlayheadButton}
      <CompositionGridContainer>
        {renderedCompositionGrid}
      </CompositionGridContainer>
    </CompositionContainer>
  );
}
