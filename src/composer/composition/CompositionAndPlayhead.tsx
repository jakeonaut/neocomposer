import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  AudioContextContext,
  beatHeight,
  getPlacedNotesFromComposition,
  InputMode,
  InstrumentInstruction,
  InstrumentInstructionWithOffset,
  MidiBeat,
  MidiNoteNum,
  pianoRollKeys,
} from "../consts";
import styled from "styled-components";
import { toMidi } from "../../smplr/player/midi";
import { PlacedNote } from "./PlacedNote";
import { CompositionContext } from "../contexts/CompositionContextProvider";
import { UserInstrumentContext } from "../contexts/UserInstrumentContextProvider";
import { SongSettingsContext } from "../contexts/SongSettingsContextProvider";
import _ from "lodash";
import { CompositionGrid, getBeatWidth, getGridBeatFromMidiBeat, getMidiBeatFromGridBeat } from "./CompositionGrid";

type CursorPosition = { midiNote: MidiNoteNum; midiBeat: MidiBeat; };

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

export function CompositionAndPlayhead({
  _inputMode,
  inputModeRef,
  setInputMode,
}: {
  _inputMode: InputMode,
  inputModeRef: React.RefObject<InputMode>;
  setInputMode: (inputMode: InputMode) => void;
}) {
  const audioContext = useContext(AudioContextContext)!;
  const { playheadPosX, babyDanceFrame, setPristine } = useContext(SongSettingsContext)!;
  const {
    _userInstruments,
    userInstrumentsRef,
    _userInstrumentIndex,
    userInstrumentIndexRef,
  } = useContext(UserInstrumentContext)!;
  const {
    _composition,
    compositionRef,
    _isCompositionMouseDown: _isMouseDown,
    isCompositionMouseDownRef: isMouseDownRef,
    setIsCompositionMouseDown: setIsMouseDown,
    onCompositionMouseUpRef,
    _subdivisionType,
    subdivisionTypeRef,
    setSubdivisionType,
    addCompositionNotes,
    removeCompositionNotes,
    _clickedNote, clickedNoteRef, setClickedNote,
    _selectedNotes, selectedNotesRef, setSelectedNotes,
  } = useContext(CompositionContext)!;
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

  const isNoteSelected = useCallback((instrumentInstruction: InstrumentInstruction) => {
    return !!Object.keys(selectedNotesRef.current).find((noteId) => parseInt(noteId) === instrumentInstruction.noteId);
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
              removeCompositionNotes([clickedNoteRef.current.noteId.toString()]);
              removeCompositionNotes(Object.keys(selectedNotesRef.current));
              const gridBeat = cursorPositionRef.current.midiBeat + cursorXOffsetRef.current;
              const midiBeat = getMidiBeatFromGridBeat(gridBeat, subdivisionTypeRef.current, clickedNoteRef.current.subdivisionType);
              addCompositionNotes([
                // Place the note that you were clicking and dragging
                {
                  noteId: clickedNoteRef.current.noteId,
                  midiBeat,
                  midiNote: toMidi(midiNote)!,
                  noteWidth: clickedNoteRef.current.noteWidth,
                  userInstrumentIndex: clickedNoteRef.current.userInstrumentIndex,
                  subdivisionType: clickedNoteRef.current.subdivisionType,
                },
                // Place all other notes that were currently selected
                ...(Object.entries(selectedNotesRef.current).filter(
                  ([noteId, _]) => noteId !== clickedNoteRef.current!.noteId.toString()
                ).map(
                  ([noteId, noteWithOffset]) => {
                    const note = noteWithOffset.instrumentInstruction;
                    const offset = noteWithOffset.offset;
                    const gridBeat = cursorPositionRef.current!.midiBeat + cursorXOffsetRef.current + offset.x;
                    const newMidiBeat = getMidiBeatFromGridBeat(gridBeat, subdivisionTypeRef.current, note.subdivisionType);
                    const newMidiNote = toMidi(midiNote)! - offset.y;
                    // Update the offset and midiBeat / midiNote for the selection too.....
                    // globalSelectedNotes[noteId].instrumentInstruction.midiBeat = newMidiBeat;
                    // globalSelectedNotes[noteId].instrumentInstruction.midiNote = newMidiNote;
                    // globalSelectedNotes[noteId].offset = { x: 0, y: 0 };
                    return {
                      noteId: parseInt(noteId),
                      midiBeat: newMidiBeat,
                      midiNote: newMidiNote,
                      noteWidth: note.noteWidth,
                      userInstrumentIndex: note.userInstrumentIndex,
                      subdivisionType: note.subdivisionType,
                    };
                  }))
              ]);
              // fuck it just clear the selected notes
              setSelectedNotes({});
              selectedNotesRef.current = {};
            }
          } else if (clickedNoteRef.current && !hasMouseMovedRef.current) {
            removeCompositionNotes([clickedNoteRef.current.noteId.toString()]);
            removeCompositionNotes(Object.keys(selectedNotesRef.current));
            setSelectedNotes({});
            selectedNotesRef.current = {};
          }
        } else if (inputModeRef.current === InputMode.SELECT) {
          const bounds = {
            left: getMidiBeatFromGridBeat(Math.min(cursorPositionRef.current.midiBeat, startingCursorPosRef.current.midiBeat), subdivisionTypeRef.current, subdivisionTypeRef.current),
            top: Math.min(toMidi(cursorPositionRef.current.midiNote)!, toMidi(startingCursorPosRef.current.midiNote)!), 
            right: getMidiBeatFromGridBeat(Math.max(cursorPositionRef.current.midiBeat, startingCursorPosRef.current.midiBeat), subdivisionTypeRef.current, subdivisionTypeRef.current, true),
            bottom: Math.max(toMidi(cursorPositionRef.current.midiNote)!, toMidi(startingCursorPosRef.current.midiNote)!),
          }
          const newlySelectedNotes = getPlacedNotesFromComposition(compositionRef.current, bounds);
          if (Object.keys(newlySelectedNotes).length === 0 && !hasMouseMovedRef.current) {
            selectedNotesRef.current = {};
          } else {
            selectedNotesRef.current = {
              ...selectedNotesRef.current,
              ...(Object.values(newlySelectedNotes).reduce((acc, note) => (
                {
                  ...acc,
                  [note.noteId]: {
                    instrumentInstruction: note,
                    offset: { x: 0, y: 0 },
                  }
                } as InstrumentInstructionWithOffset), {})
              ),
            };
          }
          setSelectedNotes(selectedNotesRef.current);
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
    [isMouseDownRef, setClickedNote, setIsMouseDown, setCursorPosition, setStartingCursorPos, onCompositionMouseUpRef, setCursorXOffset, inputModeRef, clickedNoteRef, setPristine, subdivisionTypeRef, addCompositionNotes, userInstrumentIndexRef, removeCompositionNotes, selectedNotesRef, setSelectedNotes, compositionRef, setInputMode]
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
        if (inputModeRef.current !== InputMode.DEFAULT) return false;
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
        setCursorPosition({ midiNote, midiBeat });
      }
      return false;
    },
    [isMouseDownRef, inputModeRef, setCursorPosition, clickedNoteRef, userInstrumentsRef, userInstrumentIndexRef]
  );

  const handlePlacedNoteMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      instrumentInstruction: InstrumentInstruction
    ) => {
      e.preventDefault();
      if (inputModeRef.current !== InputMode.DEFAULT) return;
      const clientRect = (e.target as Element).getBoundingClientRect();
      setCursorXOffset(-Math.floor((e.pageX - clientRect.left) / beatWidth));
      if (isNoteSelected(instrumentInstruction)) {
        setClickedNote(instrumentInstruction);
        clickedNoteRef.current = instrumentInstruction;
        Object.entries(selectedNotesRef.current).forEach(([noteId, noteWithOffset]) => {
          if (noteId === instrumentInstruction.noteId.toString()) return;
          // offset: { }
          noteWithOffset.offset = {
            x: noteWithOffset.instrumentInstruction.midiBeat - instrumentInstruction.midiBeat,
            y: instrumentInstruction.midiNote - noteWithOffset.instrumentInstruction.midiNote,
          }
        });
        setSelectedNotes({...selectedNotesRef.current});
      } else {
        setClickedNote(instrumentInstruction);
        clickedNoteRef.current = instrumentInstruction;
        setSelectedNotes({});
        selectedNotesRef.current = {};
      }
      userInstrumentsRef.current[instrumentInstruction.userInstrumentIndex].sf2Sampler?.start({ note: instrumentInstruction.midiNote, duration: 0.25 });

      setSubdivisionType(instrumentInstruction.subdivisionType);
      handleMouseDown(
        e, 
        getGridBeatFromMidiBeat(instrumentInstruction.midiBeat, instrumentInstruction.subdivisionType),
        instrumentInstruction.midiNote
      );
    },
    [inputModeRef, setCursorXOffset, beatWidth, isNoteSelected, userInstrumentsRef, setSubdivisionType, handleMouseDown, setClickedNote, clickedNoteRef, selectedNotesRef, setSelectedNotes]
  );

  const playheadNode = useMemo(() => <BabyPlayheadImg src="trans.png" $frame={babyDanceFrame} style={{
    left: playheadPosX,
  }}/>, [babyDanceFrame, playheadPosX]);

  const _currUserInstrument = _userInstruments[_userInstrumentIndex];

  const renderedPianoRollKeys = useMemo(() => (<PianoRollKeysContainer>{pianoRollKeys.map((midiNote, _) => (
      <div style={{
        height: beatHeight - 1,
        // ...(heldPianoKeys[midiNote] ? {
        //   background: currUserInstrument ? `${currUserInstrument.color}40` : '#b2bcc240',
        // } : {}),
      }}>
        <div
          key={`row-${midiNote}`}
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

  const renderedAllPlacedNotes = useMemo(() => (<PlacedNotesOverlay>
      {/* STATIC(ISH) PLACED NOTES */}
      {Object.entries(_composition).map(([midiBeat, notesPerBeat]) =>
        Object.entries(notesPerBeat).map(([midiNote, instrumentInstructions]) => 
          Object.values(instrumentInstructions).map((instrumentInstruction) => {
            if (clickedNoteRef.current && (instrumentInstruction.noteId === clickedNoteRef.current.noteId || isNoteSelected(instrumentInstruction))) {
              return null;
            }
            const bgColor = _userInstruments[instrumentInstruction.userInstrumentIndex].color ?? 'gray';
            return (<PlacedNote
              topmostMidiNote={toMidi(pianoRollKeys[0])!}
              bgColor={bgColor}
              instrumentInstruction={instrumentInstruction}
              onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => handlePlacedNoteMouseDown(
                e, instrumentInstruction
              )}
              shouldMouseIgnoreMe={_isMouseDown || _inputMode === InputMode.SELECT}
              selectedNotes={_selectedNotes}
              isNoteSelected={isNoteSelected(instrumentInstruction)}
            />)
          })))}
      {/* DRAGGING TO CREATE A NEW NOTE */}
      {_inputMode === InputMode.DEFAULT
        && _startingCursorPos
        && _cursorPosition
        && !_clickedNote
        && (
          <PlacedNote
            topmostMidiNote={toMidi(pianoRollKeys[0])!}
            bgColor={_currUserInstrument.color ?? "gray"}
            instrumentInstruction={{
              midiBeat: getMidiBeatFromGridBeat(Math.min(_cursorPosition.midiBeat, _startingCursorPos.midiBeat), _subdivisionType, _subdivisionType),
              midiNote: _cursorPosition.midiNote,
              noteWidth: Math.abs(_startingCursorPos.midiBeat - _cursorPosition.midiBeat) + 1,
              subdivisionType: _subdivisionType,
            }}
            isClickedNote
          />
        )}
      {/* DRAGGING EXISTING NOTE */}
      {_inputMode === InputMode.DEFAULT
        && _startingCursorPos
        && _cursorPosition
        && _clickedNote
        && (
          <>
            <PlacedNote
              topmostMidiNote={toMidi(pianoRollKeys[0])!}
              bgColor={_userInstruments[_clickedNote.userInstrumentIndex].color}
              instrumentInstruction={{
                midiBeat: getMidiBeatFromGridBeat(_cursorPosition.midiBeat + cursorXOffsetRef.current, _subdivisionType, _clickedNote.subdivisionType),
                midiNote: _cursorPosition.midiNote,
                noteWidth: _clickedNote.noteWidth,
                subdivisionType: _clickedNote.subdivisionType,
              }}
              isNoteSelected={isNoteSelected(_clickedNote)}
              isClickedNote
            />
            {Object.entries(_selectedNotes).map(([noteId, noteWithOffset]) =>
              noteId !== _clickedNote.noteId.toString()
              && (<PlacedNote
                topmostMidiNote={toMidi(pianoRollKeys[0])!}
                bgColor={_userInstruments[noteWithOffset.instrumentInstruction.userInstrumentIndex].color}
                instrumentInstruction={{
                  midiBeat: getMidiBeatFromGridBeat(_cursorPosition.midiBeat + _cursorXOffset + noteWithOffset.offset.x, _subdivisionType, noteWithOffset.instrumentInstruction.subdivisionType),
                  midiNote: _cursorPosition.midiNote - noteWithOffset.offset.y,
                  noteWidth: noteWithOffset.instrumentInstruction.noteWidth,
                  subdivisionType: noteWithOffset.instrumentInstruction.subdivisionType,
                }}
                isNoteSelected
                isClickedNote
              />
            ))}
          </>
        )}
      </PlacedNotesOverlay>
    ), [_composition, clickedNoteRef, isNoteSelected, _userInstruments, _isMouseDown, _inputMode, _selectedNotes, handlePlacedNoteMouseDown, _startingCursorPos, _cursorPosition, _clickedNote, _currUserInstrument, _subdivisionType, _cursorXOffset]);

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
      <div style={{ marginLeft: 22, height: 15, content: ' ', position: 'relative' }}>
        {playheadNode}
      </div>
      <div style={{ position: 'relative', display: 'flex' }}>
        {renderedPianoRollKeys}
        {renderedCompositionGrid}
      </div>
    </CompositionContainer>
  );
}
