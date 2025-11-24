import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioContextContext,
  getPlacedNotesFromComposition,
  InputMode,
  InstrumentInstruction,
  InstrumentInstructionWithOffset,
  MidiBeat,
  MidiNote,
  MidiNoteNum,
  OctavelessMidiNote,
  SubdivisionType,
  zIndex_rectSelect,
} from "./consts";
import styled from "styled-components";
import { toMidi } from "../smplr/player/midi";
import { PlacedNote } from "./PlacedNote";
import { CompositionContext } from "./contexts/CompositionContextProvider";
import { UserInstrumentContext } from "./contexts/UserInstrumentContextProvider";
import { SongSettingsContext } from "./contexts/SongSettingsContextProvider";

type CursorPosition = { midiNote: MidiNoteNum; midiBeat: MidiBeat; };
const fullOctave: OctavelessMidiNote[] = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const pianoRollKeys: MidiNote[] = [];
[3, 4].forEach((octave) =>
  fullOctave.forEach((note: OctavelessMidiNote) =>
    pianoRollKeys.push(`${note}${octave}`)
  )
);
pianoRollKeys.push(...["C5", "Db5", "D5", "Eb5", "E5", "F5"]);
pianoRollKeys.reverse();
const beatHeight = 15;
const pianoRollBeats: number[] = new Array(80);
pianoRollBeats.fill(0);

const GridCell = styled.div<{
  $idx: number,
  $pianoRollBeats: number[],
  $subdivision: SubdivisionType,
  $midiNote: string,
  $pianoRollKeys: string[],
  $beatWidth: number,
}>`
  position: relative;
  cursor: pointer;
  border-top: 1px ${({ $midiNote, $pianoRollKeys }) => $midiNote === $pianoRollKeys[0] || ($midiNote[0] === "B" && $midiNote[1] !== 'b')
    ? 'solid #b2bcc2'
    : 'dotted #b2bcc2'};
  width: ${({ $beatWidth }) => `${$beatWidth - 1}px`};
  min-width: ${({ $beatWidth }) => `${$beatWidth - 1}px`};
  border-left: ${({ $idx, $subdivision }) => `1px ${
    $idx % ($subdivision === SubdivisionType.q ? 4 : 3) === 0 ? "solid" : "dashed"
  } ${
    $idx % ($subdivision === SubdivisionType.q ? 16 : 12) === 0
      ? "black"
      : $idx % ($subdivision === SubdivisionType.q ? 4 : 3) === 0
        ? "#b2bcc2"
        : "#ced8e0ff"
  }`};
  border-bottom: ${({ $midiNote, $pianoRollKeys }) => $midiNote === $pianoRollKeys[$pianoRollKeys.length - 1]
      ? '1px solid #b2bcc2'
      : 'unset' };
  border-right: ${({ $idx, $pianoRollBeats }) => $idx === $pianoRollBeats.length - 1
    ? '1px solid #b2bcc2'
    : 'unset'
  };
`;

const RectSelector = styled.div<{ $width: number, $height: number }>`
  background: #76feff54;
  outline: 1px dashed #004cff54;
  position: absolute;
  width: ${({ $width }) => `${$width}px`};
  height: ${({ $height }) => `${$height}px`};
  z-index: ${zIndex_rectSelect};
  pointer-events: none;
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

const CompositionContainer = styled.div`
  display: flex; 
  flex-direction: column;
  // max-width: 100%;
  // overflow-x: auto;
  // overflow-y: visible;
  // border: 1px solid lightgrey;
  // padding: 4px 0 16px;
  // margin: 0 12px;
`;

function getMidiBeatFromGridBeat(gridBeat: MidiBeat, subdivisionType: SubdivisionType) {
  let midiBeat = gridBeat;
  if (subdivisionType === SubdivisionType.t) {
    const offset = (gridBeat - 1) % 3;
    const whichQuarterNote = Math.floor((gridBeat - 1) / 3.0);
    midiBeat = whichQuarterNote * 4 + offset + 1;
  }
  return midiBeat;
}

function getGridBeatFromMidiBeat(midiBeat: MidiBeat, subdivisionType: SubdivisionType) {
  let gridBeat = midiBeat;
  if (subdivisionType === SubdivisionType.t) {
    // const offset = (midiBeat - 1) % 4;
    // gridBeat = ((midiBeat - 1 - offset) / 4) * 3 + 1;
    const offset = midiBeat % 4;
    gridBeat = (Math.floor((midiBeat - 1) / 4) * 3) + offset;
  }
  return gridBeat;
}

export function CompositionAndPlayhead({
  inputMode,
  setInputMode,
}: {
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
}) {
  const audioContext = useContext(AudioContextContext)!;
  const { playheadPosX, babyDanceFrame, setPristine } = useContext(SongSettingsContext)!;
  const {
    userInstruments,
    userInstrumentIndex,
  } = useContext(UserInstrumentContext)!;
  const {
    composition,
    isCompositionMouseDown: isMouseDown, setIsCompositionMouseDown: setIsMouseDown,
    onCompositionMouseUp, setOnCompositionMouseUp,
    heldPianoKeys,
    subdivisionType,
    addCompositionNotes,
    removeCompositionNotes,
    clickedNote, setClickedNote,
    selectedNotes, setSelectedNotes,
  } = useContext(CompositionContext)!;
  const cursorXOffsetRef = useRef(0);
  const hasMouseMovedRef = useRef(false);
  const clickedNoteRef = useRef(undefined as InstrumentInstruction | undefined);
  const selectedNotesRef = useRef({} as Record<string, InstrumentInstructionWithOffset>);
  const isNoteSelected = useCallback((instrumentInstruction: InstrumentInstruction) => {
    selectedNotesRef.current = selectedNotes;
    return !!Object.keys(selectedNotesRef.current).find((noteId) => parseInt(noteId) === instrumentInstruction.noteId);
  }, [selectedNotes]);

  const currUserInstrument = useMemo(
    () => userInstruments[userInstrumentIndex],
    [userInstruments, userInstrumentIndex]
  );
  // This is stupid but, now that I'm setting clickedNotes/selectedNotes elsewhere, I need to update the globalVars
  // I shouldn't be using the global vars, but the event propagation of handlePlacedNoteDown / handleMouseDown
  // is not properly allowing the state to be updated before handleMouseDown is invoked immediately after handlePlacedNoteDown...
  useEffect(() => {
    clickedNoteRef.current = clickedNote;
    selectedNotesRef.current = selectedNotes;
  }, [clickedNote, selectedNotes]);
  const pianoKeyWidth = 30;
  const beatWidth = useMemo(() => {
    switch(subdivisionType) {
      case SubdivisionType.q:
        return 15;
      case SubdivisionType.t:
        return 20;
      default:
        const exhaustiveCheck: never = subdivisionType;
        throw new Error(`Unhandled subdivision type: ${exhaustiveCheck}`);
    }
  }, [subdivisionType]);
  
  const [cursorPosition, setCursorPosition] = useState<
    CursorPosition | undefined
  >();
  const [startingCursorPos, setStartingCursorPos] = useState<
    CursorPosition | undefined
  >();
  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: MidiBeat,
      midiNote: MidiNoteNum,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setOnCompositionMouseUp(undefined);
      setIsMouseDown(true);
      setCursorPosition({ midiNote, midiBeat: midiBeat - cursorXOffsetRef.current });
      setStartingCursorPos({ midiNote, midiBeat });
      if (!clickedNoteRef.current && inputMode === InputMode.DEFAULT) {
        if (audioContext.state === "suspended") {
          audioContext.resume();
        }
        currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 });
      }
      hasMouseMovedRef.current = false;
      if (inputMode === InputMode.DEFAULT && (!clickedNoteRef.current || !isNoteSelected(clickedNoteRef.current))) {
        setSelectedNotes({});
        selectedNotesRef.current = {};
      }
      return false;
    },
    [setOnCompositionMouseUp, setIsMouseDown, inputMode, isNoteSelected, audioContext, currUserInstrument.sf2Sampler, setSelectedNotes]
  );
  const handleMouseUp = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      index: number,
      midiNote: string
    ) => {
      if (isMouseDown && cursorPosition && startingCursorPos) {
        if (inputMode === InputMode.DEFAULT) {
          if ((!clickedNote || hasMouseMovedRef.current)) {
            setPristine(false);
            if (!clickedNote) {
              const noteWidth = Math.abs(cursorPosition.midiBeat - startingCursorPos.midiBeat) + 1;
              const gridBeat = Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat);
              const midiBeat = getMidiBeatFromGridBeat(gridBeat, subdivisionType);
              addCompositionNotes([{
                midiBeat,
                midiNote: toMidi(midiNote)!,
                noteWidth,
                userInstrumentIndex,
                subdivisionType,
              }]);
            } else {
              removeCompositionNotes([clickedNote.noteId.toString()]);
              removeCompositionNotes(Object.keys(selectedNotes));
              const gridBeat = cursorPosition.midiBeat + cursorXOffsetRef.current;
              const midiBeat = getMidiBeatFromGridBeat(gridBeat, subdivisionType);
              addCompositionNotes([
                // Place the note that you were clicking and dragging
                {
                  noteId: clickedNote.noteId,
                  midiBeat,
                  midiNote: toMidi(midiNote)!,
                  noteWidth: clickedNote.noteWidth,
                  userInstrumentIndex: clickedNote.userInstrumentIndex,
                  subdivisionType,
                },
                // Place all other notes that were currently selected
                ...(Object.entries(selectedNotes).filter(
                  ([noteId, _]) => noteId !== clickedNote.noteId.toString()
                ).map(
                  ([noteId, noteWithOffset]) => {
                    const offset = noteWithOffset.offset;
                    const gridBeat = cursorPosition.midiBeat + cursorXOffsetRef.current + offset.x;
                    const newMidiBeat = getMidiBeatFromGridBeat(gridBeat, subdivisionType);
                    const newMidiNote = toMidi(midiNote)! - offset.y;
                    // Update the offset and midiBeat / midiNote for the selection too.....
                    // globalSelectedNotes[noteId].instrumentInstruction.midiBeat = newMidiBeat;
                    // globalSelectedNotes[noteId].instrumentInstruction.midiNote = newMidiNote;
                    // globalSelectedNotes[noteId].offset = { x: 0, y: 0 };
                    return {
                      noteId: parseInt(noteId),
                      midiBeat: newMidiBeat,
                      midiNote: newMidiNote,
                      noteWidth: noteWithOffset.instrumentInstruction.noteWidth,
                      userInstrumentIndex: noteWithOffset.instrumentInstruction.userInstrumentIndex,
                      subdivisionType,
                    };
                  }))
              ]);
              // setSelectedNotes({...globalSelectedNotes});
              // fuck it just clear the selected notes
              setSelectedNotes({});
              selectedNotesRef.current = {};
            }
          } else if (clickedNote && !hasMouseMovedRef.current) {
            removeCompositionNotes([clickedNote.noteId.toString()]);
          }
        } else if (inputMode === InputMode.SELECT) {
          const bounds = {
            left: getMidiBeatFromGridBeat(Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat), subdivisionType),
            top: Math.min(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!), 
            right: getMidiBeatFromGridBeat(Math.max(cursorPosition.midiBeat, startingCursorPos.midiBeat), subdivisionType),
            bottom: Math.max(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!),
          }
          const newlySelectedNotes = getPlacedNotesFromComposition(composition, bounds);
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
      setIsMouseDown(false);
      setCursorPosition(undefined);
      setStartingCursorPos(undefined);
      if (onCompositionMouseUp) {
        onCompositionMouseUp();
      } else if (!e.shiftKey) {
        setInputMode(InputMode.DEFAULT);
      }
      setOnCompositionMouseUp(undefined);
      cursorXOffsetRef.current = 0;
      hasMouseMovedRef.current = false;
      // TODO(jaketrower): do this with the window documnet too like handleKeyDown
    },
    [isMouseDown, cursorPosition, startingCursorPos, setClickedNote, setIsMouseDown, onCompositionMouseUp, setOnCompositionMouseUp, inputMode, clickedNote, setPristine, addCompositionNotes, userInstrumentIndex, subdivisionType, removeCompositionNotes, selectedNotes, setSelectedNotes, composition, setInputMode]
  );
  const handleMouseMove = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: MidiBeat,
      midiNote: MidiNoteNum
    ) => {
      if (
        isMouseDown &&
        cursorPosition &&
        (cursorPosition.midiBeat !== midiBeat ||
          cursorPosition.midiNote !== midiNote)
      ) {
        hasMouseMovedRef.current = true;
        setCursorPosition({ midiNote, midiBeat });
        if (inputMode !== InputMode.DEFAULT) return;
        if (midiNote !== cursorPosition.midiNote) {
          if (clickedNoteRef.current) {
            userInstruments[clickedNoteRef.current.userInstrumentIndex].sf2Sampler?.start({
              note: midiNote,
              duration: 0.25,
            });
          } else {
            currUserInstrument.sf2Sampler?.start({
              note: midiNote,
              duration: 0.25,
            });
          }
        }
      }
    },
    [isMouseDown, cursorPosition, inputMode, userInstruments, currUserInstrument.sf2Sampler]
  );

  const handlePlacedNoteMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      instrumentInstruction: InstrumentInstruction
    ) => {
      e.preventDefault();
      if (inputMode !== InputMode.DEFAULT) return;
      const clientRect = (e.target as Element).getBoundingClientRect();
      cursorXOffsetRef.current = -Math.floor((e.pageX - clientRect.left) / beatWidth);
      if (isNoteSelected(instrumentInstruction)) {
        setClickedNote(instrumentInstruction);
        clickedNoteRef.current = instrumentInstruction;
        Object.entries(selectedNotesRef.current).forEach(([noteId, noteWithOffset]) => {
          if (noteId === instrumentInstruction.noteId.toString()) return;
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
      userInstruments[instrumentInstruction.userInstrumentIndex].sf2Sampler?.start({ note: instrumentInstruction.midiNote, duration: 0.25 });

      handleMouseDown(
        e, 
        getGridBeatFromMidiBeat(instrumentInstruction.midiBeat, subdivisionType),
        instrumentInstruction.midiNote
      );
    },
    [inputMode, beatWidth, isNoteSelected, userInstruments, handleMouseDown, subdivisionType, setClickedNote, setSelectedNotes]
  );

  const playheadNode = useMemo(() => <BabyPlayheadImg src="trans.png" $frame={babyDanceFrame} style={{
    left: playheadPosX,
  }}/>, [babyDanceFrame, playheadPosX]);

  console.log('rerender', selectedNotes);

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
              if (clickedNote && (instrumentInstruction.noteId === clickedNote.noteId || isNoteSelected(instrumentInstruction))) {
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
                shouldMouseIgnoreMe={isMouseDown || inputMode === InputMode.SELECT}
                selectedNotes={selectedNotes}
                isNoteSelected={isNoteSelected(instrumentInstruction)}
              />)
            })))}
        {pianoRollKeys.map((midiNote, _) => (
          <div style={{
            display: "flex",
            height: beatHeight - 1,
            ...(heldPianoKeys[midiNote] ? {
              background: currUserInstrument ? `${currUserInstrument.color}40` : '#b2bcc240',
            } : {}),
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
                ...(heldPianoKeys[midiNote] ? {
                  fontWeight: 700,
                  fontSize: 16,
                  marginTop: -2,
                } : {}),
              }}
              onMouseDown={() => { currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 }); }}
            >
              {midiNote}
            </div>
            {/* DRAGGING TO CREATE A NEW NOTE */}
            {inputMode === InputMode.DEFAULT
              && isMouseDown
              && startingCursorPos
              && cursorPosition
              && cursorPosition.midiNote === toMidi(midiNote)!
              && !clickedNote
              && (
                <PlacedNote
                  topmostMidiNote={toMidi(pianoRollKeys[0])!}
                  bgColor={currUserInstrument.color ?? "gray"}
                  instrumentInstruction={{
                    midiBeat: getMidiBeatFromGridBeat(Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat), subdivisionType),
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
                      midiBeat: getMidiBeatFromGridBeat(cursorPosition.midiBeat + cursorXOffsetRef.current, subdivisionType),
                      midiNote: cursorPosition.midiNote,
                      noteWidth: clickedNote.noteWidth,
                      subdivisionType,
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
                        midiBeat: getMidiBeatFromGridBeat(cursorPosition.midiBeat + cursorXOffsetRef.current + noteWithOffset.offset.x, subdivisionType),
                        midiNote: cursorPosition.midiNote - noteWithOffset.offset.y,
                        noteWidth: noteWithOffset.instrumentInstruction.noteWidth,
                        subdivisionType,
                      }}
                      isNoteSelected
                      isClickedNote
                    />
                  ))}
                </>
              )}
            {/* <div style={{ width: pianoKeyWidth, minWidth: pianoKeyWidth }}></div> */}
            {pianoRollBeats.map((_, idx) => {
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
                  {/* DRAGGING THE RECT SELECTOR TO SELECT PLACED NOTES */}
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
            })}
          </div>
        ))}
      </div>
    </CompositionContainer>
  );
}
