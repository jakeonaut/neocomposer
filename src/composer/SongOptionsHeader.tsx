import React, { useCallback, useContext, useMemo, useState } from 'react';
import styled from 'styled-components'
import { renderOffline } from "../smplr/offline";
import { SongSettingsContext } from './contexts/SongSettingsContextProvider';
import { ActionButtonsContainer } from './ActionButtonFooter';
import { UserInstrumentContext } from './contexts/UserInstrumentContextProvider';
import { AudioContextContext, CompositionByInstrument, convertCompositionByInstrumentToComposition, convertCompositionToCompositionByInstrument, DEFAULT_VOLUME, getARandomNote, getBeatLengthInMs, getEndOfMeasureToLoopAtBeat, getInstrumentInstructionFromNoteData, getNewInstrumentColor, JsonNoteData, SongJsonExport, SubdivisionType, TimeSignature, UserInstrument } from './consts';
import { PristineContext } from './contexts/PristineContextProvider';
import { generate } from "random-words";
import { TimeSignatureContext } from './contexts/TimeSignatureContextProvider';
import { BabyDanceFrameContext, PlayTheSongContext } from './contexts/PlayTheSongContextProvider';
import { PlayheadPosXContext } from './contexts/PlayheadPosXContextProvider';
import { CompositionActionsContext } from './contexts/CompositionActionsContextProvider';
import { InstrumentInstance } from '../smplr/smplr/instrument';
import { Soundfont2SamplerExtras } from '../smplr';
import MidiWriter from 'midi-writer-js';
import MidiPlayer, { Player } from 'midi-player-js';
import { midiPitchStringFromNumber, noteNameToMidi } from '../smplr/smplr/midi';
import { Track } from 'midi-writer-js/build/types/chunks/track';
import { CompositionContext } from './contexts/CompositionContextProvider';
import { UndoRedoContext } from './contexts/UndoRedoContextProvider';

const SongHeaderContainer = styled.div`
  background-color: white;
  height: 32px;
  display: flex;
  gap: 4px;
  outline: 1px solid black;
  margin: 2px;
  align-items: center;
`;
const DancingBabyImg = styled.img<{ $frame: number, $yFrame: number }>`
  margin: 8px 6px 10px 8px;
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  transform: scale(1.5);
  background-image: url('baby_dance_sheet.png');
  background-position: ${({ $frame, $yFrame }) => `${$frame * -20}px ${$yFrame * -20}px`};
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
  const { babyDanceFrame, babyDanceYFrame } = useContext(BabyDanceFrameContext)!;
  const { incrementBabyDanceFrame, incrementBabyDanceYFrame } = useContext(PlayTheSongContext)!;
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
    createUserInstrument,
    defaultSoundfontFileName,
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
          const instrumentFileName = jsonInstrument.fileName ?? defaultSoundfontFileName;
          let overrideBuffer: Uint8Array | undefined;
          if (instrumentFileName !== defaultSoundfontFileName) {

          }

          const sf2Sampler = (await getNewUserInstrument(audioContext, index, overrideBuffer)).sf2Sampler;
          let sf2InstrumentName = jsonInstrument.sf2InstrumentName ?? sf2Sampler?.instrumentNames[0];
          const sf2InstrumentIndex = sf2Sampler?.instrumentNames.findIndex((name) => name === sf2InstrumentName) ?? -1;
          if (sf2InstrumentIndex === -1) {
            sf2InstrumentName = sf2Sampler?.instrumentNames[0];
          }
          await sf2Sampler?.loadInstrument(sf2InstrumentName!);
          if (sf2Sampler) {
            sf2Sampler.output.volume = jsonInstrument.volume ?? DEFAULT_VOLUME;
          }
          return {
            name: jsonInstrument.name ?? `ins${index+1}`,
            fileName: instrumentFileName,
            color: jsonInstrument.color ?? getNewInstrumentColor(index),
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
  }, [audioContext, clearUndoStack, defaultSoundfontFileName, getNewUserInstrument, manuallyUpdateFarthestRightNoteEnd, setComposition, setHowManyInstrumentsIEverMade, setPlayheadPosX, setPristine, setSongName, setTempo, setTimeSignature, setUserInstrumentIndex, setUserInstruments]);
  const handleSaveCompositionToFile = useCallback(() => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({
      songName,
      tempo: tempoRef.current,
      userInstruments: userInstrumentsRef.current.map((inst) => ({
        color: inst.color,
        volume: inst.volume,
        fileName: inst.fileName,
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
          // console.log(`Play note ${midiNote} at time ${midiBeat * beatLengthInSeconds + tripletBeatOffsetInSeconds}s (aka beat: ${midiBeat}) for ${durationSec}s`);
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
  }, [compositionRef, createUserInstrument, defaultSoundfontBuffer, endOfMeasureToLoopAtBeat, tempoRef, userInstrumentsRef]);

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
            channel: Math.min(midiTrackChannel, 16),
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

  // Doesn't work yet, I got tired and it's complicated
  const handleLoadCompositionFromFileMidi = useCallback(async (midiPlayer: Player) => {
    const midiTracks = midiPlayer.tracks;
    if (!midiTracks) {
      throw new Error("Failed to parse midi tracks.");
    }
    setTempo(midiPlayer.tempo);
    const compositionByInstrumentFromMidi: CompositionByInstrument = {};
    const TICKS_PER_BEAT = 128 / 4;
    const newUserInstruments: UserInstrument[] = await Promise.all(
      [...midiTracks.map(
        async (track, index) => {
          const userInstrumentIndex = index;
          const sf2Sampler = (await getNewUserInstrument(audioContext, userInstrumentIndex)).sf2Sampler;
          let sf2InstrumentNameFromMidi: string | undefined;
          let sf2InstrumentVolume = DEFAULT_VOLUME;
          const notesForInstrument: JsonNoteData[] = [];
          const inProgressNotes: Record<number, JsonNoteData[]> = {}
          let userInstrumentName;
          // parse track into compositionByInstrument
          track.events.forEach((midiEvent) => {
            if (midiEvent.name === "Sequence/Track Name") {
              userInstrumentName = midiEvent.string;
            } else if (midiEvent.name === "Instrument Name") {
              sf2InstrumentNameFromMidi = midiEvent.string;
            } else if (midiEvent.name === "Set Tempo" && midiEvent.data) {
              setTempo(midiEvent.data);
            } else if (midiEvent.name === "Note on") {
              if (midiEvent.velocity) {
                sf2InstrumentVolume = midiEvent.velocity;
              }
              const midiNote = noteNameToMidi(midiEvent.noteName!)!;
              const midiBeat = Math.floor(midiEvent.tick / TICKS_PER_BEAT);
              const subdivisionType = midiEvent.tick % TICKS_PER_BEAT === 0 ? SubdivisionType.q : SubdivisionType.t;
              const newInProgressNote = [midiBeat, midiNote, 1, subdivisionType];
              if (midiNote in inProgressNotes) {
                inProgressNotes[midiNote].push(newInProgressNote);
              } else {
                inProgressNotes[midiNote] = [newInProgressNote];
              }
            } else if (midiEvent.name === "Note off") {
              const midiNote = noteNameToMidi(midiEvent.noteName!)!;
              const endMidiBeat = Math.floor(midiEvent.tick / TICKS_PER_BEAT);
              const subdivisionType = midiEvent.tick % TICKS_PER_BEAT === 0 ? SubdivisionType.q : SubdivisionType.t;
              if (midiNote in inProgressNotes) {
                // The (number | SubdivisionType)[] represents [midiBeat, midiNote, noteWidth, subdivision]
                let finishedInProgressNote = inProgressNotes[midiNote].splice(0, 1)[0];
                if (inProgressNotes[midiNote].length === 0) {
                  delete inProgressNotes[midiNote];
                }
                finishedInProgressNote = [
                  finishedInProgressNote[0], // start midiBeat, just copy over
                  finishedInProgressNote[1], // midiNote, just copy over
                  endMidiBeat - (finishedInProgressNote[0] as number), // noteWidth = end - start
                  finishedInProgressNote[3] === SubdivisionType.t || subdivisionType === SubdivisionType.t
                    ? SubdivisionType.t
                    : SubdivisionType.q
                ];
                notesForInstrument.push(finishedInProgressNote);
              } else {
                // nothing to be done, trying to end a note that doesn't exist ???
              }
            }
          });
          compositionByInstrumentFromMidi[index] = notesForInstrument;
          const sf2InstrumentIndex = sf2Sampler?.instrumentNames.findIndex((name) => name === sf2InstrumentNameFromMidi) ?? 0;
          const sf2InstrumentName = sf2Sampler?.instrumentNames[sf2InstrumentIndex];
          await sf2Sampler?.loadInstrument(sf2InstrumentName!);
          sf2Sampler!.output.volume = sf2InstrumentVolume;

          return {
            name: userInstrumentName ?? `ins${index+1}`,
            fileName: defaultSoundfontFileName,
            color: getNewInstrumentColor(index),
            // TODO(jaketrower): handle save/load with different .sf2s then the default !
            sf2InstrumentName,
            sf2InstrumentIndex,
            volume: DEFAULT_VOLUME,
            visible: true, 
            solo: false,
            sf2Sampler,
          }
    })]);
    setTimeSignature(TimeSignature.ts4_4);
    setUserInstruments(newUserInstruments);
    setUserInstrumentIndex(0);
    setHowManyInstrumentsIEverMade(newUserInstruments.length);
    setComposition(convertCompositionByInstrumentToComposition(compositionByInstrumentFromMidi), true);
    setPlayheadPosX(0);
    manuallyUpdateFarthestRightNoteEnd();
    setPristine(true);
    clearUndoStack();
  }, [audioContext, clearUndoStack, defaultSoundfontFileName, getNewUserInstrument, manuallyUpdateFarthestRightNoteEnd, setComposition, setHowManyInstrumentsIEverMade, setPlayheadPosX, setPristine, setTempo, setTimeSignature, setUserInstrumentIndex, setUserInstruments]);

  const onLoadSongFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target?.files?.[0]; 
      if (!file) {
        throw new Error("Failed to load file.");
      }
      const reader = new FileReader();
      if (file.name.includes(".json")) {
        reader.readAsText(file);
        reader.onload = readerEvent => {
          const jsonText = readerEvent.target?.result;
          if (typeof jsonText !== typeof '') {
            throw new Error("Failed to parse json file.");
          }
          handleLoadCompositionFromFileJson(JSON.parse(jsonText as string));
        }
      } else if (file.name.includes(".mid")) {
        const midiPlayer = new MidiPlayer.Player();
        setSongName(file.name.split(".mid").slice(0, -1).join(""));
        reader.readAsArrayBuffer(file);
        reader.onload = readerEvent => {
          const arrayBuffer = readerEvent.target?.result;
          if (!(arrayBuffer instanceof ArrayBuffer)) {
            throw new Error("Failed to parse file.");
          }
          midiPlayer.loadArrayBuffer(arrayBuffer);
          handleLoadCompositionFromFileMidi(midiPlayer);
        }
      }
    } catch (e) {
      console.log(e);
      alert("We tried, but failed, to read the file! See console for more details.");
    }
  }, [handleLoadCompositionFromFileJson, handleLoadCompositionFromFileMidi, setSongName]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  return (
    <>
      <SongHeaderContainer>
        <div><DancingBabyImg src="trans.png" $frame={babyDanceFrame} $yFrame={babyDanceYFrame} onClick={() => {
          incrementBabyDanceFrame();
          incrementBabyDanceYFrame();
          userInstrumentsRef.current[userInstrumentIndexRef.current].sf2Sampler?.start({ note: getARandomNote(), duration: 0.25 });
        }}/></div>
        <div style={{ display: 'flex', flexDirection: 'column', }}>
          <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 2 }}>
            <b style={{ marginLeft: 2, width: 32}}>Song Name</b>:
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
                <DivButton onClick={handleExportSongToMp3} style={{ padding: 2 }}>as 💽 MP3</DivButton>
              </div>
            </>)}</DivButton>
          <input id={`song-to-load`} type="file" accept=".mid,.json" onChange={onLoadSongFile} style={{ display: 'none' }} />
        </ActionButtonsContainer>
      </SongHeaderContainer>
    </>
  );
}