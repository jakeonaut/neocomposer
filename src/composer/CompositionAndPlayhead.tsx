import React, { ReactElement, useCallback, useMemo, useState } from "react";
import {
  Composition,
  MidiBeat,
  MidiNote,
  OctavelessMidiNote,
  UserInstrument,
} from "./consts";
import styled from "styled-components";

type CursorPosition = { midiNote: MidiNote; midiBeat: MidiBeat };
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

const StyledNote = styled.div<{ $width: number, $bgColor: string, $shouldMouseIgnoreMe?: boolean }>`
  width: ${({ $width }) => `${$width}px`};
  height: 14px;
  content: " ";
  background-color: ${({ $bgColor }) => $bgColor};
  position: absolute;
  left: 0px;
  z-index: 1;
  top: 0;
  // border: 1px solid black;
  border-radius: 0;
  box-shadow: 0px 0px 0px 1px white;
  pointer-events: ${({ $shouldMouseIgnoreMe }) => $shouldMouseIgnoreMe ? 'none' : 'unset' };
`;

function PlacedNote({
  bgColor,
  noteWidth,
  shouldMouseIgnoreMe,
}: {
  bgColor: string;
  noteWidth: number;
  shouldMouseIgnoreMe?: boolean;
}) {
  return (
    <StyledNote $bgColor={bgColor} $width={noteWidth * 16 - 1} $shouldMouseIgnoreMe={shouldMouseIgnoreMe}>
      {/* 🎸 */}
    </StyledNote>
  );
}

export function CompositionAndPlayhead({
  context,
  composition,
  userInstruments,
  userInstrumentIndex,
  handleUpdateCompositionAtBeatAndNote,
  playheadNode,
  playheadPosX,
}: {
  context: AudioContext;
  composition: Composition;
  userInstruments: Array<UserInstrument>;
  userInstrumentIndex: number;
  handleUpdateCompositionAtBeatAndNote: (
    midiBeat: number,
    midiNote: string,
    noteWidth: number
  ) => void;
  playheadNode: ReactElement;
  playheadPosX: number;
}) {
  const currUserInstrument = useMemo(
    () => userInstruments[userInstrumentIndex],
    [userInstruments, userInstrumentIndex]
  );
  const [isMouseDown, setIsMouseDown] = useState(false);
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
      midiNote: string
    ) => {
      setIsMouseDown(true);
      setCursorPosition({ midiNote, midiBeat });
      setStartingCursorPos({ midiNote, midiBeat });
      if (context.state === "suspended") {
        context.resume();
      }
      currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 });
    },
    [currUserInstrument, context]
  );
  const handleMouseUp = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string
    ) => {
      if (isMouseDown && cursorPosition && startingCursorPos) {
        const noteWidth =
          Math.abs(cursorPosition.midiBeat - startingCursorPos.midiBeat) + 1;
        handleUpdateCompositionAtBeatAndNote(
          Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat),
          midiNote,
          noteWidth
        );
      }
      setIsMouseDown(false);
      setCursorPosition(undefined);
      setStartingCursorPos(undefined);
      // TODO(jaketrower): do this with the window documnet too like handleKeyDown
    },
    [
      cursorPosition,
      handleUpdateCompositionAtBeatAndNote,
      isMouseDown,
      startingCursorPos,
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
        setCursorPosition({ midiNote, midiBeat });
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

  const handleNoteClick = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string
    ) => {
      e.preventDefault();
      e.stopPropagation();
      // handleUpdateCompositionAtBeatAndNote(midiBeat, midiNote);
    },
    [handleUpdateCompositionAtBeatAndNote]
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
              const bgColor =
                composition[index]?.[midiNote] !== undefined
                  ? userInstruments[
                      composition[index][midiNote]!.userInstrumentIndex
                    ]!.color ?? "gray"
                  : "gray";
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
                  onClick={(e) => handleNoteClick(e, index, midiNote)}
                  onMouseDown={(e) => handleMouseDown(e, index, midiNote)}
                  onMouseMove={(e) => handleMouseMove(e, index, midiNote)}
                  onMouseUp={(e) => handleMouseUp(e, index, midiNote)}
                >
                  {composition[index]?.[midiNote] !== undefined && (
                    <PlacedNote
                      bgColor={bgColor}
                      noteWidth={composition[index][midiNote]!.noteWidth}
                    />
                  )}
                  {startingCursorPos &&
                    cursorPosition &&
                    cursorPosition.midiNote === midiNote &&
                    Math.min(
                      cursorPosition.midiBeat,
                      startingCursorPos.midiBeat
                    ) === index && (
                      <PlacedNote
                        bgColor={currBgColor}
                        noteWidth={
                          Math.abs(
                            startingCursorPos.midiBeat - cursorPosition.midiBeat
                          ) + 1
                        }
                        shouldMouseIgnoreMe
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
