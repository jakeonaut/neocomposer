import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  AudioContextContext,
  beatHeight,
  getPlacedNotesFromComposition,
  InputMode,
  InstrumentInstruction,
  InstrumentInstructionWithOffset,
  MidiBeat,
  MidiNote,
  MidiNoteNum,
  OctavelessMidiNote,
  pianoRollBeats,
  pianoRollKeys,
  SubdivisionType,
  zIndex_rectSelect,
} from "../consts";
import styled from "styled-components";
import { fromMidi, toMidi } from "../../smplr/player/midi";
import { PlacedNote } from "../PlacedNote";
import { CompositionContext } from "../contexts/CompositionContextProvider";
import { UserInstrumentContext } from "../contexts/UserInstrumentContextProvider";
import { SongSettingsContext } from "../contexts/SongSettingsContextProvider";
import { Grid } from "react-window";
import _ from "lodash";
import { CompositionGrid, getBeatWidth, getGridBeatFromMidiBeat, getMidiBeatFromGridBeat } from "./GridCell";

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

export function CompositionAndPlayhead({
  inputMode,
  inputModeRef,
  setInputMode,
}: {
  inputMode: InputMode,
  inputModeRef: React.RefObject<InputMode>;
  setInputMode: (inputMode: InputMode) => void;
}) {
  const audioContext = useContext(AudioContextContext)!;
  const { playheadPosX, babyDanceFrame, setPristine } = useContext(SongSettingsContext)!;
  const {
    userInstruments,
    userInstrumentsRef,
    userInstrumentIndexRef,
  } = useContext(UserInstrumentContext)!;
  const {
    composition,
    compositionRef,
    isCompositionMouseDownRef: isMouseDownRef,
    onCompositionMouseUpRef,
    subdivisionType,
    subdivisionTypeRef,
    setSubdivisionType,
    addCompositionNotes,
    removeCompositionNotes,
    clickedNoteRef, setClickedNote,
    selectedNotesRef, setSelectedNotes,
  } = useContext(CompositionContext)!;
  const cursorXOffsetRef = useRef(0);
  const hasMouseMovedRef = useRef(false);
  const isNoteSelected = useCallback((instrumentInstruction: InstrumentInstruction) => {
    return !!Object.keys(selectedNotesRef.current).find((noteId) => parseInt(noteId) === instrumentInstruction.noteId);
  }, [selectedNotesRef]);

  const pianoKeyWidth = 30;
  const beatWidth = useMemo(() => getBeatWidth(subdivisionType), [subdivisionType]);
  
  const [_cursorPosition, _setCursorPosition] = useState<
    CursorPosition | undefined
  >();
  const [_startingCursorPos, _setStartingCursorPos] = useState<
    CursorPosition | undefined
  >();

  const cursorPositionRef = useRef(_cursorPosition);
  const startingCursorPosRef = useRef(_startingCursorPos);

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

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: MidiBeat,
      midiNote: MidiNoteNum,
    ) => {
      console.log(midiBeat);
      e.preventDefault();
      e.stopPropagation();
      onCompositionMouseUpRef.current = undefined;
      isMouseDownRef.current = true;
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
    [onCompositionMouseUpRef, isMouseDownRef, setCursorPosition, setStartingCursorPos, clickedNoteRef, inputModeRef, isNoteSelected, audioContext, userInstrumentsRef, userInstrumentIndexRef, setSelectedNotes]
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
      clickedNoteRef.current = undefined;
      isMouseDownRef.current = false;
      setCursorPosition(undefined);
      setStartingCursorPos(undefined);
      if (onCompositionMouseUpRef.current) {
        onCompositionMouseUpRef.current();
      } else if (!e.shiftKey) {
        setInputMode(InputMode.DEFAULT);
      }
      onCompositionMouseUpRef.current = undefined;
      cursorXOffsetRef.current = 0;
      hasMouseMovedRef.current = false;
      // TODO(jaketrower): do this with the window documnet too like handleKeyDown
      return false;
    },
    [isMouseDownRef, setClickedNote, clickedNoteRef, setCursorPosition, setStartingCursorPos, onCompositionMouseUpRef, inputModeRef, setPristine, subdivisionTypeRef, addCompositionNotes, userInstrumentIndexRef, removeCompositionNotes, selectedNotesRef, setSelectedNotes, compositionRef, setInputMode]
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
            userInstrumentsRef.current[clickedNoteRef.current.userInstrumentIndex].sf2Sampler?.start({
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
      cursorXOffsetRef.current = -Math.floor((e.pageX - clientRect.left) / beatWidth);
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
    [inputModeRef, beatWidth, isNoteSelected, userInstrumentsRef, setSubdivisionType, handleMouseDown, setClickedNote, clickedNoteRef, selectedNotesRef, setSelectedNotes]
  );

  const playheadNode = useMemo(() => <BabyPlayheadImg src="trans.png" $frame={babyDanceFrame} style={{
    left: playheadPosX,
  }}/>, [babyDanceFrame, playheadPosX]);

  const compositionGrid = useMemo(() => (
    <CompositionGrid
    handleMouseDown={handleMouseDown}
    handleMouseMove={handleMouseMove}
    handleMouseUp={handleMouseUp} />
  ), [handleMouseDown, handleMouseMove, handleMouseUp]);

  return (
    <CompositionContainer>
      <div style={{ marginLeft: 22, height: 15, content: ' ', position: 'relative' }}>
        {playheadNode}
      </div>
      <div style={{ position: 'relative', }}>
        {/* STATIC(ISH) PLACED NOTES */}
        {Object.entries(composition).map(([midiBeat, notesPerBeat]) =>
          Object.entries(notesPerBeat).map(([midiNote, instrumentInstructions]) => 
            Object.values(instrumentInstructions).map((instrumentInstruction) => {
              if (clickedNoteRef.current && (instrumentInstruction.noteId === clickedNoteRef.current.noteId || isNoteSelected(instrumentInstruction))) {
                return null;
              }
              const bgColor = userInstruments[instrumentInstruction.userInstrumentIndex].color ?? 'gray';
              return (<PlacedNote
                topmostMidiNote={toMidi(pianoRollKeys[0])!}
                bgColor={bgColor}
                instrumentInstruction={instrumentInstruction}
                onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => handlePlacedNoteMouseDown(
                  e, instrumentInstruction
                )}
                // TODO(isMouseDownRef, inputModeRef) // TODO
                shouldMouseIgnoreMe={isMouseDownRef.current || inputModeRef.current === InputMode.SELECT}
                selectedNotes={selectedNotesRef.current}
                isNoteSelected={isNoteSelected(instrumentInstruction)}
              />)
            })))}
        {pianoRollKeys.map((midiNote, _) => (
          <div style={{
            display: "flex",
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
            {/* DRAGGING TO CREATE A NEW NOTE */}
            {inputMode === InputMode.DEFAULT
              && _startingCursorPos
              && _cursorPosition
              && _cursorPosition.midiNote === toMidi(midiNote)!
              && !clickedNote
              && (
                <PlacedNote
                  topmostMidiNote={toMidi(pianoRollKeys[0])!}
                  bgColor={currUserInstrument.color ?? "gray"}
                  instrumentInstruction={{
                    midiBeat: getMidiBeatFromGridBeat(Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat), subdivisionType, subdivisionType),
                    midiNote: toMidi(midiNote)!,
                    noteWidth: Math.abs(startingCursorPos.midiBeat - cursorPosition.midiBeat) + 1,
                    subdivisionType,
                  }}
                  isClickedNote
                />
              )}
            {/* DRAGGING EXISTING NOTE */}
            {inputMode === InputMode.DEFAULT
              && isMouseDown
              && startingCursorPos
              && cursorPosition
              && cursorPosition.midiNote === toMidi(midiNote)!
              && clickedNote
              && (
                <>
                  <PlacedNote
                    topmostMidiNote={toMidi(pianoRollKeys[0])!}
                    bgColor={userInstruments[clickedNote.userInstrumentIndex].color}
                    instrumentInstruction={{
                      midiBeat: getMidiBeatFromGridBeat(cursorPosition.midiBeat + cursorXOffsetRef.current, subdivisionType, clickedNote.subdivisionType),
                      midiNote: cursorPosition.midiNote,
                      noteWidth: clickedNote.noteWidth,
                      subdivisionType: clickedNote.subdivisionType,
                    }}
                    isNoteSelected={isNoteSelected(clickedNote)}
                    isClickedNote
                  />
                  {Object.entries(selectedNotes).map(([noteId, noteWithOffset]) =>
                    noteId !== clickedNote.noteId.toString()
                    && (<PlacedNote
                      topmostMidiNote={toMidi(pianoRollKeys[0])!}
                      bgColor={userInstruments[noteWithOffset.instrumentInstruction.userInstrumentIndex].color}
                      instrumentInstruction={{
                        // TODO(jaketrower): ???
                        midiBeat: getMidiBeatFromGridBeat(cursorPosition.midiBeat + cursorXOffsetRef.current + noteWithOffset.offset.x, subdivisionType, noteWithOffset.instrumentInstruction.subdivisionType),
                        midiNote: cursorPosition.midiNote - noteWithOffset.offset.y,
                        noteWidth: noteWithOffset.instrumentInstruction.noteWidth,
                        subdivisionType: noteWithOffset.instrumentInstruction.subdivisionType,
                      }}
                      isNoteSelected
                      isClickedNote
                    />
                  ))}
                </>
              )}
            <div style={{ width: pianoKeyWidth, minWidth: pianoKeyWidth }}></div>
            {compositionGrid}
            {/* pianoRollBeats.map((_, idx) => {
              const index = idx + 1;
              return (
                <GridCell
                  key={`cell-${midiNote}-${index}`}
                  className="hoverable"
                  onMouseDown={(e) => handleMouseDown(e, index, toMidi(midiNote)!)}
                  onMouseMove={(e) => handleMouseMove(e, index, toMidi(midiNote)!)}
                  onMouseUp={(e) => handleMouseUp(e, index, midiNote)}
                  $idx={idx}
                  $subdivision={subdivisionType}
                  $pianoRollBeats={pianoRollBeats}
                  $midiNote={midiNote}
                  $pianoRollKeys={pianoRollKeys}
                  $beatWidth={beatWidth}
                >
                  {/* DRAGGING THE RECT SELECTOR TO SELECT PLACED NOTES }
                  {inputMode === InputMode.SELECT
                    && isMouseDown
                    && startingCursorPos
                    && cursorPosition
                    && Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat) === index
                    && Math.max(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!) === toMidi(midiNote)
                    && (
                      <RectSelector
                        $width={(Math.abs(startingCursorPos.midiBeat - cursorPosition.midiBeat) + 1) * beatWidth - 1}
                        $height={(Math.abs(toMidi(startingCursorPos.midiNote)! - toMidi(cursorPosition.midiNote)!) + 1) * (beatHeight - 1) - 1}
                      />
                    )}
                </GridCell>
              );
            })} */}
          </div>
        ))}
      </div>
    </CompositionContainer>
  );
}
