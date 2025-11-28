import React, { useCallback, useContext } from 'react';
import styled from 'styled-components'
import { CompositionContext, convertCompositionToCompositionByInstrument } from './contexts/CompositionContextProvider';
import { SongSettingsContext } from './contexts/SongSettingsContextProvider';
import { ActionButtonsContainer } from './ActionButtons';
import { UserInstrumentContext } from './contexts/UserInstrumentContextProvider';
import { AudioContextContext, SongJsonExport } from './consts';

const SongHeaderContainer = styled.div`
  background-color: white;
  height: 32px;
  display: flex;
  gap: 4px;
  outline: 1px solid black;
  margin: 2px;
  align-items: center;
`;
// const TinySpriteImg = styled.img<{ $frame: number }>`
//   margin: 10px 6px 8px 8px;
//   width: 16px;
//   height: 16px;
//   image-rendering: pixelated;
//   transform: scale(1.5);
//   background-image: url('__tinySprites.png');
//   background-position: ${({ $frame }) => `${($frame % 8)*-16}px ${Math.floor($frame / 8)*-16}px`};
//   cursor: pointer;
// `;
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
const FileInputLabel = styled.label`
  background: white;
  padding: 2px;
  border: 1px solid black;
  cursor: pointer;
`;

export function SongOptionsHeader({}: {}) {
  const audioContext = useContext(AudioContextContext)!;
  const {
    songName,
    setSongName,
    // masterVolume,
    // setMasterVolume,
    babyDanceFrame,
    incrementBabyDanceFrame,
    tempo,
    setTempo,
    setPristine,
  } = useContext(SongSettingsContext)!;
  const { 
    compositionRef,
    setComposition,
    convertCompositionByInstrumentToComposition,
    handleClearComposition,
  } = useContext(CompositionContext)!;
  const {
    userInstrumentsRef,
    setUserInstruments,
    getNewUserInstrument,
    setHowManyInstrumentsIEverMade,
  } = useContext(UserInstrumentContext)!;
  // const [tinySpriteFrame, setTinySpriteFrame] = useState(0);
  // const incrementTinySpriteFrame = useCallback(() => {
  //   if (tinySpriteFrame >= 15) {
  //     setTinySpriteFrame(0);
  //   } else {
  //     setTinySpriteFrame(tinySpriteFrame + 1);
  //   }
  // }, [tinySpriteFrame]);

  // const onMasterVolumeChange = useCallback(
  //   (e: React.ChangeEvent<HTMLInputElement>) => {
  //     setMasterVolume(parseInt(e.target.value));
  //   },
  //   []
  // );
  const handleLoadCompositionFromFileJson = useCallback((jsonObj: SongJsonExport) => {
    setSongName(jsonObj.songName);
    setTempo(jsonObj.tempo);
    const newUserInstruments = [...jsonObj.userInstruments.map((jsonInstrument, index) => {
      const sf2Sampler = getNewUserInstrument(audioContext, index).sf2Sampler;
      sf2Sampler?.loadInstrument(jsonInstrument.sf2InstrumentName!);
      return {
        ...jsonInstrument,
        sf2Sampler,
      }
    })];
    setUserInstruments(newUserInstruments);
    setHowManyInstrumentsIEverMade(newUserInstruments.length);
    setComposition(convertCompositionByInstrumentToComposition(jsonObj.composition));
    setPristine(true);
  }, [audioContext, convertCompositionByInstrumentToComposition, getNewUserInstrument, setComposition, setHowManyInstrumentsIEverMade, setPristine, setSongName, setTempo, setUserInstruments]);
  const handleSaveCompositionToFile = useCallback(() => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({
      songName,
      tempo,
      userInstruments: userInstrumentsRef.current.map((inst) => ({
        color: inst.color,
        volume: inst.volume,
        name: inst.name,
        sf2InstrumentName: inst.sf2InstrumentName,
        // TODO(jaketrower): Allow user uploaded .sf2 files to have a "memory" ???
        // if we remind them what .sf2 file names were uploaded, and prompt them to upload them?
        // otherwise default to our default soundfont
      })),
      composition: convertCompositionToCompositionByInstrument(compositionRef.current),
    } as SongJsonExport)], {
      type: "text/plain"
    }));
    a.setAttribute("download", `${songName}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setPristine(true);
  }, [songName, tempo, userInstrumentsRef, compositionRef, setPristine]);

  const onLoadSongJson = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0]; 
    if (!file) {
      console.log("Failed to load file.");
      return;
    }
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = readerEvent => {
      const jsonText = readerEvent.target?.result;
      if (!(typeof jsonText === typeof '')) {
        console.log("Failed to parse file.");
        return;
      }
      handleLoadCompositionFromFileJson(JSON.parse(jsonText as string));
    }
  }, [handleLoadCompositionFromFileJson]);

  return (
    <>
      <SongHeaderContainer>
        {/* <div><TinySpriteImg src="trans.png" $frame={tinySpriteFrame} onClick={() => {
          incrementTinySpriteFrame();
        }}/></div> */}
        <div><DancingBabyImg src="trans.png" $frame={babyDanceFrame} onClick={incrementBabyDanceFrame}/></div>
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
          <DivButton onClick={handleSaveCompositionToFile}>💾 Save As</DivButton>
          <FileInputLabel htmlFor={`song-to-load`}>📥 Load</FileInputLabel>
          <input id={`song-to-load`} type="file" accept=".json" onChange={onLoadSongJson} style={{ display: 'none' }} />
        </ActionButtonsContainer>
      </SongHeaderContainer>
    </>
  );
}