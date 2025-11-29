import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  AudioContextContext,
  beatHeight,
  getPlacedNotesFromComposition,
  InputMode,
  MidiBeat,
  MidiNoteNum,
  NoteId,
  NoteIdWithOffset,
  pianoRollKeys,
  zIndex_rectSelect,
} from "../consts";
import styled from "styled-components";
import { toMidi } from "../../smplr/player/midi";
import { PlacedNote } from "./PlacedNote";
import { CompositionActionsContext, CompositionContext } from "../contexts/CompositionContextProvider";
import { UserInstrumentContext } from "../contexts/UserInstrumentContextProvider";
import _ from "lodash";
import { CompositionGrid, getBeatWidth, getGridBeatFromMidiBeat, getMidiBeatFromGridBeat } from "./CompositionGrid";
import { SubdivisionTypeContext } from "../contexts/SubdivisionTypeContextProvider";
import { PristineContext } from "../contexts/PristineContextProvider";

type CursorPosition = { midiNote: MidiNoteNum; midiBeat: MidiBeat; };

const CompositionContainer = styled.div`
  display: flex; 
  flex-direction: column;
`;

const PianoRollKeysContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const PlacedNotesOverlay = styled.div`

`;

const RectSelector = styled.div<{ $left: number, $top: number, $width: number, $height: number }>`
  background: #76feff54;
  outline: 1px dashed #004cff54;
  position: absolute;
  left: ${({ $left }) => `${$left}px`};
  top: ${({ $top }) => `${$top}px`};
  width: ${({ $width }) => `${$width}px`};
  height: ${({ $height }) => `${$height}px`};
  z-index: ${zIndex_rectSelect};
  pointer-events: none;
`;

export function CompositionCanvas({
  _inputMode,
  inputModeRef,
  setInputMode,
}: {
  _inputMode: InputMode,
  inputModeRef: React.RefObject<InputMode>;
  setInputMode: (inputMode: InputMode) => void;
}) {
  const audioContext = useContext(AudioContextContext)!;
  const {
    _userInstruments,
    userInstrumentsRef,
    _userInstrumentIndex,
    userInstrumentIndexRef,
  } = useContext(UserInstrumentContext)!;
  const { setPristine } = useContext(PristineContext)!;
  const {
    _composition,
    compositionRef,
    compositionByInstructionIdRef,
    _isCompositionMouseDown: _isMouseDown,
    isCompositionMouseDownRef: isMouseDownRef,
    setIsCompositionMouseDown: setIsMouseDown,
    onCompositionMouseUpRef,
    _clickedNote, clickedNoteRef, setClickedNote,
    _selectedNotes, selectedNotesRef, setSelectedNotes,
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
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      index: number,
      midiNote: MidiNoteNum
    ) => {
      if (isMouseDownRef.current && cursorPositionRef.current && startingCursorPosRef.current) {
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
            removeCompositionNotes([clickedNoteRef.current.toString()]);
            removeCompositionNotes(Object.keys(selectedNotesRef.current));
            setSelectedNotes({});
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
          } else {
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
    [isMouseDownRef, setClickedNote, setIsMouseDown, setCursorPosition, setStartingCursorPos, onCompositionMouseUpRef, setCursorXOffset, inputModeRef, clickedNoteRef, setPristine, subdivisionTypeRef, addCompositionNotes, userInstrumentIndexRef, removeCompositionNotes, selectedNotesRef, compositionByInstructionIdRef, setSelectedNotes, compositionRef, setInputMode]
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

  const _currUserInstrument = _userInstruments[_userInstrumentIndex];

  const renderedPianoRollKeys = useMemo(() => (<PianoRollKeysContainer>{pianoRollKeys.map((midiNote, _) => (
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
    ))}</PianoRollKeysContainer>
  ), [])

  const clickedNote = useMemo(
    () => _clickedNote ? compositionByInstructionIdRef.current[_clickedNote.toString()] : undefined,
    [_clickedNote, compositionByInstructionIdRef]);
  const topmostMidiNote = useMemo(() => toMidi(pianoRollKeys[0])!, []);
  const renderedAllPlacedNotes = useMemo(() => (<PlacedNotesOverlay>
      {/* STATIC(ISH) PLACED NOTES */}
      {Object.entries(_composition).map(([midiBeat, notesPerBeat]) =>
        Object.entries(notesPerBeat).map(([midiNote, instrumentInstructions]) => 
          Object.values(instrumentInstructions).map((instrumentInstruction) => {
            if (clickedNote && (instrumentInstruction.noteId === clickedNote.noteId || isNoteSelected(instrumentInstruction.noteId))) {
              return null;
            }
            const bgColor = _userInstruments[instrumentInstruction.userInstrumentIndex].color ?? 'gray';
            return (<PlacedNote
              key={instrumentInstruction.noteId}
              topmostMidiNote={topmostMidiNote}
              bgColor={bgColor}
              instrumentInstruction={instrumentInstruction}
              onMouseDown={handlePlacedNoteMouseDown}
              shouldMouseIgnoreMe={_isMouseDown || _inputMode === InputMode.SELECT}
              isNoteSelected={isNoteSelected(instrumentInstruction.noteId)}
            />)
          })))}
      {/* DRAGGING TO CREATE A NEW NOTE */}
      {_inputMode === InputMode.DEFAULT
        && _startingCursorPos
        && _cursorPosition
        && !_clickedNote
        && (
          <PlacedNote
            topmostMidiNote={topmostMidiNote}
            bgColor={_currUserInstrument.color ?? "gray"}
            instrumentInstruction={{
              noteId: -1,
              midiBeat: getMidiBeatFromGridBeat(Math.min(_cursorPosition.midiBeat, _startingCursorPos.midiBeat), _subdivisionType, _subdivisionType),
              midiNote: _cursorPosition.midiNote,
              noteWidth: Math.abs(_startingCursorPos.midiBeat - _cursorPosition.midiBeat) + 1,
              subdivisionType: _subdivisionType,
              userInstrumentIndex: _userInstrumentIndex,
            }}
            isClickedNote
          />
        )}
      {/* DRAGGING EXISTING NOTE */}
      {_inputMode === InputMode.DEFAULT
        && _startingCursorPos
        && _cursorPosition
        && clickedNote
        && (
          <>
            <PlacedNote
              topmostMidiNote={topmostMidiNote}
              bgColor={_userInstruments[clickedNote.userInstrumentIndex].color}
              instrumentInstruction={{
                noteId: clickedNote.noteId,
                midiBeat: getMidiBeatFromGridBeat(_cursorPosition.midiBeat + cursorXOffsetRef.current, _subdivisionType, clickedNote.subdivisionType),
                midiNote: _cursorPosition.midiNote,
                noteWidth: clickedNote.noteWidth,
                subdivisionType: clickedNote.subdivisionType,
                userInstrumentIndex: clickedNote.userInstrumentIndex,
              }}
              isNoteSelected={isNoteSelected(clickedNote.noteId)}
              isClickedNote
            />
            {Object.entries(_selectedNotes).map(([noteId, noteWithOffset]) => {
              const instrumentInstructionWithOffset = compositionByInstructionIdRef.current[noteId];
              return (noteId !== clickedNote.toString()
              && (<PlacedNote
                key={noteId}
                topmostMidiNote={topmostMidiNote}
                bgColor={_userInstruments[instrumentInstructionWithOffset.userInstrumentIndex].color}
                instrumentInstruction={{
                  noteId: instrumentInstructionWithOffset.noteId,
                  midiBeat: getMidiBeatFromGridBeat(
                    _cursorPosition.midiBeat + _cursorXOffset + noteWithOffset.offset.x, 
                    _subdivisionType, 
                    instrumentInstructionWithOffset.subdivisionType
                  ),
                  midiNote: _cursorPosition.midiNote - noteWithOffset.offset.y,
                  noteWidth: instrumentInstructionWithOffset.noteWidth,
                  subdivisionType: instrumentInstructionWithOffset.subdivisionType,
                  userInstrumentIndex: instrumentInstructionWithOffset.userInstrumentIndex,
                }}
                isNoteSelected
                isClickedNote
              />
              ))
            })}
          </>
        )}
        {/* DRAGGING THE RECT SELECTOR TO SELECT PLACED NOTES */}
        {_inputMode === InputMode.SELECT
          && _isMouseDown
          && _startingCursorPos
          && _cursorPosition
          // && Math.min(_cursorPosition.midiBeat, _startingCursorPos.midiBeat) === index
          // && Math.max(toMidi(_cursorPosition.midiNote)!, toMidi(_startingCursorPos.midiNote)!) === toMidi(midiNote)
          && (
            <RectSelector
              $left={1 + ((Math.min(_cursorPosition.midiBeat, _startingCursorPos.midiBeat) - 1) * beatWidth)}
              $top={1 + ((Math.min(
                topmostMidiNote - _cursorPosition.midiNote, 
                topmostMidiNote - _startingCursorPos.midiNote
              )) * (beatHeight - 1))}
              $width={(Math.abs(_startingCursorPos.midiBeat - _cursorPosition.midiBeat) + 1) * beatWidth - 1}
              $height={(Math.abs(toMidi(_startingCursorPos.midiNote)! - toMidi(_cursorPosition.midiNote)!) + 1) * (beatHeight - 1) - 1}
            />
          )}
      </PlacedNotesOverlay>
    ), [_composition, _inputMode, _startingCursorPos, _cursorPosition, _clickedNote, topmostMidiNote, _currUserInstrument.color, _subdivisionType, _userInstrumentIndex, clickedNote, _userInstruments, isNoteSelected, _selectedNotes, _isMouseDown, beatWidth, handlePlacedNoteMouseDown, compositionByInstructionIdRef, _cursorXOffset]);

  const renderedCompositionGrid = useMemo(() => (
    <CompositionGrid
      handleMouseDown={handleMouseDown}
      handleMouseMove={handleMouseMove}
      handleMouseUp={handleMouseUp}>
      {renderedAllPlacedNotes}
    </CompositionGrid>
  ), [handleMouseDown, handleMouseMove, handleMouseUp, renderedAllPlacedNotes]);

  return (
    <CompositionContainer>
      <div style={{ position: 'relative', display: 'flex' }}>
        {renderedPianoRollKeys}
        {renderedCompositionGrid}
      </div>
    </CompositionContainer>
  );
}
