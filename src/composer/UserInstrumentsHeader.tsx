import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components'
import { useUploadSf2 } from './useUploadSf2';
import { Soundfont2Sampler } from '../smplr/soundfont2';
import { sf2DefaultColours, UserInstrument } from './consts';

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

export function UserInstrumentsHeader({
  context,
  userInstruments,
  setUserInstruments,
  userInstrumentIndex,
  setUserInstrumentIndex,
  babyDanceFrame,
  incrementBabyDanceFrame,
}: {
  context: AudioContext,
  userInstruments: UserInstrument[],
  setUserInstruments: (userInstruments: UserInstrument[]) => void,
  userInstrumentIndex: number,
  setUserInstrumentIndex: (userInstrumentIndex: number) => void,
  babyDanceFrame: number,
  incrementBabyDanceFrame: () => void
}) {
  const currUserInstrument = useMemo(() => userInstruments[userInstrumentIndex], [userInstruments, userInstrumentIndex]);
  const currUserInstrumentName = useMemo(() => currUserInstrument.name, [currUserInstrument.name]);
  const selectedSf2InstOption = useMemo(() => currUserInstrument.sf2InstrumentName, [currUserInstrument.sf2InstrumentName]);

  const onAddNewUserInstrument = useCallback(() => {
    setUserInstruments([...userInstruments, {
      name: `ins${userInstruments.length}`,
      color: sf2DefaultColours[userInstruments.length] ?? 'gray',
      sf2Sampler: undefined,
      sf2InstrumentName: undefined,
      volume: 100,
    }]);
    setUserInstrumentIndex(userInstruments.length);
  }, [userInstruments]);

  const onSf2UploadSuccess = useCallback((sampler: Soundfont2Sampler, sf2InstrumentName: string) => {
    userInstruments[userInstrumentIndex]!.sf2Sampler = sampler;
    userInstruments[userInstrumentIndex]!.sf2InstrumentName = sf2InstrumentName;
    setUserInstruments([...userInstruments]);
    const now = context.currentTime;
    ["C4", "G4"].forEach((note, i) => {
      sampler.start({
        note,
        time: now + i * 0.2,
        duration: 0.25,
        onStart: () => incrementBabyDanceFrame(),
      });
    });
  }, [userInstruments, userInstrumentIndex]);
  const onUploadSf2 = useUploadSf2({
    context,
    onLoadSuccess: onSf2UploadSuccess,
  });

  const onSf2InstrumentSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const instrumentName = e.target.value;
    const userInstrument = userInstruments[userInstrumentIndex];
    if (userInstrument.sf2Sampler) {
      if (context.state === "suspended") { context.resume(); }
      userInstrument.sf2Sampler.loadInstrument(instrumentName);
      userInstrument.sf2Sampler.start({ note: 'C4', duration: 0.25 });
    }
    userInstrument.sf2InstrumentName = instrumentName;
    userInstruments[userInstrumentIndex] = { ...userInstrument };
    setUserInstruments([...userInstruments]);
  }, [userInstruments, userInstrumentIndex, context]);

  const onUserInstrumentVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const userInstrument = userInstruments[userInstrumentIndex];
    const volume = parseInt(e.target.value);
    if (userInstrument.sf2Sampler) {
      userInstrument.sf2Sampler.player.output.setVolume(volume);
    }
    // TODO(jaketrower): need to do this on load too?? 
    userInstrument.volume = volume;
    userInstruments[userInstrumentIndex] = { ...userInstrument };
    setUserInstruments([...userInstruments]);
  }, [userInstruments, userInstrumentIndex]);

  const sf2InstOptions = useMemo(() => currUserInstrument.sf2Sampler?.instrumentNames.map(
    (name, index) => <option value={name} key={`${name}-${index}`}>{name}</option>), 
    [currUserInstrument.sf2Sampler]
  );

  const userInstrumentTabs = useMemo(() => userInstruments.map((userInstrument, index) => (
    <UserInstrumentTab
      key={`${userInstrument?.name}-${index}`}
      style={{
        backgroundColor: userInstrument.color ?? 'white',
        fontWeight: index === userInstrumentIndex ? 700 : 400
      }}
      onClick={() => setUserInstrumentIndex(index)}>{userInstrument.name ?? index}</UserInstrumentTab>
  )), [userInstruments, userInstrumentIndex]);
  
  return (
    <>
      <SoundfontHeader $color={currUserInstrument.color ?? 'white'}>
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
            {currUserInstrument.sf2Sampler && (<>
              {/* <label htmlFor="sf2-instrument-select">Select instrument: </label> */}
              <select id="sf2-instrument-select"
                value={selectedSf2InstOption}
                style={{ marginLeft: 8}}
                onChange={onSf2InstrumentSelect}>
                {sf2InstOptions}
              </select>
              <span> * Practice with: asdfjkl;wetyuop</span>
            </>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', }}>
            <FileInputLabel htmlFor="sf-uploader">Upload .sf2</FileInputLabel>
            <input id="sf-uploader" type="file" accept=".sf2" onChange={onUploadSf2} style={{ display: 'none' }} />
            &nbsp;&nbsp;
            <label htmlFor="user-instrument-volume">Volume:</label>
            <input type="range" min="0" max="127"
              style={{ width: 100 }}
              id="user-instrument-volume"
              value={currUserInstrument.volume}
              onChange={onUserInstrumentVolumeChange} />
          </div>
        </div>
      </SoundfontHeader>
      <UserInstrumentSelector>
        {userInstrumentTabs}
        <UserInstrumentTab onClick={onAddNewUserInstrument}>+</UserInstrumentTab>
      </UserInstrumentSelector>
    </>
  );
}