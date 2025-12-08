import React, { useCallback, useContext } from 'react';
import styled from "styled-components";
import { CompositionActionsContext, CompositionContext } from './contexts/CompositionContextProvider';
import { SongSettingsContext } from './contexts/SongSettingsContextProvider';
import { InputMode, SubdivisionType, TimeSignature } from './consts';
import { SubdivisionTypeContext } from './contexts/SubdivisionTypeContextProvider';
import { ClipboardContext } from './contexts/ClipboardContextProvider';
import { TimeSignatureContext } from './contexts/TimeSignatureContextProvider';
import { PlayheadContext } from './contexts/PlayheadContextProvider';

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

const PixelActionButton = styled(ActionButton)`
  border: 1px solid black;
  padding-right: 1px;
`;

const PixelButton = styled.div<{ $y: number, $inverted: boolean }>`
  background: ${({ $y, $inverted }) => `url('./toolicons1x.png') repeat scroll ${
    $inverted ? '-25px' : '0'
  } ${$y}px transparent`};
  width: 25px;
  height: 21px;
  image-rendering: pixelated;
`;

function PlayStopButton() {
  const {
    _isPlaying,
    _isLooping,
  } = useContext(PlayheadContext)!;
  const {
    handleStopComposition,
    handlePlayComposition,
    handleStopLoop,
    handleStartLoop
  } = useContext(CompositionActionsContext)!;

  return (
    <>
      <ActionButton onClick={_isPlaying ? handleStopComposition : () => handlePlayComposition({
        shouldLoop: _isLooping,
      })} title="Play/Stop: Space (Shift+Space to toggle Loop)">
        {_isPlaying ? '⏹️' : '▶️'}
      </ActionButton>
      <ActionButton onClick={_isLooping ? handleStopLoop : handleStartLoop}>
        {!_isLooping ? '📴' : '🔁'}
      </ActionButton>
    </>
  );
}

function CutButton({ onClick } : { onClick: () => void }) {
  const { _selectedNotes, _clickedNote } = useContext(CompositionContext)!;
  return (
    <ActionButton
      title="Cut: ctrl+x"
      onClick={onClick}
      style={Object.values(_selectedNotes).length > 0 || _clickedNote !== undefined ? {} : { filter: 'opacity(0.5)' }}
    >
      ✂️
    </ActionButton>
  );
}

function CopyButton({ onClick } : { onClick: () => void }) {
  const { _selectedNotes, _clickedNote } = useContext(CompositionContext)!;
  return (
    <ActionButton
      title="Copy: ctrl+c"
      onClick={onClick}
      style={Object.values(_selectedNotes).length > 0 || _clickedNote !== undefined ? {} : { filter: 'opacity(0.5)' }}
    >
      📑
    </ActionButton>
  );
}

function PasteButton({ onClick } : { onClick: () => void }) {
  const { _copiedNotes } = useContext(ClipboardContext)!;
  return (
    <ActionButton
      title="Paste: ctrl+v"
      onClick={onClick}
      style={_copiedNotes.length > 0 ? {} : { filter: 'opacity(0.5)' }}
    >
      📋
    </ActionButton>
  );
}


function InputDefaultButton({
  _inputMode,
  setInputMode,
}: {
  _inputMode: InputMode,
  setInputMode: (inputMode: InputMode) => void
}) {
  return (
    <PixelActionButton
      onClick={() => setInputMode(InputMode.DEFAULT)}
      style={{
        paddingBottom: 4,
        paddingTop: 1,
        ...(_inputMode === InputMode.DEFAULT ? { background: 'gray', cursor: 'unset', } : {}),
      }}>
        <PixelButton $y={-147} $inverted={_inputMode === InputMode.DEFAULT} title="Place Notes: Shift" />
    </PixelActionButton>
  );
}

function InputSelectionButton({
  _inputMode,
  setInputMode,
}: {
  _inputMode: InputMode,
  setInputMode: (inputMode: InputMode) => void
}) {
  return (
    <PixelActionButton
      onClick={() => setInputMode(InputMode.SELECT)}
      style={{
        paddingBottom: 3,
        paddingTop: 2,
        marginLeft: -6,
        ...(_inputMode === InputMode.SELECT ? { background: 'gray', cursor: 'unset' } : {}),
      }}>
      <PixelButton $y={-21} $inverted={_inputMode === InputMode.SELECT} title="Select Notes: Shift" />
    </PixelActionButton>
  );
}

function InputSubdivisionTypeButton() {
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

  return (
    <PixelActionButton
      onClick={onToggleSubdivisionType}
      style={{ paddingBottom: 4, paddingTop: 1, position: 'absolute', left: 32, paddingRight: 0 }}>
      <PixelButton $y={-63} $inverted={_subdivisionType === SubdivisionType.t} 
      title="Sixteenth or Triplet Mode: Q" />
    </PixelActionButton>
  );
}

function InputTimeSignatureButton() {
  const { 
    _timeSignature,
    timeSignatureRef,
    setTimeSignature,
  } = useContext(TimeSignatureContext)!;
  const onToggleTimeSignature = useCallback(() => {
    if (timeSignatureRef.current === TimeSignature.ts4_4) {
      setTimeSignature(TimeSignature.ts3_4);
    } else if (timeSignatureRef.current === TimeSignature.ts3_4) {
      setTimeSignature(TimeSignature.ts4_4);
    }
  }, [setTimeSignature, timeSignatureRef]);

  return (
    <PixelActionButton
      onClick={onToggleTimeSignature}
      style={{ paddingBottom: 4, paddingTop: 1, position: 'absolute', left: 3, paddingRight: 0 }}>
      <PixelButton $y={-84} $inverted={_timeSignature === TimeSignature.ts3_4} 
        title="Time Signature: R" />
    </PixelActionButton>
  );
}

function TempoInput() {
  const { _tempo, setTempo } = useContext(SongSettingsContext)!;
  const onTempoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTempo(parseInt(e.target.value));
  }, [setTempo]);

  return (
    <>
      <label htmlFor="tempo">
        <b>Tempo:</b>
      </label>
      <input
        id="tempo"
        type="range"
        min="20"
        max="200"
        value={_tempo}
        onChange={onTempoChange}
      />
    </>
  );
}

export function ActionButtonFooter({
  _inputMode,
  setInputMode,
  tryCopySelectedNotes,
  tryCutSelectedNotes,
  tryPasteCopiedNotes,
}: {
  _inputMode: InputMode,
  setInputMode: (inputMode: InputMode) => void,
  tryCopySelectedNotes: () => void,
  tryCutSelectedNotes: () => void,
  tryPasteCopiedNotes: () => void
}) {
  return (
    <ActionButtonsContainer style={{ marginTop: 8, justifyContent: 'center' }}>
      <InputTimeSignatureButton />
      <InputSubdivisionTypeButton />
      <PlayStopButton />
      <TempoInput />
      <InputDefaultButton _inputMode={_inputMode} setInputMode={setInputMode} />
      <InputSelectionButton _inputMode={_inputMode} setInputMode={setInputMode} />
      &nbsp;
      <CutButton onClick={tryCutSelectedNotes} />
      <CopyButton onClick={tryCopySelectedNotes} />
      <PasteButton onClick={tryPasteCopiedNotes} />
    </ActionButtonsContainer>
  );
}