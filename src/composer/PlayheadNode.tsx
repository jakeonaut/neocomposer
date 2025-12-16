import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { PlayheadContext } from "./contexts/PlayheadContextProvider";
import { CompositionContext } from "./contexts/CompositionContextProvider";
import { TimeSignatureContext } from "./contexts/TimeSignatureContextProvider";
import { AudioContextContext, getEndOfMeasureFromBeat, getEndOfMeasureToLoopAtBeat, getStartOfMeasureFromBeat, mediumColor, pianoRollBeats, pianoRollKeys, playCompositionNotesAtBeat, PlayheadBounds, zIndex_playhead } from "./consts";
import { SongSettingsContext } from "./contexts/SongSettingsContextProvider";
import { UserInstrumentContext } from "./contexts/UserInstrumentContextProvider";
import { PlayheadPosXContext } from "./contexts/PlayheadPosXContextProvider";
import { BabyDanceFrameContext, PlayTheSongContext } from "./contexts/PlayTheSongContextProvider";
import { CompositionActionsContext } from "./contexts/CompositionActionsContextProvider";
import { BeatSizeContext } from "./contexts/BeatSizeContextProvider";

const PlayheadContainer = styled.div<{ $isMouseDown: boolean, $beatHeight: number }>`
  height: ${({ $beatHeight }) => `${pianoRollKeys.length * $beatHeight - 62}px`};
  content: ' ';
  position: absolute;
  top: 0;
  left: 0;
  cursor: ${({ $isMouseDown }) => $isMouseDown ? 'grabbing' : 'pointer'};
  user-select: none;
  pointer-events: none;
`;

const PlayheadStickyContainer = styled.div<{ $beatWidth: number }>`
  position: sticky;
  background: white;
  top: -16px;
  width: ${({ $beatWidth }) => `${(pianoRollBeats.length * $beatWidth) + 32}px`};
  height: 16px;
  border-bottom: 1px solid ${mediumColor};
  z-index: ${zIndex_playhead};
  pointer-events: all;
`;

const PlayheadSubContainer = styled.div`
  position: relative; 
  left: 30px;
`;

const BabyPlayheadImg = styled.img<{ $frame: number, $playheadPosX: number, $beatWidth: number, $preventPointerEvents: boolean }>`
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  background-image: url("baby_dance_sheet.png");
  position: absolute;
  background-position: ${({ $frame }) => `${$frame * -20}px 0px`};
  left: ${({ $playheadPosX, $beatWidth }) => `${Math.max($playheadPosX - $beatWidth - 2, -2)}px`};
  top: -4px;
  cursor: grab;
  z-index: 1;
  userSelect: 'none';
  ...(${({ $preventPointerEvents }) => $preventPointerEvents ? { pointerEvents: 'none' } : {}});
`;

const PixelCoda = styled.div<{
  $y: number,
  $left: number,
  $inverted: boolean,
  $isHidden: boolean,
  $preventPointerEvents: boolean,
  $opacity: number,
}>`
  background: ${({ $y, $inverted }) => `url('./toolicons1x.png') repeat scroll ${
    $inverted ? '-25px' : '0'
  } ${$y}px transparent`};
  width: 16px; // TODO(jaketrower):??
  height: 15px; // TODO(jaketrower):??
  image-rendering: pixelated;
  cursor: grab;
  position: absolute;
  top: 2px;
  left: ${({ $left }) => `${$left}px`};
  user-select: none;
  display: ${({ $isHidden }) => $isHidden ? 'none': 'unset'};
  opacity: ${({ $opacity }) => $opacity};
  pointer-events: ${({ $preventPointerEvents }) => $preventPointerEvents ? 'none' : 'normal' };
`;

function beatFromEvent(e: { target: HTMLDivElement, clientX: number }, beatWidth: number) {
  const clientRect = e.target.getBoundingClientRect();
  return Math.floor((e.clientX - clientRect.left) / beatWidth);
}

export function PlayheadNode() {
  const { babyDanceFrame } = useContext(BabyDanceFrameContext)!;
  const {
    handleQuickPlayResetAtCurrentBeat,
    _isPlaying,
    isPlayingRef,
    _isLooping,
    incrementBabyDanceFrame,
  } = useContext(PlayTheSongContext)!;
  const {
    _userPlayheadBounds,
    userPlayheadBoundsRef,
    setUserPlayheadBounds,
  } = useContext(PlayheadContext)!;
  const { tempoRef } = useContext(SongSettingsContext)!;
  const audioContext = useContext(AudioContextContext)!;
  const { _beatWidth, beatWidthRef, _beatHeight } = useContext(BeatSizeContext)!;
  const { userInstrumentsRef } = useContext(UserInstrumentContext)!;
  const { _farthestRightNoteEnd } = useContext(CompositionContext)!;
  const { compositionRef } = useContext(CompositionActionsContext)!;
  const { _timeSignature, timeSignatureRef } = useContext(TimeSignatureContext)!;
  const { _playheadPosX, playheadPosXRef, setPlayheadPosX, } = useContext(PlayheadPosXContext)!;

  const [_babyMouseDown, _setBabyMouseDown] = useState(false);
  const [_codaMouseDown, _setCodaMouseDown] = useState(false);
  const [_playheadMouseDown, _setPlayheadMouseDown] = useState(false);

  const playheadMouseDownRef = useRef(_playheadMouseDown);
  const babyMouseDownRef = useRef(_babyMouseDown);
  const startingPlayheadCursorPos = useRef(0);
  const cursorPos = useRef(0);
  const playheadNodeElementRef = useRef<HTMLDivElement>(null);

  const endOfMeasureToLoopAtBeat = useMemo(
    () => getEndOfMeasureToLoopAtBeat(
      _farthestRightNoteEnd, 
      _timeSignature,
      _userPlayheadBounds,
    ),
    [_farthestRightNoteEnd, _timeSignature, _userPlayheadBounds]
  );

  const setPlayheadMouseDown = useCallback((newPlayheadMouseDown: boolean) => {
    playheadMouseDownRef.current = newPlayheadMouseDown;
    _setPlayheadMouseDown(newPlayheadMouseDown);
  }, []);
  const setBabyMouseDown = useCallback((newBabyMouseDown: boolean) => {
    babyMouseDownRef.current = newBabyMouseDown;
    _setBabyMouseDown(newBabyMouseDown);
  }, []);

  const handleCodaLeftMouseDown = useCallback((e: React.MouseEvent) => {
    const start = beatFromEvent({ target: playheadNodeElementRef.current! as HTMLDivElement, clientX: e.clientX - 30 }, beatWidthRef.current);
    setPlayheadMouseDown(true);
    _setCodaMouseDown(true);
    startingPlayheadCursorPos.current = (userPlayheadBoundsRef.current?.end ?? endOfMeasureToLoopAtBeat) - 1;
    cursorPos.current = start;
    e.stopPropagation();
    return false;
  }, [beatWidthRef, endOfMeasureToLoopAtBeat, setPlayheadMouseDown, userPlayheadBoundsRef]);

  const handleCodaRightMouseDown = useCallback((e: React.MouseEvent) => {
    const start = beatFromEvent({ target: playheadNodeElementRef.current! as HTMLDivElement, clientX: e.clientX - 30 }, beatWidthRef.current);
    setPlayheadMouseDown(true);
    _setCodaMouseDown(true);
    startingPlayheadCursorPos.current = userPlayheadBoundsRef.current?.start ?? 0;
    cursorPos.current = start;
    e.stopPropagation();
    return false;
  }, [beatWidthRef, setPlayheadMouseDown, userPlayheadBoundsRef]);

  const handleBabyMouseDown = useCallback((e: React.MouseEvent) => {
    const cursorBeat = playheadPosXRef.current / beatWidthRef.current;
    setBabyMouseDown(true);
    if (!isPlayingRef.current) {
      playCompositionNotesAtBeat({
        audioContext,
        composition: compositionRef.current,
        midiBeat: cursorBeat,
        tempo: tempoRef.current,
        userInstruments: userInstrumentsRef.current,
        incrementBabyDanceFrame,
      });
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, [audioContext, beatWidthRef, compositionRef, incrementBabyDanceFrame, isPlayingRef, playheadPosXRef, setBabyMouseDown, tempoRef, userInstrumentsRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const start = beatFromEvent({ target: e.target as HTMLDivElement, clientX: e.clientX - 30 }, beatWidthRef.current);
    setBabyMouseDown(true);
    startingPlayheadCursorPos.current = start;
    cursorPos.current = start;
    setPlayheadPosX((start + 1) * beatWidthRef.current);
    if (isPlayingRef.current) {
      handleQuickPlayResetAtCurrentBeat();
    } else {
      playCompositionNotesAtBeat({
        audioContext,
        composition: compositionRef.current,
        midiBeat: start + 1,
        tempo: tempoRef.current,
        userInstruments: userInstrumentsRef.current,
        incrementBabyDanceFrame,
      });
    }
  }, [audioContext, beatWidthRef, compositionRef, handleQuickPlayResetAtCurrentBeat, incrementBabyDanceFrame, isPlayingRef, setBabyMouseDown, setPlayheadPosX, tempoRef, userInstrumentsRef]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const cursorBeat = beatFromEvent({ target: playheadNodeElementRef.current!, clientX: e.clientX - 30 }, beatWidthRef.current);
    const startOfClickedMeasure = getStartOfMeasureFromBeat(cursorBeat, timeSignatureRef.current);
    const endOfClickedMeasure = getEndOfMeasureFromBeat(cursorBeat, timeSignatureRef.current);
    if (e.shiftKey && userPlayheadBoundsRef.current !== undefined) {
      setUserPlayheadBounds({
        start: Math.min(userPlayheadBoundsRef.current.start, startOfClickedMeasure),
        end: Math.max(userPlayheadBoundsRef.current.end ?? 0, endOfClickedMeasure),
      });
    } else {
      setUserPlayheadBounds({
        start: startOfClickedMeasure,
        end: endOfClickedMeasure,
      });
    }
  }, [beatWidthRef, setUserPlayheadBounds, timeSignatureRef, userPlayheadBoundsRef]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const cursorBeat = beatFromEvent({ target: playheadNodeElementRef.current!, clientX: e.clientX - 30 }, beatWidthRef.current);
    if (cursorBeat === cursorPos.current || (
      !babyMouseDownRef.current && !playheadMouseDownRef.current
    )) return;
    if (babyMouseDownRef.current) {
      setPlayheadPosX((cursorBeat + 1) * beatWidthRef.current);
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
          end: cursorBeat + 1,
        });
      } else {
        setUserPlayheadBounds({
          start: startingPlayheadCursorPos.current,
          end: cursorBeat + 1,
        });
      }
    }
    cursorPos.current = cursorBeat;
  }, [audioContext, beatWidthRef, compositionRef, incrementBabyDanceFrame, setPlayheadPosX, setUserPlayheadBounds, tempoRef, userInstrumentsRef]);

  const handleMouseUp = useCallback(() => {
    setPlayheadMouseDown(false);
    setBabyMouseDown(false);
    _setCodaMouseDown(false);
    startingPlayheadCursorPos.current = 0;
    cursorPos.current = 0
  }, [setBabyMouseDown, setPlayheadMouseDown]);
  
  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  const codaSpriteY = useMemo(() => _isLooping ? -189 : -210, [_isLooping]);

  return (
    <PlayheadContainer
      ref={playheadNodeElementRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      $isMouseDown={_babyMouseDown || _codaMouseDown}
      $beatHeight={_beatHeight}
    >
      <PlayheadStickyContainer $beatWidth={_beatWidth}>
        <PlayheadSubContainer>
          <BabyPlayheadImg
            onMouseDown={handleBabyMouseDown}
            src="trans.png"
            $frame={babyDanceFrame}
            $playheadPosX={_playheadPosX}
            $preventPointerEvents={_babyMouseDown || _playheadMouseDown || _codaMouseDown || _isPlaying}
            $beatWidth={_beatWidth}
          />
          <PixelCoda
            onMouseDown={handleCodaLeftMouseDown}
            $y={codaSpriteY}
            $left={_userPlayheadBounds?.start !== undefined ? _userPlayheadBounds.start * _beatWidth: 0}
            $inverted={false}
            $isHidden={_userPlayheadBounds === undefined || _userPlayheadBounds.start === 0}
            $preventPointerEvents={_babyMouseDown || _playheadMouseDown || _codaMouseDown}
            $opacity={1.0}
          />
          <PixelCoda
            onMouseDown={handleCodaRightMouseDown}
            $y={codaSpriteY}
            $left={_userPlayheadBounds?.end !== undefined ? (_userPlayheadBounds.end - 1) * _beatWidth : (endOfMeasureToLoopAtBeat - 1) * _beatWidth}
            $inverted={true}
            $isHidden={!_isLooping && _userPlayheadBounds?.end === undefined}
            $preventPointerEvents={_babyMouseDown || _playheadMouseDown || _codaMouseDown || _userPlayheadBounds?.end === undefined}
            $opacity={_userPlayheadBounds?.end === undefined ? 0.25 : 1.0}
          />
        </PlayheadSubContainer>
      </PlayheadStickyContainer>
    </PlayheadContainer>
  );
}