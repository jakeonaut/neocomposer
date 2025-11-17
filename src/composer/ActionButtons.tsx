import React, { useCallback, useContext } from 'react';
import styled from "styled-components";
import { CompositionContext } from './contexts/CompositionContextProvider';
import { SongSettingsContext } from './contexts/SongSettingsContextProvider';
import { InputMode } from './consts';

export const ActionButtonsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ActionButton = styled.div`
  font-size: 24px;
  cursor: pointer;
  image-rendering: pixelated;
`;

export function ActionButtons({
  inputMode,
  setInputMode,
}: {
  inputMode: InputMode,
  setInputMode: (inputMode: InputMode) => void
}) {
  const { tempo, setTempo } = useContext(SongSettingsContext)!;
  const {
    isPlaying,
    handleStopComposition,
    handlePlayComposition,
    isLooping,
    handleStopLoop,
    handleStartLoop
  } = useContext(CompositionContext)!;
  const onTempoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTempo(parseInt(e.target.value));
  }, []);
  return (
    <ActionButtonsContainer style={{ marginTop: 8, justifyContent: 'center' }}>
      <ActionButton onClick={isPlaying ? handleStopComposition : () => handlePlayComposition({})}>
        {isPlaying ? '⏹️' : '▶️'}
      </ActionButton>
      <ActionButton onClick={isLooping ? handleStopLoop : handleStartLoop}>
        {isLooping ? '📴' : '🔁'}
      </ActionButton>
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
            inputMode === InputMode.DEFAULT ? {
              background: 'gray',
              cursor: 'unset',
            } : {}
          ),
        }}>
        <div style={{
          background: `url('./toolicons1x.png') repeat scroll ${inputMode === InputMode.DEFAULT ? '-25px' : '0'} -147px transparent`,
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
            inputMode === InputMode.SELECT ? {
              background: 'gray',
              cursor: 'unset',
            } : {}
          ),
        }}>
        <div style={{
          background: `url('./toolicons1x.png') repeat scroll  ${inputMode === InputMode.SELECT ? '-25px' : '0'}  -21px transparent`,
          width: 25,
          height: 21,
          imageRendering: 'pixelated',
        }} />
      </ActionButton>
    </ActionButtonsContainer>
  );
}