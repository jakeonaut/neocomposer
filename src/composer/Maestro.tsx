import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Soundfont2Sampler } from '../smplr/soundfont2'
import styled from 'styled-components'
import { useComposition, UserInstrument } from './useComposition';
import { CompositionAndPlayhead } from './CompositionAndPlayhead';
import { useUploadSf2 } from './useUploadSf2';

const MaestroContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;
const SoundfontHeader = styled.div<{ $color: string }>`
  height: 48px;
  display: flex;
  gap: 4px;
  outline: 1px solid black;
  background-color: ${({ $color }) => $color};
  margin: 2px;
  align-items: center;
`;
const DancingBabyImg = styled.img<{ $frame: number }>`
  margin: 6px 16px 10px 10px;
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  transform: scale(2.0);
  background-image: url('baby_dance_sheet.png');
  background-position: ${({ $frame }) => `${$frame*-20}px 0px`};
  cursor: pointer;
`;
const FileInputLabel = styled.label`
  background: white;
  padding: 2px;
  border: 1px solid black;
  cursor: pointer;
`;
const UserInstrumentSelector = styled.div`
  display: flex;
  margin: 0px 0px 16px 28px;
`;
const UserInstrumentTab = styled.div`
  width: 32px;
  height: 28px;
  line-height: 28px;
  border: 1px solid black;
  user-select: none;
  margin-left: 2px;
  margin-top: 2px;
  cursor: pointer;
  &:hover {
    border: 1px inset #d7d5d5;
  }
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
  justify-content: center;
  gap: 8px;
`;

const ActionButton = styled.div`
  font-size: 24px;
  cursor: pointer;
`;

const sf2DefaultColours = [
  "#8cb4b0",
  "#f1ad85ff",
  "#85c9f1ff",
  "#eae4a1ff",
  "#cdb3d7ff",
]

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
  const [userInstruments, setUserInstruments] = useState<Array<UserInstrument | undefined>>([{
    name: 'ins0',
    color: sf2DefaultColours[0],
    sf2Sampler: undefined,
  }]);
  const [userInstrumentIndex, setUserInstrumentIndex] = useState(0);
  const [babyDanceFrame, setBabyDanceFrame] = useState(0);
  const incrementBabyDanceFrame = useCallback(() => setBabyDanceFrame((prev) => prev < 3 ? prev+1 : 0), []);
  const [babyPlayheadPosX, setBabyPlayheadPosX] = useState(1);
  const currUserInstrument = useMemo(() => userInstruments[userInstrumentIndex], [userInstruments, userInstrumentIndex]);
  const currUserInstrumentName = useMemo(() => currUserInstrument?.name ?? userInstrumentIndex, [currUserInstrument?.name]);
  const {
    composition,
    handleUpdateCompositionAtBeatAndNote,
    setComposition,
    handlePlayComposition,
    handleStopComposition,
    handleClearComposition,
    isPlaying,
  } = useComposition({
      userInstruments,
      userInstrumentIndex,
      context,
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
    if (!currUserInstrument?.sf2Sampler || !playedNote) { return; }
    currUserInstrument.sf2Sampler.start({ note: playedNote, time: context.currentTime, duration: 0.25 });
    incrementBabyDanceFrame();
  }, [currUserInstrument, isPlaying]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  const onAddNewUserInstrument = useCallback(() => {
    setUserInstruments([...userInstruments, {
      name: `ins${userInstruments.length}`,
      color: sf2DefaultColours[userInstruments.length] ?? 'gray',
      sf2Sampler: undefined,
    }]);
    setUserInstrumentIndex(userInstruments.length);
  }, [userInstruments]);

  const onSf2UploadSuccess = useCallback((sampler: Soundfont2Sampler) => {
    userInstruments[userInstrumentIndex]!.sf2Sampler = sampler;
    setUserInstruments([...userInstruments]);
    const now = context.currentTime;
    ["C4", "E4", "G4", "C5"].forEach((note, i) => {
      sampler.start({
        note,
        time: now + i * 0.25,
        duration: 0.25,
        onStart: () => {
          setBabyDanceFrame((prev) => prev < 3 ? prev+1 : 0);
        },
      });
    });
  }, [userInstruments, userInstrumentIndex]);
  const onUploadSf2 = useUploadSf2({
    context,
    onLoadSuccess: onSf2UploadSuccess,
  });
  const sf2InstOptions = useMemo(() => currUserInstrument?.sf2Sampler?.instrumentNames.map(
    (name, index) => <option value={name} key={`${name}-${index}`}>{name}</option>), 
    [currUserInstrument, currUserInstrument?.sf2Sampler]
  );
  const userInstrumentTabs = useMemo(() => userInstruments.map((userInstrument, index) => (
    <UserInstrumentTab
      key={`${userInstrument?.name}-${index}`}
      style={{
        backgroundColor: userInstrument?.color ?? 'white',
        fontWeight: index === userInstrumentIndex ? 700 : 400
      }}
      onClick={() => setUserInstrumentIndex(index)}>{userInstrument?.name ?? index}</UserInstrumentTab>
  )), [userInstruments, userInstrumentIndex]);

  return (
    <MaestroContainer>
      <SoundfontHeader $color={currUserInstrument?.color ?? 'white'}>
        <div><DancingBabyImg src="trans.png" $frame={babyDanceFrame} onClick={() => {
          incrementBabyDanceFrame();
        }}/></div>
        <div style={{ display: 'flex', flexDirection: 'column', }}>
          <div style={{ textAlign: 'left', }}>
            <b>Name:</b>
            <input type="text" value={currUserInstrumentName} onChange={(e) => {
              if (currUserInstrument) {
                currUserInstrument.name = e.target.value;
              }
            }} />
            {currUserInstrument?.sf2Sampler && (<>
              {/* <label htmlFor="sf2-instrument-select">Select instrument: </label> */}
              <select id="sf2-instrument-select"
                style={{ marginLeft: 8}}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => currUserInstrument?.sf2Sampler?.loadInstrument(e.target.value)}>
                {sf2InstOptions}
              </select>
              <span> * Practice with: asdfjkl;wetyuop</span>
            </>)}
          </div>
          <div style={{ display: 'flex' }}>
            <FileInputLabel htmlFor="sf-uploader">Upload .sf2</FileInputLabel>
            <input id="sf-uploader" type="file" accept=".sf2" onChange={onUploadSf2} style={{ display: 'none' }} />
          </div>
        </div>
      </SoundfontHeader>
      <UserInstrumentSelector>
        {userInstrumentTabs}
        <UserInstrumentTab onClick={onAddNewUserInstrument}>+</UserInstrumentTab>
      </UserInstrumentSelector>
      <CompositionAndPlayhead
        composition={composition}
        userInstruments={userInstruments}
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
      </ActionButtonsContainer>
      <br/>
      <div style={{ textAlign: "left", }}>
      <h3>&nbsp;&nbsp;&nbsp;TODO:</h3>
      <ul>
        <li>[ ] Update the sf2-instrument selection on user-instrument change</li>
        <li>[ ] C1 - C7 (?) Piano range</li>
        <li>[ ] Longer tracks</li>
        <li>[ ] Tempo change,</li>
        <li>[ ] per instrument volume change</li>
        <li>[ ] note length divisions??? (quarter note, eighth note, sixteenth note, triplet? (8th note / quarter note triplet), 32nd note?)
          <ul>
          <li>[ ] Investigate how midi instructions do this today, maybe they just have a time (can round to nearest 2-3 decimal points???)</li>
          <li>[ ] if it's just time based, how do we represent this graphically and user input wise</li>
          <li>[ ] is there a way to change tempo dynamically in midi?</li>
          </ul>
        </li>
      </ul>
      </div>
    </MaestroContainer>
  );
}