import React, { CSSProperties, ReactEventHandler } from "react";
import styled from "styled-components";
import { zIndex_placedNote, zIndex_selectedNote, zIndex_clickedNote, InstrumentInstruction, SubdivisionType } from "./consts";

const StyledNote = styled.div<{
  $width: number,
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
  top: ${({ $isClickedNote, $isNoteSelected }) => $isClickedNote || $isNoteSelected ? '0' : '1px' };
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

export function PlacedNote({
  children,
  bgColor,
  instrumentInstruction,
  shouldMouseIgnoreMe,
  onMouseDown,
  isClickedNote,
  isNoteSelected,
  style,
}: {
  children?: React.ReactNode
  bgColor: string;
  instrumentInstruction: Pick<InstrumentInstruction, 'midiBeat' | 'noteWidth' | 'subdivisionType'>,
  shouldMouseIgnoreMe?: boolean;
  onMouseDown?: ReactEventHandler
  isClickedNote?: boolean;
  isNoteSelected?: boolean;
  style?: CSSProperties
}) {
  const { midiBeat, noteWidth, subdivisionType } = instrumentInstruction;
  const pianoKeyWidth = subdivisionType === SubdivisionType.q ? 15 : 10;
  const beatWidth = subdivisionType === SubdivisionType.q ? 15 : 20;
  const leftShift = (isClickedNote || isNoteSelected) ? -1 : 0;
  const x = midiBeat * beatWidth;
  const left = x + pianoKeyWidth + 1 + leftShift;
  return (
    <StyledNote
      $bgColor={bgColor}
      $isNoteSelected={isNoteSelected}
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