import React, { ReactElement, ReactEventHandler, useCallback, useMemo, useState } from "react";
import {
  Composition,
  InputMode,
  InstrumentInstruction,
  MidiBeat,
  MidiNote,
  OctavelessMidiNote,
  UserInstrument,
  zIndex_placedNote,
  zIndex_rectSelect,
} from "./consts";
import styled from "styled-components";

type CursorPosition = { midiNote: MidiNote; midiBeat: MidiBeat; y: number; };
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
const pianoRollBeats = new Array(70);
pianoRollBeats.fill(0);
let globalCursorXOffset = 0;
let globalHasMouseMoved = false;

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
  outline: 1px dashed blue;
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
    midiBeat: number,
    midiNote: string,
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
  
  const [hasClickedNote, setHasClickedNote] = useState<InstrumentInstruction | undefined>(undefined);
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
      y: number,
    ) => {
      setIsMouseDown(true);
      setOnCompositionMouseUp(undefined);
      console.log("y:",y);
      setCursorPosition({ midiNote, midiBeat: midiBeat - globalCursorXOffset, y });
      setStartingCursorPos({ midiNote, midiBeat, y });
      globalHasMouseMoved = false;
      if (context.state === "suspended") {
        context.resume();
      }
      currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 });
    },
    [currUserInstrument, context, composition, hasClickedNote]
  );
  const handleMouseUp = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string
    ) => {
      if (isMouseDown && cursorPosition && startingCursorPos && (hasClickedNote === undefined || globalHasMouseMoved)) {
        if (inputMode === InputMode.DEFAULT) {
          const noteWidth =
            hasClickedNote?.noteWidth ?? Math.abs(cursorPosition.midiBeat - startingCursorPos.midiBeat) + 1;
          handleUpdateCompositionAtBeatAndNote({
            midiBeat: hasClickedNote
              ? (cursorPosition.midiBeat + globalCursorXOffset)
              : Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat),
            midiNote,
            noteWidth,
            noteId: hasClickedNote?.noteId,
          });
        }
      }
      setHasClickedNote(undefined);
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
      hasClickedNote,
      isMouseDown,
      startingCursorPos,
      onCompositionMouseUp,
    ]
  );
  const handleMouseMove = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string,
      y: number
    ) => {
      if (
        isMouseDown &&
        cursorPosition &&
        (cursorPosition.midiBeat !== midiBeat ||
          cursorPosition.midiNote !== midiNote)
      ) {
        globalHasMouseMoved = true;
        console.log("y:",y);
        setCursorPosition({ midiNote, midiBeat, y });
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
      setHasClickedNote(instrumentInstruction);
      handleUpdateCompositionAtBeatAndNote({
        midiBeat,
        midiNote,
        noteWidth: 0,
        noteId: instrumentInstruction.noteId,
      });
    },
    [handleUpdateCompositionAtBeatAndNote, inputMode]
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
        {pianoRollKeys.map((midiNote, y) => (
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
                <div
                  key={index}
                  className="hoverable"
                  style={{
                    position: "relative",
                    borderLeft: `1px ${idx % 4 === 0 ? "solid" : "dashed"} ${
                      idx % 16 === 0 ? "black" : "lightgray"
                    }`,
                    borderTop: "1px dotted #b2bcc2",
                    borderBottom:
                      midiNote[0] === "C"
                        ? "1px solid #b2bcc2"
                        : y === pianoRollKeys.length - 1
                        ? "1px dashed #b2bcc2"
                        : "unset",
                    borderRight:
                      idx === pianoRollBeats.length - 1
                        ? "1px dashed #b2bcc2"
                        : "unset",
                    width: beatWidth - 1,
                    minWidth: beatWidth - 1,
                    cursor: "pointer",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, index, midiNote, y)}
                  onMouseMove={(e) => handleMouseMove(e, index, midiNote, y)}
                  onMouseUp={(e) => handleMouseUp(e, index, midiNote)}
                >
                  {composition[index]?.[midiNote] !== undefined && (
                    Object.values(composition[index]?.[midiNote]).map((instrumentInstruction) => {
                      const bgColor = userInstruments[instrumentInstruction.userInstrumentIndex].color ?? "gray";
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
                    (hasClickedNote ? cursorPosition.midiBeat + globalCursorXOffset : Math.min(
                      cursorPosition.midiBeat,
                      startingCursorPos.midiBeat
                    )) === index && (
                      <PlacedNote
                        bgColor={currBgColor}
                        noteWidth={
                          hasClickedNote?.noteWidth ?? Math.abs(
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
                    Math.min(cursorPosition.y, startingCursorPos.y) === y && (
                      <RectSelector
                        $width={
                          (Math.abs(startingCursorPos.midiBeat - cursorPosition.midiBeat) + 1) * beatWidth
                        }
                        $height={
                          (Math.abs(startingCursorPos.y - cursorPosition.y) + 1) * (beatWidth - 1)
                        }
                      />
                    )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
