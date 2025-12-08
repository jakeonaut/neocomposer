import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { BabyDanceFrameContext, PlayheadContext, PlayheadPosXContext } from "./contexts/PlayheadContextProvider";
import { SubdivisionTypeContext } from "./contexts/SubdivisionTypeContextProvider";
import { getBeatWidth } from "./composition/CompositionGrid";
import { CompositionContext, getEndOfMeasureToLoopAtBeat, playCompositionNotesAtBeat } from "./contexts/CompositionContextProvider";
import { TimeSignatureContext } from "./contexts/TimeSignatureContextProvider";
import { AudioContextContext } from "./consts";
import { SongSettingsContext } from "./contexts/SongSettingsContextProvider";
import { UserInstrumentContext } from "./contexts/UserInstrumentContextProvider";

const BabyPlayheadImg = styled.img<{ $frame: number }>`
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  background-image: url("baby_dance_sheet.png");
  position: absolute;
  top: -6px;
  left: 0;
  background-position: ${({ $frame }) => `${$frame * -20}px 0px`};
`;

const PixelCoda = styled.div<{ $y: number, $inverted: boolean }>`
  background: ${({ $y, $inverted }) => `url('./toolicons1x.png') repeat scroll ${
    $inverted ? '-25px' : '0'
  } ${$y}px transparent`};
  width: 25px;
  height: 21px;
  image-rendering: pixelated;
`;

function beatFromEvent(e: { target: Element, clientX: number }, beatWidth: number) {
  const clientRect = e.target.getBoundingClientRect();
  return Math.floor((e.clientX - clientRect.left) / beatWidth);
}

export function PlayheadNode() {
  const { babyDanceFrame } = useContext(BabyDanceFrameContext)!;
  const {
    _isPlaying,
    _isLooping,
    setUserPlayheadBounds,
    _userPlayheadBounds,
    incrementBabyDanceFrame,
    setPlayheadPosX,
  } = useContext(PlayheadContext)!;
  const { tempoRef } = useContext(SongSettingsContext)!;
  const audioContext = useContext(AudioContextContext)!;
  const { userInstrumentsRef } = useContext(UserInstrumentContext)!;
  const { _farthestRightNoteEnd, compositionRef } = useContext(CompositionContext)!;
  const { _subdivisionType } = useContext(SubdivisionTypeContext)!;
  const { _timeSignature } = useContext(TimeSignatureContext)!;
  const { _playheadPosX, playheadPosXRef } = useContext(PlayheadPosXContext)!;

  const [_babyMouseDown, _setBabyMouseDown] = useState(false);

  const playheadMouseDownRef = useRef(false);
  const babyMouseDownRef = useRef(_babyMouseDown);
  const startingPlayheadCursorPos = useRef(0);
  const cursorPos = useRef(0);

  const beatWidth = useMemo(() => getBeatWidth(_subdivisionType), [_subdivisionType]);

  const setBabyMouseDown = useCallback((newBabyMouseDown: boolean) => {
    babyMouseDownRef.current = newBabyMouseDown;
    _setBabyMouseDown(newBabyMouseDown);
  }, []);

  const handleBabyMouseDown = useCallback((e: React.MouseEvent) => {
    const cursorBeat = playheadPosXRef.current / beatWidth;
    setBabyMouseDown(true);
    playCompositionNotesAtBeat({
      audioContext,
      composition: compositionRef.current,
      midiBeat: cursorBeat,
      tempo: tempoRef.current,
      userInstruments: userInstrumentsRef.current,
      incrementBabyDanceFrame,
    });
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, [audioContext, beatWidth, compositionRef, incrementBabyDanceFrame, playheadPosXRef, setBabyMouseDown, tempoRef, userInstrumentsRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const start = beatFromEvent({ target: e.target as Element, clientX: e.clientX }, beatWidth);
    playheadMouseDownRef.current = true;
    setUserPlayheadBounds({
      start,
      end: undefined,
    });
    startingPlayheadCursorPos.current = start;
    cursorPos.current = start;
  }, [beatWidth, playheadMouseDownRef, setUserPlayheadBounds]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const cursorBeat = beatFromEvent({ target: e.target as Element, clientX: e.clientX }, beatWidth);
    if (cursorBeat === cursorPos.current) return;
    if (babyMouseDownRef.current) {
      setPlayheadPosX((cursorBeat + 1) * beatWidth);
      playCompositionNotesAtBeat({
        audioContext,
        composition: compositionRef.current,
        midiBeat: cursorBeat + 1,
        tempo: tempoRef.current,
        userInstruments: userInstrumentsRef.current,
        incrementBabyDanceFrame,
      });
    } else if (playheadMouseDownRef.current) {
      if (cursorBeat < startingPlayheadCursorPos.current) {
        setUserPlayheadBounds({
          start: cursorBeat,
          end: startingPlayheadCursorPos.current + 1,
        });
      } else if (cursorBeat === startingPlayheadCursorPos.current) {
        setUserPlayheadBounds({
          start: cursorBeat,
          end: undefined,
        });
      } else {
        setUserPlayheadBounds({
          start: startingPlayheadCursorPos.current,
          end: cursorBeat + 1,
        });
      }
    }
    cursorPos.current = cursorBeat;
  }, [audioContext, beatWidth, compositionRef, incrementBabyDanceFrame, setPlayheadPosX, setUserPlayheadBounds, tempoRef, userInstrumentsRef]);

  const handleMouseUp = useCallback(() => {
    playheadMouseDownRef.current = false;
    setBabyMouseDown(false);
    startingPlayheadCursorPos.current = 0;
    cursorPos.current = 0
  }, [setBabyMouseDown]);
  
  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  const codaSpriteY = useMemo(() => _isLooping ? -189 : -210, [_isLooping]);
  const endOfMeasureToLoopAtBeat = useMemo(
    () => getEndOfMeasureToLoopAtBeat(_farthestRightNoteEnd, _timeSignature), 
    [_farthestRightNoteEnd, _timeSignature]
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        height: 15,
        content: ' ',
        position: 'relative',
        top: -14,
        left: 0,
        cursor: _babyMouseDown ? 'grabbing' : 'col-resize',
        userSelect: 'none',
      }}
    >
      <BabyPlayheadImg
        onMouseDown={handleBabyMouseDown}
        src="trans.png" $frame={babyDanceFrame} style={{
        left: Math.max(_playheadPosX - 15 - 2, -2),
        cursor: 'grab',
        zIndex: 1,
        userSelect: 'none',
        ...(_babyMouseDown || _isPlaying ? { pointerEvents: 'none' } : {})
      }}/>
      <PixelCoda $y={codaSpriteY} $inverted={false} style={{
        position: 'absolute',
        left: _userPlayheadBounds?.start !== undefined
          ? _userPlayheadBounds.start * beatWidth
          : 0,
        userSelect: 'none',
        pointerEvents: 'none',
      }} />
      <PixelCoda $y={codaSpriteY} $inverted={true} style={{
        position: 'absolute',
        left: _userPlayheadBounds?.end !== undefined
          ? (_userPlayheadBounds.end - 1) * beatWidth
          : (endOfMeasureToLoopAtBeat - 1) * beatWidth,
        userSelect: 'none',
        pointerEvents: 'none',
        ...(!_isLooping && _userPlayheadBounds?.end === undefined
          ? { display: 'none' }
          : {}
        )
      }} />
    </div>
  );
}