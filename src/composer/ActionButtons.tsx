import React, { useCallback, useContext } from 'react';
import styled from "styled-components";
import { CompositionActionsContext, CompositionContext } from './contexts/CompositionContextProvider';
import { SongSettingsContext } from './contexts/SongSettingsContextProvider';
import { InputMode, SubdivisionType } from './consts';
import { SubdivisionTypeContext } from './contexts/SubdivisionTypeContextProvider';

export const ActionButtonsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ActionButton = styled.div`
  font-size: 24px;
  cursor: pointer;
  image-rendering: pixelated;
  user-select: none;
`;

export function ActionButtons({
  _inputMode,
  setInputMode,
}: {
  _inputMode: InputMode,
  setInputMode: (inputMode: InputMode) => void
}) {
  const { tempo, setTempo } = useContext(SongSettingsContext)!;
  const {
    isPlaying,
    isLooping,
  } = useContext(CompositionContext)!;
  const {
    handleStopComposition,
    handlePlayComposition,
    handleStopLoop,
    handleStartLoop
  } = useContext(CompositionActionsContext)!;
  const { 
    _subdivisionType,
    subdivisionTypeRef,
    setSubdivisionType,
  } = useContext(SubdivisionTypeContext)!;
  const onToggleSubdivisionType = useCallback(() => {
    if (subdivisionTypeRef.current === SubdivisionType.q) {
      setSubdivisionType(SubdivisionType.t);
    } else if (subdivisionTypeRef.current === SubdivisionType.t) {
      setSubdivisionType(SubdivisionType.q);
    }
  }, [setSubdivisionType, subdivisionTypeRef]);
  const onTempoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTempo(parseInt(e.target.value));
  }, []);
  return (
    <ActionButtonsContainer style={{ marginTop: 8, justifyContent: 'center' }}>
      <ActionButton onClick={isPlaying ? handleStopComposition : () => handlePlayComposition({})}>
        {isPlaying ? '⏹️' : '▶️'}
      </ActionButton>
      {/* <ActionButton onClick={isLooping ? handleStopLoop : handleStartLoop}>
        {isLooping ? '📴' : '🔁'}
      </ActionButton> */}
      <label htmlFor="tempo">
        <b>Tempo:</b>
      </label>
      <input
        id="tempo"
        type="range"
        min="20"
        max="200"
        value={tempo}
        onChange={onTempoChange}
      />
      <ActionButton
        onClick={() => setInputMode(InputMode.DEFAULT)}
        style={{
          border: '1px solid black',
          paddingBottom: 4,
          paddingTop: 1,
          paddingRight: 1,
          ...(
            _inputMode === InputMode.DEFAULT ? {
              background: 'gray',
              cursor: 'unset',
            } : {}
          ),
        }}>
        <div style={{
          background: `url('./toolicons1x.png') repeat scroll ${
            _inputMode === InputMode.DEFAULT ? '-25px' : '0'
          } -147px transparent`,
          width: 25,
          height: 21,
        }} />
      </ActionButton>
      <ActionButton
        onClick={() => setInputMode(InputMode.SELECT)}
        style={{
          border: '1px solid black',
          paddingBottom: 3,
          paddingTop: 2,
          paddingRight: 1,
          marginLeft: -6,
          ...(
            _inputMode === InputMode.SELECT ? {
              background: 'gray',
              cursor: 'unset',
            } : {}
          ),
        }}>
        <div style={{
          background: `url('./toolicons1x.png') repeat scroll  ${
            _inputMode === InputMode.SELECT ? '-25px' : '0'
          }  -21px transparent`,
          width: 25,
          height: 21,
          imageRendering: 'pixelated',
        }} />
      </ActionButton>
      <ActionButton
        onClick={onToggleSubdivisionType}
        style={{
          border: '1px solid black',
          paddingBottom: 4,
          paddingTop: 1,
          paddingRight: 1,
        }}>
        <div style={{
          background: `url('./toolicons1x.png') repeat scroll ${
            _subdivisionType === SubdivisionType.t ? '-25px' : '0'
          } -63px transparent`,
          width: 25,
          height: 21,
        }} />
      </ActionButton>
    </ActionButtonsContainer>
  );
}