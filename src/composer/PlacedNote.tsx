import React, { CSSProperties, ReactEventHandler } from "react";
import styled from "styled-components";
import { zIndex_placedNote, zIndex_selectedNote, zIndex_clickedNote } from "./consts";

const StyledNote = styled.div<{
  $width: number,
  $bgColor: string,
  $shouldMouseIgnoreMe?: boolean,
  $isClickedNote?: boolean,
  $isNoteSelected?: boolean,
}>`
  width: ${({ $width }) => `${$width}px`};
  height: 13px;
  content: " ";
  background-color: ${({ $bgColor }) => $bgColor};
  position: absolute;
  left: ${({ $isClickedNote, $isNoteSelected }) => $isClickedNote || $isNoteSelected ? '-1px' : '0' };
  top: ${({ $isClickedNote, $isNoteSelected }) => $isClickedNote || $isNoteSelected ? '-1px' : '0' };
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
  beatWidth,
  noteWidth,
  shouldMouseIgnoreMe,
  onMouseDown,
  isClickedNote,
  isNoteSelected,
  style,
}: {
  children?: React.ReactNode
  bgColor: string;
  beatWidth: number;
  noteWidth: number;
  shouldMouseIgnoreMe?: boolean;
  onMouseDown?: ReactEventHandler
  isClickedNote?: boolean;
  isNoteSelected?: boolean;
  style?: CSSProperties
}) {
  return (
    <StyledNote
      $bgColor={bgColor}
      $isNoteSelected={isNoteSelected}
      $width={noteWidth * beatWidth - 1}
      $shouldMouseIgnoreMe={shouldMouseIgnoreMe}
      $isClickedNote={isClickedNote}
      onMouseDown={onMouseDown}
      style={style}>
      {children}
    </StyledNote>
  );
}