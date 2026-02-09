import React, { UIEvent, useCallback, useContext, useEffect, useMemo } from "react";
import { getRelativeBeatWidth, lightColor, mediumColor, MidiBeat, MidiNoteNum, pianoRollBeats, pianoRollKeys, SubdivisionType, TimeSignature, veryLightColor } from "../consts";
import styled, { CSSProperties } from "styled-components";
import { toMidi } from "../../smplr/player/midi";
import { CellComponentProps, Grid, useGridCallbackRef } from "react-window";
import { SubdivisionTypeContext } from "../contexts/SubdivisionTypeContextProvider";
import { TimeSignatureContext } from "../contexts/TimeSignatureContextProvider";
import { createPortal } from "react-dom";
import { DebouncedState } from "use-debounce/dist/useDebouncedCallback";
import { BeatSizeContext } from "../contexts/BeatSizeContextProvider";

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

type MouseHandler = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: MidiBeat, midiNote: MidiNoteNum) => boolean | undefined;

const useCellProps = ({
  handleMouseDown,
  handleDoubleClick,
  handleMouseMove,
}: {
  handleMouseDown: MouseHandler,
  handleDoubleClick: MouseHandler,
  handleMouseMove: DebouncedState<MouseHandler>,
}) => {
  const { _beatWidth } = useContext(BeatSizeContext)!;
  const { _subdivisionType } = useContext(SubdivisionTypeContext)!;
  const { _timeSignature } = useContext(TimeSignatureContext)!;
  const beatWidth = useMemo(() => getRelativeBeatWidth(_subdivisionType, _beatWidth), [_subdivisionType, _beatWidth]);
  const cellProps = useMemo(() => ({
    beatWidth,
    subdivisionType: _subdivisionType,
    timeSignature: _timeSignature,
    handleMouseDown,
    handleDoubleClick,
    handleMouseMove,
  }), [_subdivisionType, _timeSignature, beatWidth, handleMouseDown, handleDoubleClick, handleMouseMove]);
  return cellProps;
};

let hasInitializedScroll = false;
export function CompositionGrid({
  children,
  handleMouseDown,
  handleDoubleClick,
  handleMouseMove,
}: {
  children: React.ReactNode,
  handleMouseDown: MouseHandler,
  handleDoubleClick: MouseHandler,
  handleMouseMove: DebouncedState<MouseHandler>,
}) {
  const { _beatHeight } = useContext(BeatSizeContext)!;
  const [grid, setGrid] = useGridCallbackRef(null);
  const cellProps = useCellProps({ handleMouseDown, handleDoubleClick, handleMouseMove });
  useEffect(() => {
    if (grid?.element && !hasInitializedScroll) {
      hasInitializedScroll = true;
      grid.element.scrollTo(0, 356);
    }
  }, [grid]);

  const gridStyle = useMemo(() => ({
    height: ((_beatHeight - 1) * (pianoRollKeys.length)) + 1 + 16,
    paddingTop: 16,
    marginTop: -16,
    overscrollBehavior: 'contain',
    borderBottom: `1px solid ${mediumColor}`,
  } as CSSProperties), [_beatHeight]);

  const handleScroll = useCallback((e: UIEvent) => {
    // if (e.)
  }, []);
  
  return (
    <>
      <Grid
        gridRef={setGrid}
        cellComponent={GridCell}
        cellProps={cellProps}
        columnCount={pianoRollBeats.length}
        columnWidth={cellProps.beatWidth}
        rowCount={pianoRollKeys.length}
        rowHeight={_beatHeight - 1}
        style={gridStyle}
        overscanCount={100}
        onScroll={handleScroll}
      />
      {grid?.element && createPortal(children, grid.element)}
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
  handleDoubleClick,
  handleMouseMove,
}: CellComponentProps<{
  beatWidth: number,
  subdivisionType: SubdivisionType,
  timeSignature: TimeSignature
  handleMouseDown: MouseHandler,
  handleDoubleClick: MouseHandler,
  handleMouseMove: DebouncedState<MouseHandler>
}>) {
  const midiNote = toMidi(pianoRollKeys[rowIndex])!
  return <GridCellDiv
    key={`cell-${rowIndex}-${columnIndex}`}
    className="hoverable"
    onMouseDown={(e) => handleMouseDown(e, columnIndex + 1, midiNote)}
    onMouseMove={(e) => handleMouseMove(e, columnIndex + 1, midiNote)}
    onDoubleClick={(e) => handleDoubleClick(e, columnIndex + 1, midiNote)}
    style={style}
    $idx={columnIndex}
    $midiNote={pianoRollKeys[rowIndex]}
    $subdivision={subdivisionType === SubdivisionType.q ? 4 : 3}
    $timeSignature={timeSignature === TimeSignature.ts4_4 ? 4 : 3}
    $beatWidth={beatWidth}
  />
}