import React, { useContext, useMemo } from "react";
import { beatHeight, MidiBeat, MidiNoteNum, pianoRollBeats, pianoRollKeys, SubdivisionType, zIndex_rectSelect } from "../consts";
import styled from "styled-components";
import { fromMidi, toMidi } from "../../smplr/player/midi";
import { CellComponentProps, Grid } from "react-window";
import { CompositionContext } from "../contexts/CompositionContextProvider";
import { SubdivisionTypeContext } from "../contexts/SubdivisionTypeContextProvider";


const GridCellDiv = styled.div<{
  $idx: number,
  $subdivision: SubdivisionType,
  $midiNote: string,
  $beatWidth: number,
}>`
  position: relative;
  cursor: pointer;
  border-top: 1px ${({ $midiNote }) => $midiNote === pianoRollKeys[0] || ($midiNote[0] === "B" && $midiNote[1] !== 'b')
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
  border-bottom: ${({ $midiNote }) => $midiNote === pianoRollKeys[pianoRollKeys.length - 1]
      ? '1px solid #b2bcc2'
      : 'unset' };
  border-right: ${({ $idx }) => $idx === pianoRollBeats.length - 1
    ? '1px solid #b2bcc2'
    : 'unset'
  };
`;

export function getMidiBeatFromGridBeat(gridBeat: MidiBeat, subdivisionType: SubdivisionType, noteSubdivisionType: SubdivisionType, roundUpInstead: boolean = false) {
  let midiBeat = gridBeat;
  if (subdivisionType === SubdivisionType.t) {
    if (noteSubdivisionType === SubdivisionType.q) {
      midiBeat = Math.round((4 * (gridBeat - 1) / 3) + 1);
    } else if (noteSubdivisionType === SubdivisionType.t) {
      const offset = (gridBeat - 1) % 3;
      const whichQuarterNote = Math.floor((gridBeat - 1) / 3.0);
      const roundingUpOffset = roundUpInstead && offset === 2 ? 1 : 0;
      midiBeat = whichQuarterNote * 4 + offset + 1 + roundingUpOffset;
    }
  } else if (subdivisionType === SubdivisionType.q && noteSubdivisionType === SubdivisionType.t) {
    const currOffset = (gridBeat - 1) % 4;
    const newOffset = Math.min(currOffset, 2);
    midiBeat = midiBeat - currOffset + newOffset;
  }
  // If subdivisionType === SubdivisionType.q && noteSubdivisionType === SubdivisionType.q, don't need to do anything
  return midiBeat;
}

export function getGridBeatFromMidiBeat(midiBeat: MidiBeat, subdivisionType: SubdivisionType) { // , noteSubdivisionType: SubdivisionType) {
  let gridBeat = midiBeat;
  if (subdivisionType === SubdivisionType.t) {
    const offset = midiBeat % 4;
    gridBeat = (Math.floor((midiBeat - 1) / 4) * 3) + offset;
    // if (noteSubdivisionType === SubdivisionType.q && offset === 0) {
    //   gridBeat += 3;
    // }
  }
  return gridBeat;
}

export function getBeatWidth(subdivisionType: SubdivisionType) {
  switch(subdivisionType) {
    case SubdivisionType.q:
      return 15;
    case SubdivisionType.t:
      return 20;
    default:
      const exhaustiveCheck: never = subdivisionType;
      throw new Error(`Unhandled subdivision type: ${exhaustiveCheck}`);
  }
}

type MouseHandler = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: MidiBeat, midiNote: MidiNoteNum) => false;

const useCellProps = ({
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}: {
  handleMouseDown: MouseHandler,
  handleMouseUp: MouseHandler,
  handleMouseMove: MouseHandler,
}) => {
  const {  _subdivisionType } = useContext(SubdivisionTypeContext)!;
  const beatWidth = useMemo(() => getBeatWidth(_subdivisionType), [_subdivisionType]);
  const cellProps = useMemo(() => ({
    beatWidth,
    subdivisionType: _subdivisionType,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }), [_subdivisionType, beatWidth, handleMouseDown, handleMouseMove, handleMouseUp]);
  return cellProps;
};

export function CompositionGrid({
  children,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}: {
  children: React.ReactNode,
  handleMouseDown: MouseHandler,
  handleMouseUp: MouseHandler,
  handleMouseMove: MouseHandler,
}) {
  const cellProps = useCellProps({ handleMouseDown, handleMouseMove, handleMouseUp });
  
  return (
    <Grid
      cellComponent={GridCell}
      cellProps={cellProps}
      columnCount={pianoRollBeats.length}
      columnWidth={cellProps.beatWidth}
      rowCount={pianoRollKeys.length}
      rowHeight={beatHeight - 1}
      style={{
        height: ((beatHeight - 1) * (pianoRollKeys.length)) + 1,
        borderBottom: '1px dotted #b2bcc2',
      }}
    >
      {children}
    </Grid>
  );
} 

function GridCell({
  columnIndex,
  rowIndex,
  style,
  beatWidth,
  subdivisionType,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}: CellComponentProps<{
  beatWidth: number,
  subdivisionType: SubdivisionType,
  handleMouseDown: MouseHandler,
  handleMouseMove: MouseHandler
  handleMouseUp: MouseHandler
}>) {
  const midiNote = toMidi(pianoRollKeys[rowIndex])!
  return <GridCellDiv
    key={`cell-${rowIndex}-${columnIndex}`}
    className="hoverable"
    onMouseDown={(e) => handleMouseDown(e, columnIndex + 1, midiNote)}
    onMouseMove={(e) => handleMouseMove(e, columnIndex + 1, midiNote)}
    onMouseUp={(e) => handleMouseUp(e, columnIndex + 1, midiNote)}
    style={style}
    $idx={columnIndex}
    $midiNote={fromMidi(rowIndex)}
    $subdivision={subdivisionType}
    $beatWidth={beatWidth}
  />
}