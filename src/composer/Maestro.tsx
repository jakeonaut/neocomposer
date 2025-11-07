import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useComposition } from './useComposition';
import { CompositionAndPlayhead } from './CompositionAndPlayhead';
import { TodoList } from '../TodoList';
import { UserInstrumentsHeader } from './UserInstrumentsHeader';
import { sf2DefaultColours, UserInstrument } from './consts';

const MaestroContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const BabyPlayheadImg = styled.img<{ $frame: number }>`
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  background-image: url('baby_dance_sheet.png');
  position: relative;
  left: -10px;
  top: -6px;
  background-position: ${({ $frame }) => `${$frame*-20}px 0px`};
`;

const ActionButtonsContainer = styled.div`
  display: flex; 
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
`;

const ActionButton = styled.div`
  font-size: 24px;
  cursor: pointer;
`;

const keyboardPianoKeys = new Map(Object.entries({
  'a': 'C4',
  'w': 'Db4',
  's': 'D4',
  'e': 'Eb4',
  'd': 'E4',
  'f': 'F4',
  't': 'Gb4',
  'g': 'G4',
  'y': 'Ab4',
  'h': 'A4',
  'u': 'Bb4',
  'j': 'B4',
  'k': 'C5',
  'o': 'Db5',
  'l': 'D5',
  'p': 'Eb5',
  ';': 'E5',
  "'": 'F5',
}));

export function Maestro() {
  const [context] = useState(new AudioContext());
  const [userInstruments, setUserInstruments] = useState<Array<UserInstrument>>([{
    name: 'ins0',
    color: sf2DefaultColours[0],
    sf2Sampler: undefined,
    sf2InstrumentName: undefined,
    volume: 100,
  }]);
  const [userInstrumentIndex, setUserInstrumentIndex] = useState(0);
  const [masterVolume, setMasterVolume] = useState(100);
  const [tempo, setTempo] = useState(68);
  const [babyDanceFrame, setBabyDanceFrame] = useState(0);
  const incrementBabyDanceFrame = useCallback(() => setBabyDanceFrame((prev) => prev < 3 ? prev+1 : 0), []);   
  const [babyPlayheadPosX, setBabyPlayheadPosX] = useState(1);
  const {
    composition,
    handleUpdateCompositionAtBeatAndNote,
    setComposition,
    handlePlayComposition,
    handleStopComposition,
    handleClearComposition,
    isPlaying,
  } = useComposition({
    context,
    tempo,
    userInstruments,
    userInstrumentIndex,
    setPlayheadPosX: (posX: number) => {
      setBabyPlayheadPosX(posX);
      incrementBabyDanceFrame();
    },
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) { return; }
    if (e.code === 'Space') {
      isPlaying ? handleStopComposition() : handlePlayComposition();
      return;
    }
    const playedNote = keyboardPianoKeys.has(e.key) ? keyboardPianoKeys.get(e.key) : undefined;
    const currUserInstrument = userInstruments[userInstrumentIndex];
    if (!currUserInstrument.sf2Sampler || !playedNote) { return; }
    currUserInstrument.sf2Sampler.start({ note: playedNote, time: context.currentTime, duration: 0.25 });
    incrementBabyDanceFrame();
  }, [userInstruments, userInstrumentIndex, isPlaying]);

  const onMasterVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMasterVolume(parseInt(e.target.value));
  }, []);

  const onTempoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTempo(parseInt(e.target.value));
  }, []); 

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  return (
    <MaestroContainer>
      <UserInstrumentsHeader
        context={context}
        userInstruments={userInstruments}
        setUserInstruments={setUserInstruments}
        userInstrumentIndex={userInstrumentIndex}
        setUserInstrumentIndex={setUserInstrumentIndex}
        babyDanceFrame={babyDanceFrame}   
        incrementBabyDanceFrame={incrementBabyDanceFrame}
      />
      <CompositionAndPlayhead
        composition={composition}
        userInstruments={userInstruments}
        userInstrumentIndex={userInstrumentIndex}
        handleUpdateCompositionAtBeatAndNote={handleUpdateCompositionAtBeatAndNote}
        playheadNode={<BabyPlayheadImg src="trans.png" $frame={babyDanceFrame} />}
        playheadPosX={babyPlayheadPosX}
      />
      <ActionButtonsContainer>
        {isPlaying
          ? <ActionButton onClick={handleStopComposition}>⏹️</ActionButton>
          : <ActionButton onClick={handlePlayComposition}>▶️</ActionButton>
        }
        <ActionButton onClick={handleClearComposition}>💣</ActionButton>
        <label htmlFor="master-instrument-volume"><b>Master Volume:</b></label>
        <input style={{ width: 100 }} type="range" min="0" max="127"
          id="master-instrument-volume"
          value={masterVolume}
          onChange={onMasterVolumeChange}
        />
        <label htmlFor="tempo"><b>Tempo:</b></label>
        <input id="tempo" type="number" min="20" max="200" value={tempo} onChange={onTempoChange} />
      </ActionButtonsContainer>
      <br/>
      <TodoList />
    </MaestroContainer>
  );
}