import React, { useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components'
import { useUploadSf2 } from './hooks/useUploadSf2';
import { Soundfont2Sampler } from '../smplr/soundfont2';
import { AudioContextContext, getARandomNote } from './consts';
import { UserInstrumentContext } from './contexts/UserInstrumentContextProvider';
import { SongSettingsContext } from './contexts/SongSettingsContextProvider';

const SoundfontHeader = styled.div<{ $color: string }>`
  height: 28px;
  display: flex;
  gap: 4px;
  outline: 1px solid black;
  background-color: ${({ $color }) => $color};
  margin: 2px;
  align-items: center;
`;
const ColorPicker = styled.div`
  border: 1px solid black;
  width: 18px; 
  height: 18px;
  margin-left: 4px;
  cursor: pointer;
  position: relative;
`;
const FileInputLabel = styled.label`
  background: white;
  padding: 2px;
  border: 1px solid black;
  cursor: pointer;
`;
const UserInstrumentSelector = styled.div`
  display: flex;
  margin: 0px 0px 12px 28px;
`;
const UserInstrumentTab = styled.div`
  display: flex;
  justify-content: center;
  min-width: 18px;
  padding: 0 6px;
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

export function UserInstrumentsHeader({}: {}) {
  const audioContext = useContext(AudioContextContext)!;
  const { incrementBabyDanceFrame } = useContext(SongSettingsContext)!;
  const {
    userInstruments,
    setUserInstruments,
    userInstrumentIndex,
    howManyInstrumentsIEverMade,
    setHowManyInstrumentsIEverMade,
    setUserInstrumentIndex,
    getNewUserInstrument,
  } = useContext(UserInstrumentContext)!;
  const currUserInstrument = useMemo(() => userInstruments[userInstrumentIndex], [userInstruments, userInstrumentIndex]);
  const selectedSf2InstOption = useMemo(() => currUserInstrument.sf2InstrumentName, [currUserInstrument]);

  const onAddNewUserInstrument = useCallback(() => {
    const newInstrument = getNewUserInstrument(audioContext, howManyInstrumentsIEverMade);
    setHowManyInstrumentsIEverMade(howManyInstrumentsIEverMade + 1);
    setUserInstruments([...userInstruments, newInstrument]);
    setUserInstrumentIndex(userInstruments.length);
    newInstrument.sf2Sampler?.start({ note: getARandomNote(), duration: 0.25 });
  }, [getNewUserInstrument, audioContext, howManyInstrumentsIEverMade, setHowManyInstrumentsIEverMade, setUserInstruments, userInstruments, setUserInstrumentIndex]);

  const onSf2UploadSuccess = useCallback((sampler: Soundfont2Sampler, sf2InstrumentName: string) => {
    userInstruments[userInstrumentIndex]!.sf2Sampler = sampler;
    userInstruments[userInstrumentIndex]!.sf2InstrumentName = sf2InstrumentName;
    setUserInstruments([...userInstruments]);
    const now = audioContext.currentTime;
    ["C4", "G4"].forEach((note, i) => {
      sampler.start({
        note,
        time: now + i * 0.2,
        duration: 0.25,
        onStart: () => incrementBabyDanceFrame(),
      });
    });
    // weird. https://stackoverflow.com/questions/12030686/html-input-file-selection-event-not-firing-upon-selecting-the-same-file
    (document.getElementById(`sf-uploader-${userInstrumentIndex}`) as HTMLInputElement)!.value = null as unknown as string;
  }, [userInstruments, userInstrumentIndex, setUserInstruments, audioContext.currentTime, incrementBabyDanceFrame]);
  const onUploadSf2 = useUploadSf2({
    audioContext,
    onLoadSuccess: onSf2UploadSuccess,
  });

  const onSf2InstrumentSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const instrumentName = e.target.value;
    const userInstrument = userInstruments[userInstrumentIndex];
    if (userInstrument.sf2Sampler) {
      if (audioContext.state === "suspended") { audioContext.resume(); }
      userInstrument.sf2Sampler.loadInstrument(instrumentName);
      userInstrument.sf2Sampler.start({ note: getARandomNote(), duration: 0.25 });
    }
    userInstrument.sf2InstrumentName = instrumentName;
    userInstruments[userInstrumentIndex] = { ...userInstrument };
    setUserInstruments([...userInstruments]);
  }, [userInstruments, userInstrumentIndex, setUserInstruments, audioContext]);

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
  }, [userInstruments, userInstrumentIndex, setUserInstruments]);

  const onColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const userInstrument = userInstruments[userInstrumentIndex];
    userInstrument.color = e.target.value;
    userInstruments[userInstrumentIndex] = { ...userInstrument };
    setUserInstruments([...userInstruments]);
  }, [userInstruments, userInstrumentIndex, setUserInstruments]);

  const onTryDeleteInstrument = useCallback(() => {
    if (userInstruments.length <= 1) return;
    const confirmed = window.confirm('Really delete the instrument?');
    if (!confirmed) return;
    const newInstruments = [...userInstruments];
    newInstruments.splice(userInstrumentIndex, 1);
    if (userInstrumentIndex >= newInstruments.length) {
      setUserInstrumentIndex(userInstrumentIndex-1);
    }
    setUserInstruments(newInstruments);
  }, [userInstruments, userInstrumentIndex, setUserInstruments, setUserInstrumentIndex]);

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
      onClick={() => {
        setUserInstrumentIndex(index);
        userInstruments[index].sf2Sampler?.start({ note: getARandomNote(), duration: 0.25 });
      }}>
        {userInstrument.name ?? index}
      </UserInstrumentTab>
  )), [userInstruments, userInstrumentIndex, setUserInstrumentIndex]);
  
  const currColor = currUserInstrument.color ?? 'white';
  return (
    <>
      <SoundfontHeader $color={currColor}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', }}>
          <ColorPicker>
            <label htmlFor="instrument-color" style={{
              background: `url('./toolicons1x.png') repeat scroll  0  -126px transparent`,
              width: 25,
              height: 21,
              imageRendering: 'pixelated',
              position: 'absolute',
              left: -4,
              top: -2,
              userSelect: 'none',
              cursor: 'pointer',
            }}>&nbsp;</label>
            <input
              type="color"
              style={{ opacity: 0, width: 20, height: 20, cursor: 'pointer', }}
              id="instrument-color"
              name="instrument-color"
              value={currColor}
              onChange={onColorChange}
            />
          </ColorPicker>
          <div style={{ textAlign: 'left', }}>
            <b>Name:</b>
            <input type="text" value={currUserInstrument.name} onChange={(e) => {
              if (currUserInstrument) {
                userInstruments[userInstrumentIndex].name = e.target.value;
                setUserInstruments([...userInstruments]);
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
            </>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, }}>
            <FileInputLabel htmlFor={`sf-uploader-${userInstrumentIndex}`}>Upload .sf2</FileInputLabel>
            <input id={`sf-uploader-${userInstrumentIndex}`} type="file" accept=".sf2" onChange={onUploadSf2} style={{ display: 'none' }} />
            &nbsp;&nbsp;
            <label htmlFor="user-instrument-volume">volume:</label>
            <input type="range" min="0" max="127"
              style={{ width: 100 }}
              id="user-instrument-volume"
              value={currUserInstrument.volume}
              onChange={onUserInstrumentVolumeChange} />
          </div>
          <div onClick={onTryDeleteInstrument}
            style={{
              border: '1px solid black',
              cursor: userInstruments.length > 1 ? 'pointer' : 'unset',
              position: 'relative',
              width: 20,
              height: 20,
              content: '',
              marginRight: 4,
            }}>
            <div style={{
              background: `url('./toolicons1x.png') repeat scroll  ${userInstruments.length > 1 ? '0' : '-25px'}  0 transparent`,
              width: 25,
              height: 21,
              imageRendering: 'pixelated',
              userSelect: 'none',
              position: 'absolute',
              top: -2,
              left: -3,
            }}>&nbsp;</div>
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