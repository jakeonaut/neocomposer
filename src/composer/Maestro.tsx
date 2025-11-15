import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { TodoList } from "../TodoList";
import { CompositionAndPlayhead } from "./CompositionAndPlayhead";
import { UserInstrumentsHeader } from "./UserInstrumentsHeader";
import { InputMode, sf2DefaultColours, UserInstrument } from "./consts";
import { useComposition } from "./useComposition";
import { SongOptionsHeader } from "./SongOptionsHeader";
import { ActionButton, ActionButtonsContainer } from "./styled";

const MaestroContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const BabyPlayheadImg = styled.img<{ $frame: number }>`
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  background-image: url("baby_dance_sheet.png");
  position: relative;
  left: -10px;
  top: -6px;
  background-position: ${({ $frame }) => `${$frame * -20}px 0px`};
`;

const keyboardPianoKeys = new Map(
  Object.entries({
    a: "C4",
    w: "Db4",
    s: "D4",
    e: "Eb4",
    d: "E4",
    f: "F4",
    t: "Gb4",
    g: "G4",
    y: "Ab4",
    h: "A4",
    u: "Bb4",
    j: "B4",
    k: "C5",
    o: "Db5",
    l: "D5",
    p: "Eb5",
    ";": "E5",
    "'": "F5",
  })
);

export function Maestro() {
  const [context] = useState(new AudioContext());
  const [songName, setSongName] = useState('new_song');
  const [userInstruments, setUserInstruments] = useState<Array<UserInstrument>>(
    [
      {
        name: "ins0",
        color: sf2DefaultColours[0],
        sf2Sampler: undefined,
        sf2InstrumentName: undefined,
        volume: 100,
      },
    ]
  );
  const [userInstrumentIndex, setUserInstrumentIndex] = useState(0);
  const [masterVolume, setMasterVolume] = useState(100);
  const [isCompositionMouseDown, setIsCompositionMouseDown] = useState(false);
  const [inputMode, setInputMode] = useState(InputMode.DEFAULT);
  const [tempo, setTempo] = useState(68);
  const [babyDanceFrame, setBabyDanceFrame] = useState(0);
  const incrementBabyDanceFrame = useCallback(
    () => setBabyDanceFrame((prev) => (prev < 3 ? prev + 1 : 0)),
    []
  );
  const [babyPlayheadPosX, setBabyPlayheadPosX] = useState(1);
  const {
    composition,
    handleUpdateCompositionAtBeatAndNote,
    setComposition,
    handlePlayComposition,
    handleStopComposition,
    handleClearComposition,
    handleExportComposition,
    handleImportComposition,
    isPlaying,
    handleStartLoop,
    handleStopLoop,
    isLooping,
  } = useComposition({
    songName,
    context,
    tempo,
    userInstruments,
    userInstrumentIndex,
    setPlayheadPosX: (posX: number) => {
      setBabyPlayheadPosX(posX);
      incrementBabyDanceFrame();
    },
    inputMode,
  });

  const [onCompositionMouseUp, setOnCompositionMouseUp] = useState<(() => void) | undefined>();
  const trySetInputMode = useCallback((newInputMode: InputMode) => {
    if (isCompositionMouseDown) return;
    setInputMode(newInputMode);
  }, [isCompositionMouseDown]);
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.repeat) {
        return;
      }
      if (e.key === "Shift") {
        trySetInputMode(InputMode.SELECT);
        if (isCompositionMouseDown) {
          setOnCompositionMouseUp(() => (() => setInputMode(InputMode.SELECT)));
        }
        return false;
      }
      if (e.code === "Space") {
        isPlaying ? handleStopComposition() : handlePlayComposition({});
        e.preventDefault();
        return false;
      }
      const playedNote = keyboardPianoKeys.has(e.key)
        ? keyboardPianoKeys.get(e.key)
        : undefined;
      const currUserInstrument = userInstruments[userInstrumentIndex];
      if (!currUserInstrument.sf2Sampler || !playedNote) {
        return;
      }
      currUserInstrument.sf2Sampler.start({
        note: playedNote,
        time: context.currentTime,
        duration: 0.25,
      });
      incrementBabyDanceFrame();
    },
    [
      userInstruments,
      userInstrumentIndex,
      context.currentTime,
      incrementBabyDanceFrame,
      isPlaying,
      handleStopComposition,
      handlePlayComposition,
      trySetInputMode,
      isCompositionMouseDown,
    ]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Shift") {
      trySetInputMode(InputMode.DEFAULT);
      if (isCompositionMouseDown) {
        setOnCompositionMouseUp(() => (() => setInputMode(InputMode.DEFAULT)));
      }
      return false;
    }
  }, [trySetInputMode, isCompositionMouseDown]);

  const onMasterVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMasterVolume(parseInt(e.target.value));
    },
    []
  );

  const onTempoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTempo(parseInt(e.target.value));
    },
    []
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp)
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <MaestroContainer>
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
      <SongOptionsHeader
        songName={songName}
        setSongName={setSongName}
        handleClearComposition={handleClearComposition}
        handleExportComposition={handleExportComposition}
        handleImportComposition={handleImportComposition}
        babyDanceFrame={babyDanceFrame}
        incrementBabyDanceFrame={incrementBabyDanceFrame}
      />
      <UserInstrumentsHeader
        context={context}
        userInstruments={userInstruments}
        setUserInstruments={setUserInstruments}
        userInstrumentIndex={userInstrumentIndex}
        setUserInstrumentIndex={setUserInstrumentIndex}
        incrementBabyDanceFrame={incrementBabyDanceFrame}
      />
      <CompositionAndPlayhead
        context={context}
        composition={composition}
        userInstruments={userInstruments}
        userInstrumentIndex={userInstrumentIndex}
        inputMode={inputMode}
        isCompositionMouseDown={isCompositionMouseDown}
        setIsCompositionMouseDown={setIsCompositionMouseDown}
        onCompositionMouseUp={onCompositionMouseUp}
        setOnCompositionMouseUp={setOnCompositionMouseUp}
        handleUpdateCompositionAtBeatAndNote={
          handleUpdateCompositionAtBeatAndNote
        }
        playheadNode={
          <BabyPlayheadImg src="trans.png" $frame={babyDanceFrame} />
        }
        playheadPosX={babyPlayheadPosX}
      />
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
          onClick={() => trySetInputMode(InputMode.DEFAULT)}
          style={{
            border: '1px solid black',
            paddingBottom: 4,
            paddingTop: 1,
            paddingRight: 1,
            ...(
              inputMode === InputMode.DEFAULT ? {
                background: 'black',
                opacity: 0.5,
              } : {}
            ),
          }}>
          <div style={{
            background: `url('./toolicons1x.png') repeat scroll ${inputMode === InputMode.DEFAULT ? '-25px' : '0'} -126px transparent`,
            width: 25,
            height: 21,
          }} />
        </ActionButton>
        <ActionButton
          onClick={() => trySetInputMode(InputMode.SELECT)}
          style={{
            border: '1px solid black',
            paddingBottom: 3,
            paddingTop: 2,
            paddingRight: 1,
            marginLeft: -6,
            ...(
              inputMode === InputMode.SELECT ? {
                background: 'black',
                opacity: 0.5,
              } : {}
            ),
          }}>
          <div style={{
            background: `url('./toolicons1x.png') repeat scroll  ${inputMode === InputMode.SELECT ? '-25px' : '0'}  -21px transparent`,
            width: 25,
            height: 21,
          }} />
        </ActionButton>
      </ActionButtonsContainer>
      <br />
      <TodoList />
    </MaestroContainer>
  );
}
