import React, { ReactElement, ReactEventHandler, useCallback, useContext, useMemo, useState } from "react";
import {
  AudioContextContext,
  Composition,
  getPlacedNotesFromComposition,
  InputMode,
  InstrumentInstruction,
  MidiBeat,
  MidiNote,
  MidiNoteNum,
  OctavelessMidiNote,
  UserInstrument,
  zIndex_rectSelect,
} from "./consts";
import styled from "styled-components";
import { toMidi } from "../smplr/player/midi";
import { PlacedNote } from "./PlacedNote";
import { CompositionContext } from "./contexts/CompositionContextProvider";
import { UserInstrumentContext } from "./contexts/UserInstrumentContextProvider";
import { SongSettingsContext } from "./contexts/SongSettingsContextProvider";

type CursorPosition = { midiNote: MidiNote; midiBeat: MidiBeat; };
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
pianoRollKeys.push("C5");
pianoRollKeys.reverse();
const beatWidth = 16;
const pianoRollBeats: number[] = new Array(70);
pianoRollBeats.fill(0);
let globalCursorXOffset = 0;
let globalHasMouseMoved = false;
let globalClickedNote: InstrumentInstruction | undefined;
type Offset = { x: number, y: number };
type InstrumentInstructionWithOffset = { instrumentInstruction: InstrumentInstruction, offset: Offset };
let globalSelectedNotes: Record<string, InstrumentInstructionWithOffset> = {};
function globalIsNoteSelected(instrumentInstruction: InstrumentInstruction) {
  return !!Object.keys(globalSelectedNotes).find((noteId) => parseInt(noteId) === instrumentInstruction.noteId);
}

const GridCell = styled.div<{
  $idx: number,
  $pianoRollBeats: number[],
  $midiNote: string,
  $pianoRollKeys: string[],
}>`
  position: relative;
  cursor: pointer;
  border-top: 1px dotted #b2bcc2;
  width: ${beatWidth - 1}px;
  min-width: ${beatWidth - 1}px;
  border-left: ${({ $idx }) => `1px ${
    $idx % 4 === 0 ? "solid" : "dashed"
  } ${
    $idx % 16 === 0 ? "black" : "lightgray"
  }`};
  border-bottom: ${({ $midiNote, $pianoRollKeys }) => $midiNote[0] === "C"
      ? '1px solid #b2bcc2'
      : $midiNote === $pianoRollKeys[$pianoRollKeys.length - 1]
        ? '1px dashed #b2bcc2'
        : 'unset' };
  border-right: ${({ $idx, $pianoRollBeats }) => $idx === $pianoRollBeats.length - 1
    ? '1px dashed #b2bcc2'
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
  position: relative;
  left: -10px;
  top: -6px;
  background-position: ${({ $frame }) => `${$frame * -20}px 0px`};
`;

export function CompositionAndPlayhead({
  inputMode,
}: {
  inputMode: InputMode;
}) {
  const audioContext = useContext(AudioContextContext)!;
  const { playheadPosX, babyDanceFrame } = useContext(SongSettingsContext)!;
  const {
    userInstruments,
    userInstrumentIndex,
  } = useContext(UserInstrumentContext)!;
  const {
    composition,
    isCompositionMouseDown: isMouseDown,
    setIsCompositionMouseDown: setIsMouseDown,
    onCompositionMouseUp,
    setOnCompositionMouseUp,
    addCompositionNotes,
    removeCompositionNotes,
  } = useContext(CompositionContext)!;
  const currUserInstrument = useMemo(
    () => userInstruments[userInstrumentIndex],
    [userInstruments, userInstrumentIndex]
  );
  
  const [clickedNote, setClickedNote] = useState<InstrumentInstruction | undefined>(undefined);
  const [selectedNotes, setSelectedNotes] = useState<Record<string, InstrumentInstructionWithOffset>>({});
  const [cursorPosition, setCursorPosition] = useState<
    CursorPosition | undefined
  >();
  const [startingCursorPos, setStartingCursorPos] = useState<
    CursorPosition | undefined
  >();
  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setOnCompositionMouseUp(undefined);
      if (!globalClickedNote && Object.entries(globalSelectedNotes).length > 0 && inputMode !== InputMode.SELECT) {
        setIsMouseDown(false);
        setCursorPosition(undefined);
        setStartingCursorPos(undefined);
      } else {
        setIsMouseDown(true);
        setCursorPosition({ midiNote, midiBeat: midiBeat - globalCursorXOffset });
        setStartingCursorPos({ midiNote, midiBeat });
        if (!globalClickedNote && inputMode === InputMode.DEFAULT) {
          currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 });
        }
      }
      globalHasMouseMoved = false;
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      if (!globalClickedNote || !globalIsNoteSelected(globalClickedNote)) {
        setSelectedNotes({});
        globalSelectedNotes = {};
      }
      return false;
    },
    [currUserInstrument, audioContext, composition, inputMode]
  );
  const handleMouseUp = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string
    ) => {
      if (isMouseDown && cursorPosition && startingCursorPos && (!clickedNote || globalHasMouseMoved)) {
        if (inputMode === InputMode.DEFAULT) {
          if (!clickedNote) {
            const noteWidth = Math.abs(cursorPosition.midiBeat - startingCursorPos.midiBeat) + 1;
            addCompositionNotes([{
              midiBeat: Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat),
              midiNote: toMidi(midiNote)!,
              noteWidth,
              userInstrumentIndex,
            }]);
          } else {
            addCompositionNotes([
              // Place the note that you were clicking and dragging
              {
                noteId: clickedNote.noteId,
                midiBeat: cursorPosition.midiBeat + globalCursorXOffset,
                midiNote: toMidi(midiNote)!,
                noteWidth: clickedNote.noteWidth,
                userInstrumentIndex: clickedNote.userInstrumentIndex,
              },
              // Place all other notes that were currently selected
              ...(Object.entries(selectedNotes).filter(
                ([noteId, _]) => noteId !== clickedNote.noteId.toString()
              ).map(
                ([noteId, noteWithOffset]) => {
                  const offset = noteWithOffset.offset;
                  const newMidiBeat = cursorPosition.midiBeat + globalCursorXOffset + offset.x;
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
                  };
                }))
            ]);
            // setSelectedNotes({...globalSelectedNotes});
            // fuck it just clear the selected notes
            setSelectedNotes({});
            globalSelectedNotes = {};
          }
        } else if (inputMode === InputMode.SELECT) {
          const bounds = {
            left: Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat),
            top: Math.min(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!), 
            right: Math.max(cursorPosition.midiBeat, startingCursorPos.midiBeat),
            bottom: Math.max(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!),
          }
          const notes = getPlacedNotesFromComposition(composition, bounds);
          globalSelectedNotes = notes.reduce((acc, note) => ({ ...acc, [note.noteId]: {
            instrumentInstruction: note,
            offset: { x: 0, y: 0 },
          } as InstrumentInstructionWithOffset}), {});
          setSelectedNotes(globalSelectedNotes);
        }
      }
      setClickedNote(undefined);
      globalClickedNote = undefined;
      setIsMouseDown(false);
      setCursorPosition(undefined);
      setStartingCursorPos(undefined);
      if (onCompositionMouseUp) {
        onCompositionMouseUp();
      }
      setOnCompositionMouseUp(undefined);
      globalCursorXOffset = 0;
      globalHasMouseMoved = false;
      // TODO(jaketrower): do this with the window documnet too like handleKeyDown
    },
    [
      cursorPosition,
      addCompositionNotes,
      userInstrumentIndex,
      clickedNote,
      isMouseDown,
      startingCursorPos,
      onCompositionMouseUp,
      composition,
    ]
  );
  const handleMouseMove = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string
    ) => {
      if (
        isMouseDown &&
        cursorPosition &&
        (cursorPosition.midiBeat !== midiBeat ||
          cursorPosition.midiNote !== midiNote)
      ) {
        globalHasMouseMoved = true;
        setCursorPosition({ midiNote, midiBeat });
        if (inputMode !== InputMode.DEFAULT) return;
        if (midiNote !== cursorPosition.midiNote) {
          if (globalClickedNote) {
            userInstruments[globalClickedNote.userInstrumentIndex].sf2Sampler?.start({
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
    [isMouseDown, cursorPosition, currUserInstrument, clickedNote]
  );

  const handlePlacedNoteMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string,
      noteJustClicked: InstrumentInstruction
    ) => {
      e.preventDefault();
      if (inputMode !== InputMode.DEFAULT) return;
      const clientRect = (e.target as Element).getBoundingClientRect();
      globalCursorXOffset = -Math.floor((e.pageX - clientRect.left) / beatWidth);
      if (globalIsNoteSelected(noteJustClicked)) {
        setClickedNote(noteJustClicked);
        globalClickedNote = noteJustClicked;
        removeCompositionNotes(Object.keys(globalSelectedNotes));
        Object.entries(globalSelectedNotes).forEach(([noteId, noteWithOffset]) => {
          if (noteId === noteJustClicked.noteId.toString()) return;
          noteWithOffset.offset = {
            x: noteWithOffset.instrumentInstruction.midiBeat - noteJustClicked.midiBeat,
            y: noteJustClicked.midiNote - noteWithOffset.instrumentInstruction.midiNote,
          }
        });
        setSelectedNotes({...globalSelectedNotes});
      } else {
        setClickedNote(noteJustClicked);
        globalClickedNote = noteJustClicked;
        removeCompositionNotes([noteJustClicked.noteId.toString()]);
        setSelectedNotes({});
        globalSelectedNotes = {};
      }
      userInstruments[noteJustClicked.userInstrumentIndex].sf2Sampler?.start({ note: midiNote, duration: 0.25 });
    },
    [removeCompositionNotes, inputMode, selectedNotes, userInstruments]
  );

  const playheadNode = useMemo(() => <BabyPlayheadImg src="trans.png" $frame={babyDanceFrame} />, [])

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", height: beatWidth }}>
        <div
          key="empty"
          style={{ width: beatWidth * 2, minWidth: beatWidth * 2 }}
        >
          &nbsp;
        </div>
        {pianoRollBeats.map((_, idx) => {
          const index = idx + 1;
          return (
            <div
              key={index}
              style={{
                width: beatWidth,
                minWidth: beatWidth,
                textAlign: "left",
              }}
            >
              {playheadPosX === index ? playheadNode : " "}
            </div>
          );
        })}
      </div>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
      >
        {pianoRollKeys.map((midiNote, _) => (
          <div style={{ display: "flex", height: beatWidth - 1 }}>
            <div
              key={`row-${midiNote}`}
              style={{
                width: beatWidth * 2,
                minWidth: beatWidth * 2,
                textAlign: "left",
                userSelect: "none",
              }}
            >
              {midiNote}
            </div>
            {pianoRollBeats.map((_, idx) => {
              const index = idx + 1;
              const currBgColor = currUserInstrument.color ?? "gray";
              return (
                <GridCell
                  key={`cell-${midiNote}-${index}`}
                  className="hoverable"
                  onMouseDown={(e) => handleMouseDown(e, index, midiNote)}
                  onMouseMove={(e) => handleMouseMove(e, index, midiNote)}
                  onMouseUp={(e) => handleMouseUp(e, index, midiNote)}
                  $idx={idx}
                  $pianoRollBeats={pianoRollBeats}
                  $midiNote={midiNote}
                  $pianoRollKeys={pianoRollKeys}
                >
                  {/* STATIC(ISH) PLACED NOTES */}
                  {composition[index]?.[toMidi(midiNote)!] !== undefined && (
                    Object.values(composition[index]?.[toMidi(midiNote)!]).map((instrumentInstruction) => {
                      const bgColor = userInstruments[instrumentInstruction.userInstrumentIndex].color ?? 'gray';
                      return (<PlacedNote
                        bgColor={bgColor}
                        noteWidth={instrumentInstruction.noteWidth}
                        onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => handlePlacedNoteMouseDown(
                          e, index, midiNote, instrumentInstruction
                        )}
                        shouldMouseIgnoreMe={isMouseDown}
                        isNoteSelected={globalIsNoteSelected(instrumentInstruction)}
                      />)
                  }))}
                  {/* DRAGGING TO CREATE A NEW NOTE */}
                  {inputMode === InputMode.DEFAULT
                    && isMouseDown
                    && startingCursorPos
                    && cursorPosition
                    && cursorPosition.midiNote === midiNote
                    && !clickedNote
                    && Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat) === index
                    && (
                      <PlacedNote
                        bgColor={currBgColor}
                        noteWidth={Math.abs(startingCursorPos.midiBeat - cursorPosition.midiBeat) + 1}
                        isClickedNote
                      />
                    )}
                  {/* DRAGGING EXISTING NOTE */}
                  {inputMode === InputMode.DEFAULT
                    && isMouseDown
                    && startingCursorPos
                    && cursorPosition
                    && cursorPosition.midiNote === midiNote
                    && clickedNote
                    && cursorPosition.midiBeat + globalCursorXOffset === index
                    && (
                      <>
                        <PlacedNote
                          bgColor={userInstruments[clickedNote.userInstrumentIndex].color}
                          noteWidth={clickedNote.noteWidth}
                          isNoteSelected={globalIsNoteSelected(clickedNote)}
                          isClickedNote
                        />
                        {Object.entries(selectedNotes).map(([noteId, noteWithOffset]) =>
                          noteId !== clickedNote.noteId.toString()
                          && (<PlacedNote
                            bgColor={userInstruments[noteWithOffset.instrumentInstruction.userInstrumentIndex].color}
                            noteWidth={noteWithOffset.instrumentInstruction.noteWidth}
                            isNoteSelected
                            isClickedNote
                            style={{
                              left: (noteWithOffset.offset.x) * beatWidth,
                              top: (noteWithOffset.offset.y) * (beatWidth - 1),
                            }}
                          />
                        ))}
                      </>
                    )}

                  {/* DRAGGING THE RECT SELECTOR TO SELECT PLACED NOTES */}
                  {inputMode === InputMode.SELECT
                    && isMouseDown
                    && startingCursorPos
                    && cursorPosition
                    && Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat) === index
                    && Math.max(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!) === toMidi(midiNote)
                    && (
                      <RectSelector
                        $width={(Math.abs(startingCursorPos.midiBeat - cursorPosition.midiBeat) + 1) * beatWidth}
                        $height={(Math.abs(toMidi(startingCursorPos.midiNote)! - toMidi(cursorPosition.midiNote)!) + 1) * (beatWidth - 1)}
                      />
                    )}
                </GridCell>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
