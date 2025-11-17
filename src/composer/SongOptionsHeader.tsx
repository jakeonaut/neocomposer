import React, { useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components'
import { CompositionContext, convertCompositionToCompositionByInstrument } from './contexts/CompositionContextProvider';
import { SongSettingsContext } from './contexts/SongSettingsContextProvider';
import { ActionButtonsContainer } from './ActionButtons';
import { UserInstrumentContext } from './contexts/UserInstrumentContextProvider';

const SongHeaderContainer = styled.div`
  background-color: white;
  height: 32px;
  display: flex;
  gap: 4px;
  outline: 1px solid black;
  margin: 2px;
  align-items: center;
`;
const DancingBabyImg = styled.img<{ $frame: number }>`
  margin: 8px 6px 10px 8px;
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  transform: scale(1.5);
  background-image: url('baby_dance_sheet.png');
  background-position: ${({ $frame }) => `${$frame*-20}px 0px`};
  cursor: pointer;
`;
const DivButton = styled.div`
  background: white;
  padding: 2px;
  border: 1px solid black;
  cursor: pointer;
`;

export function SongOptionsHeader({}: {}) {
  const {
    songName,
    setSongName,
    // masterVolume,
    // setMasterVolume,
    babyDanceFrame,
    tempo,
    incrementBabyDanceFrame,
  } = useContext(SongSettingsContext)!;
  const { 
    composition,
    handleClearComposition,
  } = useContext(CompositionContext)!;
  const { userInstruments } = useContext(UserInstrumentContext)!;
  // const onMasterVolumeChange = useCallback(
  //   (e: React.ChangeEvent<HTMLInputElement>) => {
  //     setMasterVolume(parseInt(e.target.value));
  //   },
  //   []
  // );
  const handleImportComposition = useCallback(() => {}, []);
  const handleExportComposition = useCallback(() => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({
      songName,
      tempo,
      userInstruments: userInstruments.map((inst) => ({
        color: inst.color,
        volume: inst.volume,
        name: inst.name,
        sf2InstrumentName: inst.sf2InstrumentName,
        // TODO(jaketrower): Allow user uploaded .sf2 files to have a "memory" ???
        // if we remind them what .sf2 file names were uploaded, and prompt them to upload them?
        // otherwise default to our default soundfont
      })),
      composition: convertCompositionToCompositionByInstrument(composition),
    })], {
      type: "text/plain"
    }));
    a.setAttribute("download", `${songName}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [songName, composition, userInstruments]);

  return (
    <>
      <SongHeaderContainer>
        <div><DancingBabyImg src="trans.png" $frame={babyDanceFrame} onClick={() => {
          incrementBabyDanceFrame();
        }}/></div>
        <div style={{ display: 'flex', flexDirection: 'column', }}>
          <div style={{ textAlign: 'left', }}>
            <b>Song Name:</b>&nbsp;
            <input type="text" value={songName} onChange={(e) => {
              setSongName(e.target.value)
            }} />
          </div>
          {/* <div style={{ display: 'flex', alignItems: 'center', }}>
            <label htmlFor="master-instrument-volume">
              &nbsp;
              {masterVolume == 0
                ? '🔇'
                : masterVolume < 10
                  ? '🔈' 
                  : masterVolume < 67
                    ? '🔉'
                    : masterVolume < 120 ? '🔊' : '💯'}
              &nbsp;<b>Master Volume:</b></label>
            <input style={{ width: 100 }} type="range" min="0" max="127"
              id="master-instrument-volume"
              value={masterVolume}
              onChange={onMasterVolumeChange}
            />
          </div> */}
        </div>
        <ActionButtonsContainer style={{ flexGrow: 1, marginRight: 8, justifyContent: 'end', }}>
          <DivButton onClick={handleClearComposition}>💣 New</DivButton>
          <DivButton onClick={handleExportComposition}>💾 Save</DivButton>
          <DivButton onClick={handleImportComposition}>📥 Load</DivButton>
        </ActionButtonsContainer>
      </SongHeaderContainer>
    </>
  );
}