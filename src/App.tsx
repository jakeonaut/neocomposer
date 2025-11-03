import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { Soundfont2Sampler } from './smplr/soundfont2'
import { SoundFont2 } from "soundfont2";
import { SampleStart } from './smplr/player/types';

const keyboardPianoKeys = new Map(Object.entries({
  'a': 'C4',
  's': 'D4',
  'd': 'E4',
  'f': 'F4',
  'g': 'G4',
  'h': 'A4',
  'j': 'B4',
  'k': 'C5',
  'l': 'D5',
  ';': 'E5',
  "'": 'F5',
}));

type MidiNote = string;
type MidiBeat = number;
type Composition = {
  [id: MidiBeat]: {
    [id: MidiNote]: SampleStart | undefined
  }
}
const pianoRollKeys: MidiNote[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'].reverse();
const pianoRollBeats = [1, 2, 3, 4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];

function App() {
  const [context] = useState(new AudioContext());
  const [sf2Sampler, setSf2Sampler] = useState<Soundfont2Sampler | undefined>();
  const [babyDanceFrame, setBabyDanceFrame] = useState(0);
  const [composition, setComposition] = useState<Composition>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const handlePlayComposition = useCallback(() => {
    if (!sf2Sampler) return;
    const beatLengthInSeconds = 0.25;
    const now = context.currentTime;
    Object.entries(composition).forEach(([beatStr, beatNotes]) => {
      const beat = parseFloat(beatStr) - 1;
      Object.values(beatNotes).forEach((sampler) => {
        if (!sampler) return;
        sf2Sampler.start({
          note: sampler.note,
          time: now + beat*beatLengthInSeconds,
          duration: sampler.duration,
          onStart: () => {
            setBabyDanceFrame((prev) => prev < 3 ? prev+1 : 0);
          }
        });
      });
    });
    setIsPlaying(true);
  }, [sf2Sampler, composition]);
  const handleStopComposition = useCallback(() => {
    sf2Sampler?.stop();
    setIsPlaying(false);
  }, [sf2Sampler]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) { return; }

    const playedNote = keyboardPianoKeys.has(e.key) ? keyboardPianoKeys.get(e.key) : undefined;
    if (!sf2Sampler || !playedNote) { return; }
    sf2Sampler.start({ note: playedNote, time: context.currentTime, duration: 0.25 });
    setBabyDanceFrame((prev) => prev < 3 ? prev+1 : 0);
  }, [sf2Sampler]);
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);
  const onUploadSf2 = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO(jaketrower): need to stop the composition play at this point? maybe not.
    const file = e.target?.files?.[0]; 
    if (!file) {
      console.log("Failed to load file.");
      return;
    }

    if (context.state === "suspended") {
      context.resume();
    }

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = readerEvent => {
        const arrayBuffer = readerEvent.target?.result;
        if (!(arrayBuffer instanceof ArrayBuffer)) {
          console.log("Failed to parse file.");
          return;
        }
        const buffer = new Uint8Array(arrayBuffer);

        const soundfont2Sampler = new Soundfont2Sampler(context, {
          data: buffer,
          createSoundfont: (data) => new SoundFont2(data),
        })
        // This could be not async since I'm passing the Uint8Array directly into the options
        soundfont2Sampler.load.then(() => {
          soundfont2Sampler.loadInstrument(soundfont2Sampler.instrumentNames[0]);
          const now = context.currentTime;
          ["C4", "E4", "G4", "C5"].forEach((note, i) => {
            const duration = 0.25;
            soundfont2Sampler.start({ note, time: now + i * duration, duration, onStart: () => {setBabyDanceFrame((prev) => prev < 3 ? prev+1 : 0);} });
          });
        });
        setSf2Sampler(soundfont2Sampler);
    }
  }, []);

  const beatWidth = 32;
  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', height: '100%', }}>
      <div style={{ display: "flex", gap: 4, outline: '1px solid black', backgroundColor: '#8cb4b0', margin: 2,}}>
        <div>
          <img src="trans.png" style={{
            margin: "6px 8px 10px 10px",
            width: 20,
            height: 20,
            imageRendering: 'pixelated',
            transform: 'scale(2.0)',
            backgroundImage: "url('baby_dance_sheet.png')",
            backgroundPosition: `${babyDanceFrame*-20}px 0px`,
          }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', }}>
          <label htmlFor="sf-uploader">Choose soundfont2: </label>
          <input id="sf-uploader" type="file" accept=".sf2" onChange={onUploadSf2} />
          {sf2Sampler && (<>
            <label htmlFor="sf-instrument-select">Select instrument: </label>
            <select id="sf-instrument-select" onChange={((e) => {
              sf2Sampler.loadInstrument(e.target.value);
            })}>
              {sf2Sampler.instrumentNames.map((name) => <option value={name} key={name}>{name}</option>)}
            </select>
            <span> * Play with: </span><pre>asdfjkl;wetyuop</pre>
          </>)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div></div>
        <div style={{ display: 'flex', }}>
          <div key="empty" style={{ width: beatWidth}}>&nbsp;</div>
          {pianoRollBeats.map((beat) => (<div key={beat} style={{ width: beatWidth}}>{beat}</div>))}
        </div>
        {pianoRollKeys.map((midiNote) => (
          <div style={{ display: 'flex' }}>
            <div key={midiNote} style={{ width: beatWidth}}>{midiNote}</div>
            {pianoRollBeats.map((midiBeat) => (
              <div key={midiBeat} className='hoverable'
                style={{
                  outline: '1px solid lightgray',
                  width: beatWidth,
                  cursor: 'pointer',
                  ...(composition[midiBeat]?.[midiNote] !== undefined ? {backgroundColor: '#8cb4b0'}  : {}),
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setComposition((prev) => {
                    if (!prev[midiBeat]) {
                      prev[midiBeat] = {};
                    }
                    console.log("this:", prev[midiBeat][midiNote]);
                    if (prev[midiBeat][midiNote]) {
                      delete prev[midiBeat][midiNote];
                    } else {
                      prev[midiBeat][midiNote] = { note: midiNote, duration: 0.25 };
                    }
                    return {...prev};
                  })
                }}/>
            ))}
          </div>
        ))}
      </div>
      {isPlaying
        ? <div style={{ fontSize: 32, cursor: 'pointer', }} onClick={handleStopComposition}>⏹️</div>
        : <div style={{ fontSize: 32, cursor: 'pointer', }} onClick={handlePlayComposition}>▶️</div>
      }
    </div>
  );
}

export default App;
