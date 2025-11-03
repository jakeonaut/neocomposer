import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import { Soundfont2Sampler } from './smplr/soundfont2'
import { SoundFont2 } from "soundfont2";

function App() {
  const [context] = useState(new AudioContext());
  const [sf2Sampler, setSf2Sampler] = useState<Soundfont2Sampler | undefined>();
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) { return; }

    const pianoKeys = new Map(Object.entries({
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
    const playedNote = pianoKeys.has(e.key) ? pianoKeys.get(e.key) : undefined;
    console.log(playedNote);
    if (!sf2Sampler || !playedNote) { return; }
    sf2Sampler.start({ note: playedNote, time: context.currentTime, duration: 0.25 });
  }, [sf2Sampler]);
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);
  const onUploadSf2 = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
            soundfont2Sampler.start({ note, time: now + i * duration, duration });
          });
        });
        setSf2Sampler(soundfont2Sampler);
    }
  }, []);

  return (
    <div className="App">
      <label>Choose soundfont2: </label>
      <input type="file" accept=".sf2" onChange={onUploadSf2} />
      {sf2Sampler && (<>
        <label>Select instrument: </label>
        <select onChange={((e) => {
          sf2Sampler.loadInstrument(e.target.value);
        })}>
          {sf2Sampler.instrumentNames.map((name) => <option value={name}>{name}</option>)}
        </select>
      </>)}
    </div>
  );
}

export default App;
