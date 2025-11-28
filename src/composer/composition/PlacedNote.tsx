import React, { CSSProperties, ReactEventHandler } from "react";
import styled from "styled-components";
import { zIndex_placedNote, zIndex_selectedNote, zIndex_clickedNote, InstrumentInstruction, SubdivisionType, MidiBeat, InstrumentInstructionWithOffset } from "../consts";

const StyledNote = styled.div<{
  $width: number,
  $top: number,
  $left: number,
  $bgColor: string,
  $shouldMouseIgnoreMe?: boolean,
  $isClickedNote?: boolean,
  $isNoteSelected?: boolean,
}>`
  cursor: ${({ $shouldMouseIgnoreMe }) => $shouldMouseIgnoreMe ? 'default' : 'pointer' };
  width: ${({ $width }) => `${$width}px`};
  height: 13px;
  content: " ";
  background-color: ${({ $bgColor }) => $bgColor};
  position: absolute;
  left: ${({ $left }) => `${$left}px` };
  top: ${({ $top }) => `${$top}px` };
  z-index: ${({ $isClickedNote, $isNoteSelected }) => $isClickedNote
    ? zIndex_clickedNote
    : $isNoteSelected
      ? zIndex_selectedNote
      : zIndex_placedNote };
  border-radius: 0;
  box-shadow: ${({ $isClickedNote, $isNoteSelected }) => `0px 0px 0px ${
    $isNoteSelected ? '1px blue' : '1px black'
  }${
    $isNoteSelected
      ? ', 2px 2px 0px 0px blue'
      : $isClickedNote ? ', 2px 2px 0px 0px black' : ''
  }` };
  pointer-events: ${({ $shouldMouseIgnoreMe, $isClickedNote }) => $shouldMouseIgnoreMe || $isClickedNote ? 'none' : 'unset' };
`;

const BEAT_WIDTH = 15;
const BEAT_HEIGHT = 14;
export function PlacedNote({
  children,
  topmostMidiNote,
  bgColor,
  instrumentInstruction,
  shouldMouseIgnoreMe,
  onMouseDown,
  isClickedNote,
  isNoteSelected,
  selectedNotes,
  style,
}: {
  children?: React.ReactNode
  topmostMidiNote: number;
  bgColor: string;
  instrumentInstruction: Pick<InstrumentInstruction, 'midiBeat' | 'midiNote' | 'noteWidth' | 'subdivisionType'>,
  shouldMouseIgnoreMe?: boolean;
  onMouseDown?: ReactEventHandler
  isClickedNote?: boolean;
  isNoteSelected?: boolean;
  selectedNotes?: Record<string, InstrumentInstructionWithOffset>,
  style?: CSSProperties
}) {
  const { midiBeat, midiNote, noteWidth, subdivisionType } = instrumentInstruction;
  const beatWidth = subdivisionType === SubdivisionType.q ? 15 : 20;
  
  const topShift = (isClickedNote || isNoteSelected) ? -1 : 0
  const y = (topmostMidiNote - midiNote) * BEAT_HEIGHT;
  const top = y + 1 + topShift;

  const leftShift = (isClickedNote || isNoteSelected) ? -1 : 0;
  const x = (midiBeat - 1) * BEAT_WIDTH;
  const tripletLeftShift = subdivisionType === SubdivisionType.t ? 5 * ((midiBeat - 1) % 4) : 0;
  const left = x + 1 + leftShift + tripletLeftShift;
  return (
    <StyledNote
      $bgColor={bgColor}
      $isNoteSelected={isNoteSelected}
      $top={top}
      $left={left}
      $width={noteWidth * beatWidth - 1}
      $shouldMouseIgnoreMe={shouldMouseIgnoreMe}
      $isClickedNote={isClickedNote}
      onMouseDown={onMouseDown}
      style={style}>
      {children}
    </StyledNote>
  );
}