import React, { useCallback, useContext, useMemo, useRef } from 'react';
import styled from 'styled-components'
import { useUploadSf2 } from './hooks/useUploadSf2';
import { Soundfont2Sampler } from '../smplr/soundfont2';
import { AudioContextContext, getARandomNote } from './consts';
import { UserInstrumentContext } from './contexts/UserInstrumentContextProvider';
import { SongSettingsContext } from './contexts/SongSettingsContextProvider';
import { CompositionContext } from './contexts/CompositionContextProvider';
import { useDebouncedCallback, useThrottledCallback } from "use-debounce";

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
  const { removeInstrumentFromComposition } = useContext(CompositionContext)!;
  const {
    _userInstruments,
    userInstrumentsRef,
    setUserInstruments,
    _userInstrumentIndex,
    userInstrumentIndexRef,
    howManyInstrumentsIEverMade,
    setHowManyInstrumentsIEverMade,
    setUserInstrumentIndex,
    getNewUserInstrument,
    userInstrumentColorInputRef,
    userInstrumentNameInputRef,
    userInstrumentVolumeInputRef,
  } = useContext(UserInstrumentContext)!;
  const _currUserInstrument = useMemo(() => _userInstruments[_userInstrumentIndex], [_userInstruments, _userInstrumentIndex]);
  const _selectedSf2InstOption = useMemo(() => _currUserInstrument.sf2InstrumentName, [_currUserInstrument]);

  const onAddNewUserInstrument = useCallback(() => {
    const newInstrument = getNewUserInstrument(audioContext, howManyInstrumentsIEverMade);
    setHowManyInstrumentsIEverMade(howManyInstrumentsIEverMade + 1);
    setUserInstruments([...userInstrumentsRef.current, newInstrument]);
    setUserInstrumentIndex(userInstrumentsRef.current.length - 1);
    newInstrument.sf2Sampler?.start({ note: getARandomNote(), duration: 0.25 });
  }, [getNewUserInstrument, audioContext, howManyInstrumentsIEverMade, setHowManyInstrumentsIEverMade, setUserInstruments, userInstrumentsRef, setUserInstrumentIndex]);

  const onSf2UploadSuccess = useCallback((sampler: Soundfont2Sampler, sf2InstrumentName: string) => {
    const newUserInstruments = [ ...userInstrumentsRef.current ];
    newUserInstruments[userInstrumentIndexRef.current]!.sf2Sampler = sampler;
    newUserInstruments[userInstrumentIndexRef.current]!.sf2InstrumentName = sf2InstrumentName;
    setUserInstruments(newUserInstruments);
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
    (document.getElementById(`sf-uploader-${userInstrumentIndexRef.current}`) as HTMLInputElement)!.value = null as unknown as string;
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments, audioContext.currentTime, incrementBabyDanceFrame]);
  const onUploadSf2 = useUploadSf2({
    audioContext,
    onLoadSuccess: onSf2UploadSuccess,
  });

  const onSf2InstrumentSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const instrumentName = e.target.value;
    const userInstrument = userInstrumentsRef.current[userInstrumentIndexRef.current];
    if (userInstrument.sf2Sampler) {
      if (audioContext.state === "suspended") { audioContext.resume(); }
      userInstrument.sf2Sampler.loadInstrument(instrumentName);
      userInstrument.sf2Sampler.start({ note: getARandomNote(), duration: 0.25 });
    }
    userInstrument.sf2InstrumentName = instrumentName;
    const newUserInstruments = [ ...userInstrumentsRef.current];
    newUserInstruments[userInstrumentIndexRef.current] = { ...userInstrument };
    setUserInstruments(newUserInstruments);
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments, audioContext]);

  const _onUserInstrumentVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const userInstrument = userInstrumentsRef.current[userInstrumentIndexRef.current];
    const volume = parseInt(e.target.value);
    if (userInstrument.sf2Sampler) {
      userInstrument.sf2Sampler.player.output.setVolume(volume);
    }
    // TODO(jaketrower): need to do this on load too?? 
    userInstrument.volume = volume;
    const newUserInstruments = [...userInstrumentsRef.current];
    newUserInstruments[userInstrumentIndexRef.current] = { ...userInstrument };
    setUserInstruments(newUserInstruments);
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments]);
  const onUserInstrumentVolumeChange = useThrottledCallback(_onUserInstrumentVolumeChange, 100);

  const _onColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const userInstrument = userInstrumentsRef.current[userInstrumentIndexRef.current];
    userInstrument.color = e.target.value;
    const newUserInstruments = [...userInstrumentsRef.current];
    newUserInstruments[userInstrumentIndexRef.current] = { ...userInstrument };
    setUserInstruments(newUserInstruments);
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments]);
  const onColorChange = useThrottledCallback(_onColorChange, 100);

  const _onNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUserInstruments = [...userInstrumentsRef.current];
    newUserInstruments[userInstrumentIndexRef.current].name = e.target.value;
    setUserInstruments(newUserInstruments);
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments]);
  const onNameChange = useThrottledCallback(_onNameChange, 100);

  const onTryDeleteInstrument = useCallback(() => {
    if (userInstrumentsRef.current.length <= 1) return;
    const confirmed = window.confirm('Really delete ❌ the instrument? 🎷 All corresponding notes 🎶 will be deleted 🚯 too!!! 😱');
    if (!confirmed) return;
    const newUserInstruments = [...userInstrumentsRef.current];
    newUserInstruments.splice(userInstrumentIndexRef.current, 1);
    if (userInstrumentIndexRef.current >= newUserInstruments.length) {
      setUserInstrumentIndex(userInstrumentIndexRef.current - 1);
    }
    setUserInstruments(newUserInstruments);
    removeInstrumentFromComposition(userInstrumentIndexRef.current);
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments, removeInstrumentFromComposition, setUserInstrumentIndex]);

  const sf2InstOptions = useMemo(() => _currUserInstrument.sf2Sampler?.instrumentNames.map(
    (name, index) => <option value={name} key={`${name}-${index}`}>{name}</option>), 
    [_currUserInstrument]
  );

  const userInstrumentTabs = useMemo(() => _userInstruments.map((userInstrument, index) => (
    <UserInstrumentTab
      key={`${userInstrument?.name}-${index}`}
      style={{
        backgroundColor: userInstrument.color ?? 'white',
        fontWeight: index === _userInstrumentIndex ? 700 : 400
      }}
      onClick={() => {
        setUserInstrumentIndex(index);
        _userInstruments[index].sf2Sampler?.start({ note: getARandomNote(), duration: 0.25 });
      }}>
        {userInstrument.name ?? index}
      </UserInstrumentTab>
  )), [_userInstruments, _userInstrumentIndex, setUserInstrumentIndex]);
  
  const currColor = _currUserInstrument.color ?? 'white';
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
              ref={userInstrumentColorInputRef}
              type="color"
              style={{ opacity: 0, width: 20, height: 20, cursor: 'pointer', }}
              id="instrument-color"
              name="instrument-color"
              defaultValue={currColor}
              onChange={onColorChange}
            />
          </ColorPicker>
          <div style={{ textAlign: 'left', }}>
            <b>Name:</b>
            <input
              ref={userInstrumentNameInputRef}
              type="text"
              defaultValue={_currUserInstrument.name}
              onChange={onNameChange} />
            {_currUserInstrument.sf2Sampler && (<>
              {/* <label htmlFor="sf2-instrument-select">Select instrument: </label> */}
              <select id="sf2-instrument-select"
                value={_selectedSf2InstOption}
                style={{ marginLeft: 8}}
                onChange={onSf2InstrumentSelect}>
                {sf2InstOptions}
              </select>
            </>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, }}>
            <FileInputLabel htmlFor={`sf-uploader-${_userInstrumentIndex}`}>Upload .sf2</FileInputLabel>
            <input id={`sf-uploader-${_userInstrumentIndex}`} type="file" accept=".sf2" onChange={onUploadSf2} style={{ display: 'none' }} />
            &nbsp;&nbsp;
            <label htmlFor="user-instrument-volume">volume:</label>
            <input type="range" min="0" max="127"
              ref={userInstrumentVolumeInputRef}
              style={{ width: 100 }}
              id="user-instrument-volume"
              defaultValue={_currUserInstrument.volume}
              onChange={onUserInstrumentVolumeChange} />
          </div>
          <div onClick={onTryDeleteInstrument}
            style={{
              border: '1px solid black',
              cursor: _userInstruments.length > 1 ? 'pointer' : 'unset',
              position: 'relative',
              width: 20,
              height: 20,
              content: '',
              marginRight: 4,
            }}>
            <div style={{
              background: `url('./toolicons1x.png') repeat scroll  ${_userInstruments.length > 1 ? '0' : '-25px'}  0 transparent`,
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