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
  zIndex_placedNote,
  zIndex_rectSelect,
} from "./consts";
import styled from "styled-components";
import { toMidi } from "../smplr/player/midi";

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
let globalClickedNotes: InstrumentInstruction[] = [];
let globalSelectedNotes: InstrumentInstruction[] = [];

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

const StyledNote = styled.div<{ $width: number, $bgColor: string, $shouldMouseIgnoreMe?: boolean, $isClickedNote?: boolean }>`
  width: ${({ $width }) => `${$width}px`};
  height: 14px;
  content: " ";
  background-color: ${({ $bgColor }) => $bgColor};
  position: absolute;
  left: ${({ $isClickedNote }) => $isClickedNote ? '-1px' : '0' };
  top: ${({ $isClickedNote }) => $isClickedNote ? '-1px' : '0' };
  z-index: ${({ $isClickedNote }) => $isClickedNote ? zIndex_placedNote + 1 : zIndex_placedNote };
  // border: 1px solid black;
  border-radius: 0;
  box-shadow: ${({ $isClickedNote }) => `0px 0px 0px 1px black${$isClickedNote ? ', 2px 2px 0px 0px black' : ''}` };
  pointer-events: ${({ $shouldMouseIgnoreMe, $isClickedNote }) => $shouldMouseIgnoreMe || $isClickedNote ? 'none' : 'unset' };
`;

const RectSelector = styled.div<{ $width: number, $height: number }>`
  background: #76feff54;
  outline: 1px dashed #004cff54;
  position: absolute;
  width: ${({ $width }) => `${$width}px`};
  height: ${({ $height }) => `${$height}px`};
  z-index: ${zIndex_rectSelect};
  pointer-events: none;
`

function PlacedNote({
  bgColor,
  noteWidth,
  shouldMouseIgnoreMe,
  onMouseDown,
  isClickedNote,
}: {
  bgColor: string;
  noteWidth: number;
  shouldMouseIgnoreMe?: boolean;
  onMouseDown?: ReactEventHandler
  isClickedNote?: boolean;
}) {
  return (
    <StyledNote
      $bgColor={bgColor}
      $width={noteWidth * 16 - 1}
      $shouldMouseIgnoreMe={shouldMouseIgnoreMe}
      $isClickedNote={isClickedNote}
      onMouseDown={onMouseDown}>
      {/* 🎸 */}
    </StyledNote>
  );
}

export function CompositionAndPlayhead({
  context,
  composition,
  userInstruments,
  userInstrumentIndex,
  isCompositionMouseDown: isMouseDown,
  setIsCompositionMouseDown: setIsMouseDown,
  onCompositionMouseUp,
  setOnCompositionMouseUp,
  handleUpdateCompositionAtBeatAndNote,
  playheadNode,
  playheadPosX,
  inputMode,
}: {
  context: AudioContext;
  composition: Composition;
  userInstruments: Array<UserInstrument>;
  userInstrumentIndex: number;
  isCompositionMouseDown: boolean;
  setIsCompositionMouseDown: (newValue: boolean) => void;
  onCompositionMouseUp: (() => void) | undefined
  setOnCompositionMouseUp: (callback: (() => void) | undefined) => void;
  handleUpdateCompositionAtBeatAndNote: (props: {
    midiBeat: MidiBeat,
    midiNote: MidiNoteNum,
    noteWidth: number,
    noteId: number | undefined,
  }) => void;
  playheadNode: ReactElement;
  playheadPosX: number;
  inputMode: InputMode;
}) {
  const currUserInstrument = useMemo(
    () => userInstruments[userInstrumentIndex],
    [userInstruments, userInstrumentIndex]
  );
  
  const [clickedNotes, setClickedNotes] = useState<InstrumentInstruction[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<InstrumentInstruction[]>([]);
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
      setOnCompositionMouseUp(undefined);
      if (globalClickedNotes.length === 0 && globalSelectedNotes.length > 0) {
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
      if (globalClickedNotes.length === 0 || globalSelectedNotes.some((sn) => !globalClickedNotes.find((cn) => cn.noteId === sn.noteId))) {
        setSelectedNotes([]);
        globalSelectedNotes = [];
      }
    },
    [currUserInstrument, context, composition]
  );
  const handleMouseUp = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string
    ) => {
      if (isMouseDown && cursorPosition && startingCursorPos && (clickedNotes.length === 0 || globalHasMouseMoved)) {
        if (inputMode === InputMode.DEFAULT) {
          if (clickedNotes.length === 0) {
            const noteWidth = Math.abs(cursorPosition.midiBeat - startingCursorPos.midiBeat) + 1;
            handleUpdateCompositionAtBeatAndNote({
              midiBeat: Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat),
              midiNote: toMidi(midiNote)!,
              noteWidth,
              noteId: undefined,
            });
          } else {
            clickedNotes.forEach((clickedNote) => {
              const noteWidth = clickedNote.noteWidth;
              handleUpdateCompositionAtBeatAndNote({
                midiBeat: cursorPosition.midiBeat + globalCursorXOffset,
                midiNote: toMidi(midiNote)!,
                noteWidth,
                noteId: clickedNote.noteId,
              });
            });
          }
        } else if (inputMode === InputMode.SELECT) {
          const bounds = {
            left: Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat),
            top: Math.min(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!), 
            right: Math.max(cursorPosition.midiBeat, startingCursorPos.midiBeat),
            bottom: Math.max(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!),
          }
          const notes = getPlacedNotesFromComposition(composition, bounds);
          setSelectedNotes(notes)
          globalSelectedNotes = notes;
        }
      }
      setClickedNotes([]);
      globalClickedNotes = [];
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
      handleUpdateCompositionAtBeatAndNote,
      clickedNotes,
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
      instrumentInstruction: InstrumentInstruction
    ) => {
      e.preventDefault();
      if (inputMode !== InputMode.DEFAULT) return;
      const clientRect = (e.target as Element).getBoundingClientRect();
      globalCursorXOffset = -Math.floor((e.pageX - clientRect.left) / beatWidth);
      if (selectedNotes.find((n) => n.noteId === instrumentInstruction.noteId)) {
        setClickedNotes([...selectedNotes]);
        globalClickedNotes = [...selectedNotes];
      } else {
        setClickedNotes([instrumentInstruction]);
        globalClickedNotes = [instrumentInstruction];
        setSelectedNotes([]);
        globalSelectedNotes = [];
      }
      handleUpdateCompositionAtBeatAndNote({
        midiBeat,
        midiNote: toMidi(midiNote)!,
        noteWidth: 0,
        noteId: instrumentInstruction.noteId,
      });
    },
    [handleUpdateCompositionAtBeatAndNote, inputMode, selectedNotes]
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
              key={midiNote}
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
                  key={index}
                  className="hoverable"
                  onMouseDown={(e) => handleMouseDown(e, index, midiNote)}
                  onMouseMove={(e) => handleMouseMove(e, index, midiNote)}
                  onMouseUp={(e) => handleMouseUp(e, index, midiNote)}
                  $idx={idx}
                  $pianoRollBeats={pianoRollBeats}
                  $midiNote={midiNote}
                  $pianoRollKeys={pianoRollKeys}
                >
                  {composition[index]?.[toMidi(midiNote)!] !== undefined && (
                    Object.values(composition[index]?.[toMidi(midiNote)!]).map((instrumentInstruction) => {
                      const bgColor = selectedNotes.find((n) => n.noteId === instrumentInstruction.noteId)
                        ? 'gray'
                        : userInstruments[instrumentInstruction.userInstrumentIndex].color ?? 'gray';
                      return (<PlacedNote
                        bgColor={bgColor}
                        noteWidth={instrumentInstruction.noteWidth}
                        onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => handlePlacedNoteMouseDown(
                          e, index, midiNote, instrumentInstruction
                        )}
                        shouldMouseIgnoreMe={isMouseDown}
                      />)
                  }))}
                  {inputMode === InputMode.DEFAULT &&
                    startingCursorPos &&
                    cursorPosition &&
                    cursorPosition.midiNote === midiNote &&
                    // TODO(jaketrower): with the globalCursorXOffset... we might have to have that on a per clickedNote basis???
                    // also that would go for the matching midiNote(s) too
                    (clickedNotes.length !== 0 ? cursorPosition.midiBeat + globalCursorXOffset : Math.min(
                      cursorPosition.midiBeat,
                      startingCursorPos.midiBeat
                    )) === index && (
                      <PlacedNote
                        bgColor={currBgColor}
                        noteWidth={
                          // TODO(TODO(TODO(TODO)))
                          clickedNotes[0]?.noteWidth ?? Math.abs(
                            startingCursorPos.midiBeat - cursorPosition.midiBeat
                          ) + 1
                        }
                        isClickedNote
                      />
                    )}
                  {inputMode === InputMode.SELECT &&
                    startingCursorPos &&
                    cursorPosition &&
                    Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat) === index &&
                    Math.max(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!) === toMidi(midiNote) && (
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
