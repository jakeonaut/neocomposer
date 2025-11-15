import React, { ReactElement, ReactEventHandler, useCallback, useMemo, useState } from "react";
import {
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



export function CompositionAndPlayhead({
  context,
  composition,
  userInstruments,
  userInstrumentIndex,
  isCompositionMouseDown: isMouseDown,
  setIsCompositionMouseDown: setIsMouseDown,
  onCompositionMouseUp,
  setOnCompositionMouseUp,
  addCompositionNotes,
  removeCompositionNotes,
  playheadNode,
  playheadPosX,
  inputMode,
}: {
  context: AudioContext;
  composition: Composition;
  userInstruments: Array<UserInstrument>;
  userInstrumentIndex: number;
  // TODO(jaketrower): there are so many composition related vars here, should probably just
  // use a ContextProvider instead of passing them all down...
  isCompositionMouseDown: boolean;
  setIsCompositionMouseDown: (newValue: boolean) => void;
  onCompositionMouseUp: (() => void) | undefined
  setOnCompositionMouseUp: (callback: (() => void) | undefined) => void;
  addCompositionNotes: (notesToAdd: (Omit<InstrumentInstruction, 'noteId' | 'sampleStart'> & { noteId?: number })[]) => void;
  removeCompositionNotes: (noteIdsToRemove: string[]) => void;
  playheadNode: ReactElement;
  playheadPosX: number;
  inputMode: InputMode;
}) {
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
      }
      globalHasMouseMoved = false;
      if (context.state === "suspended") {
        context.resume();
      }
      currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 });
      if (!globalClickedNote || !globalIsNoteSelected(globalClickedNote)) {
        setSelectedNotes({});
        globalSelectedNotes = {};
      }
      return false;
    },
    [currUserInstrument, context, composition, inputMode]
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
                  return {
                    noteId: parseInt(noteId),
                    midiBeat: cursorPosition.midiBeat + globalCursorXOffset + offset.x,
                    midiNote: toMidi(midiNote)! + offset.y,
                    noteWidth: noteWithOffset.instrumentInstruction.noteWidth,
                    userInstrumentIndex: noteWithOffset.instrumentInstruction.userInstrumentIndex,
                  };
                }))
            ]);
            // TODO(jaketrower): Place all the selected notes ? ??
            // clickedNotes.forEach((clickedNote) => {
            //   const noteWidth = clickedNote.noteWidth;
            //   handleUpdateCompositionAtBeatAndNote({
            //     midiBeat: cursorPosition.midiBeat + globalCursorXOffset,
            //     midiNote: toMidi(midiNote)!,
            //     noteWidth,
            //     noteId: clickedNote.noteId,
            //   });
            // });
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
          currUserInstrument.sf2Sampler?.start({
            note: midiNote,
            duration: 0.25,
          });
        }
      }
    },
    [isMouseDown, cursorPosition, currUserInstrument]
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
    },
    [removeCompositionNotes, inputMode, selectedNotes]
  );

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
