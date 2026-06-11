import React, { useCallback, useContext, useMemo, useState } from 'react';
import styled from 'styled-components'
import { renderOffline } from "../smplr/offline";
import { SongSettingsContext } from './contexts/SongSettingsContextProvider';
import { ActionButtonsContainer } from './ActionButtonFooter';
import { createUserInstrument, UserInstrumentContext } from './contexts/UserInstrumentContextProvider';
import { AudioContextContext, convertCompositionByInstrumentToComposition, convertCompositionToCompositionByInstrument, DEFAULT_VOLUME, getARandomNote, getBeatLengthInMs, getEndOfMeasureToLoopAtBeat, getInstrumentInstructionFromNoteData, getNewInstrumentColor, JsonNoteData, SongJsonExport, SubdivisionType, TimeSignature, UserInstrument } from './consts';
import { PristineContext } from './contexts/PristineContextProvider';
import { generate } from "random-words";
import { TimeSignatureContext } from './contexts/TimeSignatureContextProvider';
import { BabyDanceFrameContext, PlayTheSongContext } from './contexts/PlayTheSongContextProvider';
import { PlayheadPosXContext } from './contexts/PlayheadPosXContextProvider';
import { CompositionActionsContext } from './contexts/CompositionActionsContextProvider';
import { InstrumentInstance } from '../smplr/smplr/instrument';
import { Soundfont2SamplerExtras } from '../smplr';
import MidiWriter from 'midi-writer-js';
import { midiPitchStringFromNumber } from '../smplr/smplr/midi';
import { Track } from 'midi-writer-js/build/types/chunks/track';
import { CompositionContext } from './contexts/CompositionContextProvider';
import { UndoRedoContext } from './contexts/UndoRedoContextProvider';

const SongHeaderContainer = styled.div`
  background-color: white;
  height: 32px;
  display: flex;
  // flex-wrap: wrap;
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
  user-select: none;
`;
const FileInputLabel = styled.label`
  background: white;
  padding: 2px;
  border: 1px solid black;
  cursor: pointer;
`;
const ShuffleButton = styled.div`
  background: white;
  padding: 1px 2px;
  border: 1px solid black;
  cursor: pointer;
  margin-left: 2px;
  margin-right: 4px;
`;

export function SongOptionsHeader({footer}: {footer: React.ReactElement}) {
  const audioContext = useContext(AudioContextContext)!;
  const { _timeSignature, timeSignatureRef, setTimeSignature } = useContext(TimeSignatureContext)!;
  const {
    songName,
    setSongName,
    // masterVolume,
    // setMasterVolume,
    tempoRef,
    setTempo,
  } = useContext(SongSettingsContext)!;
  const { babyDanceFrame } = useContext(BabyDanceFrameContext)!;
  const { incrementBabyDanceFrame } = useContext(PlayTheSongContext)!;
  const { _farthestRightNoteEnd } = useContext(CompositionContext)!;
  const { setPlayheadPosX } = useContext(PlayheadPosXContext)!;
  const { setPristine } = useContext(PristineContext)!;
  const { clearUndoStack } = useContext(UndoRedoContext)!;
  // TODO(jaketrower): https://blog.allaroundjavascript.com/prevent-unnecessary-re-renders-of-components-when-using-usecontext-with-react
  const { 
    compositionRef,
    setComposition,
    manuallyUpdateFarthestRightNoteEnd,
  } = useContext(CompositionActionsContext)!;
  const { 
    handleClearComposition,
  } = useContext(PlayTheSongContext)!;
  // TODO(jaketrower): https://blog.allaroundjavascript.com/prevent-unnecessary-re-renders-of-components-when-using-usecontext-with-react
  const {
    defaultSoundfontBuffer,
    userInstrumentsRef,
    userInstrumentIndexRef,
    setUserInstruments,
    setUserInstrumentIndex,
    getNewUserInstrument,
    setHowManyInstrumentsIEverMade,
  } = useContext(UserInstrumentContext)!;

  const endOfMeasureToLoopAtBeat = useMemo(() => {
    return getEndOfMeasureToLoopAtBeat(_farthestRightNoteEnd, _timeSignature, undefined);
  }, [_farthestRightNoteEnd, _timeSignature]);

  // const onMasterVolumeChange = useCallback(
  //   (e: React.ChangeEvent<HTMLInputElement>) => {
  //     setMasterVolume(parseInt(e.target.value));
  //   },
  //   []
  // );
  const handleLoadCompositionFromFileJson = useCallback(async (jsonObj: SongJsonExport) => {
    setSongName(jsonObj.songName);
    setTempo(jsonObj.tempo);
    const newUserInstruments: UserInstrument[] = await Promise.all(
      [...jsonObj.userInstruments.map(
        async (jsonInstrument, index) => {
          // TODO(jaketrower): handle save/load with different .sf2s then the default !
          const sf2Sampler = (await getNewUserInstrument(audioContext, index)).sf2Sampler;
          const sf2InstrumentName = jsonInstrument.sf2InstrumentName ?? sf2Sampler?.instrumentNames[0];
          await sf2Sampler?.loadInstrument(sf2InstrumentName!);
          const sf2InstrumentIndex = sf2Sampler?.instrumentNames.findIndex((name) => name === sf2InstrumentName) ?? -1;
          return {
            name: jsonInstrument.name ?? `ins${index+1}`,
            color: jsonInstrument.color ?? getNewInstrumentColor(index),
            // TODO(jaketrower): handle save/load with different .sf2s then the default !
            sf2InstrumentName,
            sf2InstrumentIndex,
            volume: jsonInstrument.volume ?? DEFAULT_VOLUME,
            visible: jsonInstrument.visible ?? true, 
            solo: jsonInstrument.solo ?? false,
            sf2Sampler,
          }
    })]);
    setTimeSignature(jsonObj.timeSignature || TimeSignature.ts4_4);
    setUserInstrumentIndex(0);
    setUserInstruments(newUserInstruments);
    setHowManyInstrumentsIEverMade(newUserInstruments.length);
    setComposition(convertCompositionByInstrumentToComposition(jsonObj.composition), true);
    setPlayheadPosX(0);
    manuallyUpdateFarthestRightNoteEnd();
    setPristine(true);
    clearUndoStack();
  }, [audioContext, clearUndoStack, getNewUserInstrument, manuallyUpdateFarthestRightNoteEnd, setComposition, setHowManyInstrumentsIEverMade, setPlayheadPosX, setPristine, setSongName, setTempo, setTimeSignature, setUserInstrumentIndex, setUserInstruments]);
  const handleSaveCompositionToFile = useCallback(() => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({
      songName,
      tempo: tempoRef.current,
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
      timeSignature: timeSignatureRef.current,
    } as SongJsonExport)], {
      type: "text/plain"
    }));
    a.setAttribute("download", `${songName}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setPristine(true);
  }, [songName, tempoRef, userInstrumentsRef, compositionRef, setPristine, timeSignatureRef]);

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

  const getRenderedOfflineAudioResult = useCallback(() => {
    const beatLengthInSeconds = getBeatLengthInMs(tempoRef.current) / 1000;
    return renderOffline(async (audioContext) => {
      const offlineSf2Samplers: InstrumentInstance<Soundfont2SamplerExtras>[] = await Promise.all(userInstrumentsRef.current.map(
        async (userInstrument, index) => {
          // TODO(jaketrower): This will need to be modified to handle multiple sf2s as well..
          const { sf2Sampler } = await createUserInstrument(audioContext, 0, defaultSoundfontBuffer);
          sf2Sampler!.output.volume = userInstrument.volume;
          if (userInstrument.sf2InstrumentName) {
            await sf2Sampler!.loadInstrument(userInstrument.sf2InstrumentName);
          }
          return sf2Sampler!;
      }));
      const compositionByInstrument = convertCompositionToCompositionByInstrument(compositionRef.current);
      Object.keys(compositionByInstrument).forEach((userInstrumentIdxStr: string) => {
        const userInstrumentIdx = Number.parseInt(userInstrumentIdxStr);
        const sf2Sampler = offlineSf2Samplers[userInstrumentIdx];
        const notesToPlay = compositionByInstrument[userInstrumentIdx];
        notesToPlay.forEach((noteData: JsonNoteData) => {
          // TODO(jaketrower): Would be nice to have some shared helper functions for this maybe, between here and playCompositionNotesAtBeat
          const instrumentInstruction = getInstrumentInstructionFromNoteData(noteData, userInstrumentIdx);
          const { midiNote, midiBeat } = instrumentInstruction;
          const durationSec = beatLengthInSeconds * instrumentInstruction.noteWidth;
          const tripletBeatOffsetInSeconds = instrumentInstruction.subdivisionType === SubdivisionType.q
            ? 0
            : ((midiBeat - 1) % 4) * beatLengthInSeconds * ((beatLengthInSeconds * 4.0) / 3.0);
          console.log(`Play note ${midiNote} at time ${midiBeat * beatLengthInSeconds + tripletBeatOffsetInSeconds}s (aka beat: ${midiBeat}) for ${durationSec}s`);
          sf2Sampler.start({
            note: midiNote,
            time: (midiBeat * beatLengthInSeconds) + tripletBeatOffsetInSeconds,
            duration: durationSec,
          });
        });
      });
    }, {
      duration: endOfMeasureToLoopAtBeat * beatLengthInSeconds,
    });
  }, [compositionRef, defaultSoundfontBuffer, endOfMeasureToLoopAtBeat, tempoRef, userInstrumentsRef]);

  const handleExportSongToWav = useCallback(async () => {
    try {
      (await getRenderedOfflineAudioResult()).downloadWav(`${songName}.wav`);
    } catch (e) {
      console.log(e);
      alert("We tried, but failed, to export the song as wav! See console for more details.");
    }
  }, [getRenderedOfflineAudioResult, songName]);

  const handleExportSongToMp3 = useCallback(async () => {
    try {
      (await getRenderedOfflineAudioResult()).downloadMp3(`${songName}.mp3`);
    } catch (e) {
      console.log(e);
      alert("We tried, but failed, to export the song as mp3! See console for more details.");
    }
  }, [getRenderedOfflineAudioResult, songName]);

  const handleSaveCompositionToMidiFile = useCallback(async () => {
    try {
      const compositionByInstrument = convertCompositionToCompositionByInstrument(compositionRef.current);
      const TICKS_PER_BEAT = 128 / 4;
      const allMidiTracks: Track[] = [];
      Object.keys(compositionByInstrument).forEach((userInstrumentIdxStr: string) => {
        const midiTrack = new MidiWriter.Track();
        const userInstrumentIdx = Number.parseInt(userInstrumentIdxStr);
        const midiTrackChannel = userInstrumentIdx;
        const userInstrument = userInstrumentsRef.current[userInstrumentIdx];
        const notesToPlay = compositionByInstrument[userInstrumentIdx];
        midiTrack.addTrackName(userInstrument.name);
        userInstrument.sf2InstrumentName && midiTrack.addInstrumentName(userInstrument.sf2InstrumentName);
        midiTrack.setTempo(tempoRef.current); // Midi Tempo is in bpm, just like tempoRef.current, yay!
        // TODO(jaketrower): it's possible this breaks with SoundFonts with more than 128 instruments (???)
        midiTrack.addEvent(new MidiWriter.ProgramChangeEvent({
          instrument: userInstrument.sf2InstrumentIndex >= 0
                        ? userInstrument.sf2InstrumentIndex + 1
                        : 1
        }));
        notesToPlay.forEach((noteData: JsonNoteData) => {
          // TODO(jaketrower): Would be nice to have some shared helper functions for this maybe, between here and playCompositionNotesAtBeat
          const instrumentInstruction = getInstrumentInstructionFromNoteData(noteData, userInstrumentIdx);
          const { midiNote, midiBeat } = instrumentInstruction;
          const noteDuration = instrumentInstruction.noteWidth * TICKS_PER_BEAT;
          const noteTick = midiBeat * TICKS_PER_BEAT;
          const noteTripletTickOffset = instrumentInstruction.subdivisionType === SubdivisionType.q
            ? 0
            : ((midiBeat - 1) % 4) * TICKS_PER_BEAT * (43); // 43 is not exactly (128 / 4.0 * 4.0) / 3.0, but it's close enough.
          const midiTick = noteTick + noteTripletTickOffset;
          const midiNoteStr = midiPitchStringFromNumber(midiNote);
          // // console.log(`Play note ${midiNote} at time ${midiBeat * beatLengthInSeconds + tripletBeatOffsetInSeconds}s (aka beat: ${midiBeat}) for ${durationSec}s`);
          midiTrack.addEvent(new MidiWriter.NoteEvent({
            pitch: midiNoteStr,
            startTick: midiTick,
            duration: `T${noteDuration}`,
            channel: midiTrackChannel,
            velocity: userInstrument.volume
          }));
        });
        allMidiTracks.push(midiTrack);
      });

      const writer = new MidiWriter.Writer(allMidiTracks);
      const dataUri = writer.dataUri();
      const res = await fetch(dataUri);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.setAttribute("download", `${songName}.mid`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.log(e);
      alert("We tried, but failed, to export the song as midi! See console for more details.");
    }
  }, [compositionRef, songName, tempoRef, userInstrumentsRef]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  return (
    <>
      <SongHeaderContainer>
        {/* <div><TinySpriteImg src="trans.png" $frame={tinySpriteFrame} onClick={() => {
          incrementTinySpriteFrame();
        }}/></div> */}
        <div><DancingBabyImg src="trans.png" $frame={babyDanceFrame} onClick={() => {
          incrementBabyDanceFrame(); 
          userInstrumentsRef.current[userInstrumentIndexRef.current].sf2Sampler?.start({ note: getARandomNote(), duration: 0.25 });
        }}/></div>
        <div style={{ display: 'flex', flexDirection: 'column', }}>
          <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 2 }}>
            <b style={{ marginLeft: 2}}>Song Name:</b>
            <input type="text" value={songName} onChange={(e) => {
              setSongName(e.target.value);
            }} />
            <ShuffleButton onClick={() => { setSongName((generate(2) as string[]).join(' ')); }}>🎲</ShuffleButton>
            𖡼𖤣𖥧𖡼𓋼𖤣&nbsp;
            {footer}
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
        <ActionButtonsContainer style={{ flexGrow: 1, marginRight: 4, justifyContent: 'end', }}>
          <DivButton onClick={() => {
            handleClearComposition();
            setSongName((generate(2) as string[]).join(' '));
          }}>💣 New</DivButton>
          <DivButton onClick={handleSaveCompositionToFile} style={{
            position: "relative", minWidth: "56px", 
          }}>💾 Save</DivButton>
          <FileInputLabel htmlFor={`song-to-load`}>📂 Load</FileInputLabel>
          <DivButton onClick={() => {setIsSaveModalOpen((prev) => !prev);}} style={{
            position: "relative", minWidth: "56px", userSelect: "none", background: isSaveModalOpen ? "lightgray" : "white", color: isSaveModalOpen ? "black" : "black",
          }}>{isSaveModalOpen ? "🗑️ Cancel" : "📤 Export"}{isSaveModalOpen && (
            <>
              <div style={{position: "absolute", display: "flex", flexDirection: "column", top: "23px", zIndex: 999, left: "-1px", width: "82px", gap: "1px", textAlign: "left", color: "black"}}>
                <DivButton onClick={handleSaveCompositionToMidiFile} style={{ padding: 2 }}>as 🎼 MIDI </DivButton>
                <DivButton onClick={handleExportSongToWav} style={{ padding: 2 }}>as 🔊 WAV</DivButton>
                {/* Doesn't work yet... having problems with lamejs libraries. */}
                {/* <DivButton onClick={handleExportSongToMp3} style={{ padding: 2 }}>as 💽 MP3</DivButton> */}
              </div>
            </>)}</DivButton>
          <input id={`song-to-load`} type="file" accept=".json" onChange={onLoadSongJson} style={{ display: 'none' }} />
        </ActionButtonsContainer>
      </SongHeaderContainer>
    </>
  );
}