import React, { useContext, useEffect, useMemo } from "react";
import { beatHeight, getBeatWidth, lightColor, mediumColor, MidiBeat, MidiNoteNum, pianoRollBeats, pianoRollKeys, SubdivisionType, TimeSignature, veryLightColor } from "../consts";
import styled from "styled-components";
import { fromMidi, toMidi } from "../../smplr/player/midi";
import { CellComponentProps, Grid, useGridRef } from "react-window";
import { SubdivisionTypeContext } from "../contexts/SubdivisionTypeContextProvider";
import { TimeSignatureContext } from "../contexts/TimeSignatureContextProvider";
import { createPortal } from "react-dom";

const GridCellDiv = styled.div<{
  $idx: number,
  $subdivision: number,
  $timeSignature: number,
  $midiNote: string,
  $beatWidth: number,
}>`
  margin-left: 30px;
  position: relative;
  cursor: pointer;
  border-top: 1px ${({ $midiNote }) => $midiNote === pianoRollKeys[0] || ($midiNote[0] === "B" && $midiNote[1] !== 'b')
    ? `solid ${mediumColor}`
    : `dotted ${lightColor}`};
  width: ${({ $beatWidth }) => `${$beatWidth - 1}px`};
  min-width: ${({ $beatWidth }) => `${$beatWidth - 1}px`};
  border-left: ${({ $idx, $subdivision, $timeSignature }) => `1px ${
    $idx % $subdivision === 0 ? "solid" : "dashed"
  } ${
    $idx % ($subdivision * $timeSignature) === 0
      ? "black"
      : $idx % $subdivision === 0
        ? mediumColor
        : veryLightColor
  }`};
  border-bottom: ${({ $midiNote }) => $midiNote === pianoRollKeys[pianoRollKeys.length - 1]
      ? `1px solid ${lightColor}`
      : 'unset' };
  border-right: ${({ $idx }) => $idx === pianoRollBeats.length - 1
    ? `1px solid ${lightColor}`
    : 'unset'
  };
`;

type MouseHandler = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: MidiBeat, midiNote: MidiNoteNum) => false;

const useCellProps = ({
  handleMouseDown,
  handleMouseMove,
}: {
  handleMouseDown: MouseHandler,
  handleMouseMove: MouseHandler,
}) => {
  const {  _subdivisionType } = useContext(SubdivisionTypeContext)!;
  const { _timeSignature } = useContext(TimeSignatureContext)!;
  const beatWidth = useMemo(() => getBeatWidth(_subdivisionType), [_subdivisionType]);
  const cellProps = useMemo(() => ({
    beatWidth,
    subdivisionType: _subdivisionType,
    timeSignature: _timeSignature,
    handleMouseDown,
    handleMouseMove,
  }), [_subdivisionType, _timeSignature, beatWidth, handleMouseDown, handleMouseMove]);
  return cellProps;
};

let hasInitializedScroll = false;
export function CompositionGrid({
  children,
  handleMouseDown,
  handleMouseMove,
}: {
  children: React.ReactNode,
  handleMouseDown: MouseHandler,
  handleMouseMove: MouseHandler,
}) {
  const gridRef = useGridRef(null);
  const gridElement = gridRef.current?.element;
  const cellProps = useCellProps({ handleMouseDown, handleMouseMove });
  useEffect(() => {
    if (gridRef.current?.element && !hasInitializedScroll) {
      hasInitializedScroll = true;
      gridRef.current.element.scrollTo(0, 356);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridRef.current]);
  
  return (
    <>
      <Grid
        gridRef={gridRef}
        cellComponent={GridCell}
        cellProps={cellProps}
        columnCount={pianoRollBeats.length}
        columnWidth={cellProps.beatWidth}
        rowCount={pianoRollKeys.length}
        rowHeight={beatHeight - 1}
        style={{
          height: ((beatHeight - 1) * (pianoRollKeys.length)) + 1 + 16,
          paddingTop: 16,
          marginTop: -16,
          overscrollBehavior: 'contain',
          borderBottom: `1px solid ${mediumColor}`,
        }}
      />
      {gridElement && createPortal(children, gridElement)}
    </>
  );
} 

function GridCell({
  columnIndex,
  rowIndex,
  style,
  beatWidth,
  subdivisionType,
  timeSignature,
  handleMouseDown,
  handleMouseMove,
}: CellComponentProps<{
  beatWidth: number,
  subdivisionType: SubdivisionType,
  timeSignature: TimeSignature
  handleMouseDown: MouseHandler,
  handleMouseMove: MouseHandler
}>) {
  const midiNote = toMidi(pianoRollKeys[rowIndex])!
  return <GridCellDiv
    key={`cell-${rowIndex}-${columnIndex}`}
    className="hoverable"
    onMouseDown={(e) => handleMouseDown(e, columnIndex + 1, midiNote)}
    onMouseMove={(e) => handleMouseMove(e, columnIndex + 1, midiNote)}
    style={style}
    $idx={columnIndex}
    $midiNote={pianoRollKeys[rowIndex]}
    $subdivision={subdivisionType === SubdivisionType.q ? 4 : 3}
    $timeSignature={timeSignature === TimeSignature.ts4_4 ? 4 : 3}
    $beatWidth={beatWidth}
  />
}