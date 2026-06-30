import React, { MouseEvent, useCallback, useContext, useEffect, useMemo } from 'react';
import styled from 'styled-components'
import { useUploadSf2 } from './hooks/useUploadSf2';
import { Soundfont2Sampler } from '../smplr/soundfont2';
import { AudioContextContext, getARandomNote, MAX_USER_INSTRUMENTS, sf2DefaultColours } from './consts';
import { UserInstrumentContext } from './contexts/UserInstrumentContextProvider';
import { useThrottledCallback } from "use-debounce";
import { ClipboardContext } from './contexts/ClipboardContextProvider';
import { PlayTheSongContext } from './contexts/PlayTheSongContextProvider';
import { CompositionActionsContext } from './contexts/CompositionActionsContextProvider';
import { ClickedSelectedNotesContext } from './contexts/ClickedSelectedNotesContextProvider';
import { UndoRedoContext } from './contexts/UndoRedoContextProvider';

const SoundfontHeader = styled.div<{ $color: string }>`
  height: 28px;
  display: flex;
  gap: 4px;
  outline: 1px solid black;
  background-color: ${({ $color }) => $color};
  margin: 2px;
  align-items: center;
  width: fit-content;
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
  margin: 0px 0px 4px 28px;
  position: relative;
`;
const UserInstrumentTab = styled.div<{ $disabled: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 18px;
  padding: 0 3px;
  height: 28px;
  line-height: 28px;
  border: 1px solid black;
  user-select: none;
  margin-left: 2px;
  margin-top: 1px;
  cursor: ${({ $disabled }) => $disabled ? "default" : "pointer"};
  &:hover {
    border: ${({ $disabled }) => $disabled ? "1px solid black" : "1px inset #d7d5d5"};
  }
`;

const ShuffleButton = styled.div`
  background: white;
  padding: 1px 2px;
  border: 1px solid black;
  cursor: pointer;
  margin-left: 2px;
  margin-right: 4px;
`;

function UserInstrumentMuteButton({
  isToggledOn,
  onUserInstrumentVisibilityToggle,
  useAltSprite = false,
}: {
  isToggledOn: boolean;
  onUserInstrumentVisibilityToggle: React.MouseEventHandler<HTMLDivElement>;
  useAltSprite?: boolean
}) {
  return (
    <div
      onClick={(e) => onUserInstrumentVisibilityToggle(e)}
      style={{
        border: '1px solid black',
        position: 'relative',
        width: 20,
        height: 20,
        content: '',
        cursor: 'pointer',
      }}>
      <div style={{
        background: `url('./toolicons1x.png') repeat scroll  ${isToggledOn ? '0' : '-25px'} ${useAltSprite ? '-231px' : '-168px'} transparent`,
        width: 25,
        height: 21,
        imageRendering: 'pixelated',
        userSelect: 'none',
        position: 'absolute',
        top: -2,
        left: -3,
      }}>&nbsp;</div>
    </div>
  );
}

export function UserInstrumentsHeader() {
  const audioContext = useContext(AudioContextContext)!;
  // TODO(jaketrower): https://blog.allaroundjavascript.com/prevent-unnecessary-re-renders-of-components-when-using-usecontext-with-react
  const { incrementBabyDanceFrame } = useContext(PlayTheSongContext)!;
  // TODO(jaketrower): https://blog.allaroundjavascript.com/prevent-unnecessary-re-renders-of-components-when-using-usecontext-with-react
  const { removeInstrumentFromComposition } = useContext(CompositionActionsContext)!;
  const { addToUndoStack } = useContext(UndoRedoContext)!;
  const { removeInstrumentFromCopiedNotes } = useContext(ClipboardContext)!;
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
    defaultSoundfontBuffer,
    setDefaultSoundfontBuffer,
    setDefaultSoundfontFileName,
  } = useContext(UserInstrumentContext)!;
  const { selectNotesByInstrument } = useContext(ClickedSelectedNotesContext)!;
  const { _compositionByInstructionIdRef } = useContext(CompositionActionsContext)!;
  const _selectedSf2InstOption = useMemo(() => {
    return _userInstruments.length >   0 ? _userInstruments[_userInstrumentIndex].sf2InstrumentName : undefined
  }, [_userInstruments, _userInstrumentIndex]);
  const canAddNewInstrument = useMemo(() => _userInstruments.length < MAX_USER_INSTRUMENTS, [_userInstruments.length]);

  const onAddNewUserInstrument = useCallback(async () => {
    if (!canAddNewInstrument) return;
    const newInstrument = await getNewUserInstrument(audioContext, howManyInstrumentsIEverMade);
    setHowManyInstrumentsIEverMade(howManyInstrumentsIEverMade + 1);
    const prevUserInstruments = [...userInstrumentsRef.current];
    setUserInstruments([...userInstrumentsRef.current, newInstrument]);
    newInstrument.sf2Sampler?.start({ note: getARandomNote(), duration: 0.25 });
    addToUndoStack({
      newState: { instruments: [...userInstrumentsRef.current] },
      oldState: { instruments: prevUserInstruments }
    });
  }, [canAddNewInstrument, getNewUserInstrument, audioContext, howManyInstrumentsIEverMade, setHowManyInstrumentsIEverMade, userInstrumentsRef, setUserInstruments, addToUndoStack]);

  const onSf2UploadSuccess = useCallback((sampler: Soundfont2Sampler, sf2InstrumentName: string, soundfontBuffer: Uint8Array, fileName: string) => {
    if (defaultSoundfontBuffer === undefined) {
      setDefaultSoundfontBuffer(soundfontBuffer);
      setDefaultSoundfontFileName(fileName);
    }
    const oldUserInstruments = [ ...userInstrumentsRef.current ];
    const newUserInstruments = [ ...userInstrumentsRef.current ];
    newUserInstruments[userInstrumentIndexRef.current]!.fileName = fileName;
    newUserInstruments[userInstrumentIndexRef.current]!.sf2Sampler = sampler;
    newUserInstruments[userInstrumentIndexRef.current]!.sf2InstrumentName = sf2InstrumentName;
    sampler.output.volume = newUserInstruments[userInstrumentIndexRef.current].volume;
    setUserInstruments([...newUserInstruments]);
    addToUndoStack({
      newState: { instruments: [...newUserInstruments] },
      oldState: { instruments: oldUserInstruments }
    });
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
  }, [defaultSoundfontBuffer, userInstrumentsRef, userInstrumentIndexRef, setUserInstruments, addToUndoStack, audioContext.currentTime, setDefaultSoundfontBuffer, setDefaultSoundfontFileName, incrementBabyDanceFrame]);
  const onUploadSf2 = useUploadSf2({
    audioContext,
    onLoadSuccess: onSf2UploadSuccess,
  });

  const onSf2InstrumentSelect = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prevUserInstruments = [...userInstrumentsRef.current];
    const instrumentName = e.target.value;
    const userInstrument = {...userInstrumentsRef.current[userInstrumentIndexRef.current]};
    if (userInstrument.sf2Sampler) {
      if (audioContext.state === "suspended") { audioContext.resume(); }
      await userInstrument.sf2Sampler.loadInstrument(instrumentName);
      userInstrument.sf2Sampler.start({ note: getARandomNote(), duration: 0.25 });
    }
    userInstrument.sf2InstrumentName = instrumentName;
    const newUserInstruments = [ ...userInstrumentsRef.current];
    newUserInstruments[userInstrumentIndexRef.current] = userInstrument;
    setUserInstruments(newUserInstruments);
    addToUndoStack({
      newState: { instruments: [...newUserInstruments] },
      oldState: { instruments: prevUserInstruments }
    });
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments, addToUndoStack, audioContext]);

  const randomizeSf2Instrument = useCallback(async () => {
    const prevUserInstruments = [...userInstrumentsRef.current];
    const userInstrument = {...userInstrumentsRef.current[userInstrumentIndexRef.current]};
    if (userInstrument.sf2Sampler) {
      if (audioContext.state === "suspended") { audioContext.resume(); }
      const randomInstrumentIdx = Math.floor(Math.random() * userInstrument.sf2Sampler.instrumentNames.length);
      const instrumentName = userInstrument.sf2Sampler.instrumentNames[randomInstrumentIdx];
      await userInstrument.sf2Sampler.loadInstrument(instrumentName);
      userInstrument.sf2Sampler.start({ note: getARandomNote(), duration: 0.25 });
      userInstrument.sf2InstrumentName = instrumentName;
      const newUserInstruments = [ ...userInstrumentsRef.current];
      newUserInstruments[userInstrumentIndexRef.current] = userInstrument;
      setUserInstruments(newUserInstruments);
      addToUndoStack({
        newState: { instruments: [...newUserInstruments] },
        oldState: { instruments: prevUserInstruments }
      });
    }
  }, [addToUndoStack, audioContext, setUserInstruments, userInstrumentIndexRef, userInstrumentsRef]);

  const _onUserInstrumentVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // const prevUserInstruments = [...userInstrumentsRef.current];
    const userInstrument = {...userInstrumentsRef.current[userInstrumentIndexRef.current]};
    const volume = parseInt(e.target.value);
    if (userInstrument.sf2Sampler) {
      userInstrument.sf2Sampler.output.volume = volume;
      // userInstrument.sf2Sampler.stop();
      // userInstrument.sf2Sampler.start({ note: 'C4', duration: 0.5 });
    }
    userInstrument.volume = volume;
    const newUserInstruments = [...userInstrumentsRef.current];
    newUserInstruments[userInstrumentIndexRef.current] = userInstrument;
    setUserInstruments(newUserInstruments);
    // addToUndoStack({
    //   newState: { instruments: [...newUserInstruments] },
    //   oldState: { instruments: prevUserInstruments }
    // });
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments]);
  const onUserInstrumentVolumeChange = useThrottledCallback(_onUserInstrumentVolumeChange, 100);
  const areAllInstrumentsVisible = useMemo(() => _userInstruments.every((inst) => inst.visible), [_userInstruments]);
  const isAnyInstrumentVisible = useMemo(() => _userInstruments.some((inst) => inst.visible), [_userInstruments]);
  const onUserInstrumentVisibilityToggleAll = useCallback(() => {
    let newUserInstruments = [...userInstrumentsRef.current];
    if (areAllInstrumentsVisible) {
      newUserInstruments.forEach((inst) => inst.visible = false);
    } else {
      newUserInstruments.forEach((inst) => inst.visible = true);
    }
    setUserInstruments(newUserInstruments);
  }, [userInstrumentsRef, areAllInstrumentsVisible, setUserInstruments]);
  const onUserInstrumentVisibilityToggle = useCallback((index?: number) => {
    const userInstrument = {...userInstrumentsRef.current[index ?? userInstrumentIndexRef.current]};
    const visible = userInstrument.visible;
    userInstrument.visible = !visible;
    const newUserInstruments = [...userInstrumentsRef.current];
    newUserInstruments[index ?? userInstrumentIndexRef.current] = userInstrument;
    setUserInstruments(newUserInstruments);
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments]);

  const _onColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // const prevUserInstruments = [...userInstrumentsRef.current];
    const userInstrument = {...userInstrumentsRef.current[userInstrumentIndexRef.current]};
    userInstrument.color = e.target.value;
    const newUserInstruments = [...userInstrumentsRef.current];
    newUserInstruments[userInstrumentIndexRef.current] = userInstrument;
    setUserInstruments(newUserInstruments);
    // addToUndoStack({
    //   newState: { instruments: [...newUserInstruments] },
    //   oldState: { instruments: prevUserInstruments }
    // });
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments]);
  const onColorChange = useThrottledCallback(_onColorChange, 100);

  const _onNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // const prevUserInstruments = [...userInstrumentsRef.current];
    const newUserInstruments = [...userInstrumentsRef.current];
    newUserInstruments[userInstrumentIndexRef.current].name = e.target.value;
    setUserInstruments(newUserInstruments);
    // addToUndoStack({
    //   newState: { instruments: [...newUserInstruments] },
    //   oldState: { instruments: prevUserInstruments }
    // });
  }, [userInstrumentsRef, userInstrumentIndexRef, setUserInstruments]);
  const onNameChange = useThrottledCallback(_onNameChange, 100);

  const onTryDeleteInstrument = useCallback(() => {
    if (userInstrumentsRef.current.length <= 1) return;
    const confirmed = window.confirm('Really delete ❌ the instrument? 🎷 All corresponding notes 🎶 will be deleted 🚯 too!!! 😱');
    if (!confirmed) return;
    const prevUserInstruments = [...userInstrumentsRef.current];
    const prevCompositionByInstructionId = {..._compositionByInstructionIdRef.current};
    removeInstrumentFromComposition(
      userInstrumentIndexRef.current,
      // We're about to do that at the end of this function, so don't do it here
      false, /* shouldAddToUndoStack */
    );
    removeInstrumentFromCopiedNotes(userInstrumentIndexRef.current);
    const newUserInstruments = [...userInstrumentsRef.current];
    newUserInstruments.splice(userInstrumentIndexRef.current, 1);
    setUserInstruments(newUserInstruments);
    addToUndoStack({
      newState: {
        composition: { ..._compositionByInstructionIdRef.current },
        instruments: [...newUserInstruments]
      },
      oldState: {
        composition: { ...prevCompositionByInstructionId },
        instruments: prevUserInstruments
      }
    });
  }, [userInstrumentsRef, _compositionByInstructionIdRef, removeInstrumentFromComposition, userInstrumentIndexRef, addToUndoStack, removeInstrumentFromCopiedNotes, setUserInstruments]);

  const sf2InstOptions = useMemo(() =>(_userInstruments.length > 0
      ? _userInstruments[_userInstrumentIndex].sf2Sampler?.instrumentNames.map(
        (name, index) => <option value={name} key={`${name}-${index}`}>{name}</option>)
      : []), 
    [_userInstrumentIndex, _userInstruments]
  );

  const userInstrumentTabs = useMemo(() => _userInstruments.map((userInstrument, index) => (
    <UserInstrumentTab
      key={`${userInstrument?.name}-${index}`}
      style={{
        backgroundColor: userInstrument?.color ?? sf2DefaultColours[(index % sf2DefaultColours.length)],
        fontWeight: index === _userInstrumentIndex ? 700 : 400
      }}
      onClick={(e: MouseEvent) => {
        setUserInstrumentIndex(index);
        _userInstruments[index].sf2Sampler?.start({ note: getARandomNote(), duration: 0.25 });
        if (e.shiftKey) {
          selectNotesByInstrument(index, _compositionByInstructionIdRef.current);
        }
      }}
      $disabled={false}
    >
      <UserInstrumentMuteButton 
        isToggledOn={_userInstruments[index]?.visible}
        onUserInstrumentVisibilityToggle={(e) => {
          onUserInstrumentVisibilityToggle(index);
          e.preventDefault(); 
          e.stopPropagation();
          return false;
        }}
      />
      <div style={{paddingLeft: 3}}>
        {userInstrument?.name ?? index}
      </div>
    </UserInstrumentTab>
  )), [_userInstruments, _userInstrumentIndex, onUserInstrumentVisibilityToggle, setUserInstrumentIndex, selectNotesByInstrument, _compositionByInstructionIdRef]);

  const currColor = _userInstruments[_userInstrumentIndex]?.color ?? sf2DefaultColours[0];
  return (
    <div style={{ display: "flex", flexDirection: "column"}}>
      <SoundfontHeader $color={currColor}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
          <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center' }}>
            <b>Name:</b>
            <input
              ref={userInstrumentNameInputRef}
              type="text"
              defaultValue={_userInstruments[_userInstrumentIndex]?.name}
              onChange={onNameChange} />
            {_userInstruments[_userInstrumentIndex]?.sf2Sampler && (<>
              <div style={{ display: 'flex' }}>
                {/* <label htmlFor="sf2-instrument-select">Select instrument: </label> */}
                <select id="sf2-instrument-select"
                  value={_selectedSf2InstOption}
                  style={{ marginLeft: 8}}
                  onChange={onSf2InstrumentSelect}>
                  {sf2InstOptions}
                </select>
                <ShuffleButton onClick={randomizeSf2Instrument}>🎲</ShuffleButton>
              </div>
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
              defaultValue={_userInstruments[_userInstrumentIndex]?.volume}
              onChange={onUserInstrumentVolumeChange} />
          </div>
          <UserInstrumentMuteButton 
            isToggledOn={_userInstruments[_userInstrumentIndex]?.visible}
            onUserInstrumentVisibilityToggle={() => onUserInstrumentVisibilityToggle(_userInstrumentIndex)}
          />
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
        <div style={{position: 'absolute', left: -23, top: 2}}>
          <UserInstrumentMuteButton
            isToggledOn={isAnyInstrumentVisible}
            onUserInstrumentVisibilityToggle={onUserInstrumentVisibilityToggleAll}
            useAltSprite
          />
        </div>
        {userInstrumentTabs}
        <UserInstrumentTab onClick={onAddNewUserInstrument} $disabled={canAddNewInstrument}>+</UserInstrumentTab>
      </UserInstrumentSelector>
    </div>
  );
}