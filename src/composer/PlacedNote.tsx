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
  height: 14px;
  content: " ";
  background-color: ${({ $bgColor }) => $bgColor};
  position: absolute;
  left: ${({ $isClickedNote }) => $isClickedNote ? '-1px' : '0' };
  top: ${({ $isClickedNote }) => $isClickedNote ? '-1px' : '0' };
  z-index: ${({ $isClickedNote, $isNoteSelected }) => $isClickedNote
    ? zIndex_clickedNote
    : $isNoteSelected
      ? zIndex_selectedNote
      : zIndex_placedNote };
  border-radius: 0;
  box-shadow: ${({ $isClickedNote, $isNoteSelected }) => `0px 0px 0px ${
    $isNoteSelected ? '2px blue' : '1px black'
  }${
    $isClickedNote ? ', 2px 2px 0px 0px black' : ''
  }` };
  pointer-events: ${({ $shouldMouseIgnoreMe, $isClickedNote }) => $shouldMouseIgnoreMe || $isClickedNote ? 'none' : 'unset' };
`;

export function PlacedNote({
  children,
  bgColor,
  noteWidth,
  shouldMouseIgnoreMe,
  onMouseDown,
  isClickedNote,
  isNoteSelected,
  style,
}: {
  children?: React.ReactNode
  bgColor: string;
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
      $width={noteWidth * 16 - 1}
      $shouldMouseIgnoreMe={shouldMouseIgnoreMe}
      $isClickedNote={isClickedNote}
      onMouseDown={onMouseDown}
      style={style}>
      {children}
    </StyledNote>
  );
}