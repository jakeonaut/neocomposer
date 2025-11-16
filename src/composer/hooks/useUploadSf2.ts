import React, { useCallback } from 'react';
import { SoundFont2 } from 'soundfont2';
import { Soundfont2Sampler } from '../smplr/soundfont2';

export function useUploadSf2({
  audioContext,
  onLoadSuccess,
} : {
  audioContext: AudioContext,
  onLoadSuccess: (sampler: Soundfont2Sampler, instrumentName: string) => void,
}) {
  const handleUploadSf2 = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO(jaketrower): need to stop/affect the composition play at this point? maybe that should be dynamic anyway
    const file = e.target?.files?.[0]; 
    if (!file) {
      console.log("Failed to load file.");
      return;
    }

    if (audioContext.state === "suspended") { audioContext.resume(); }

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = readerEvent => {
      const arrayBuffer = readerEvent.target?.result;
      console.log(arrayBuffer);
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        console.log("Failed to parse file.");
        return;
      }
      const buffer = new Uint8Array(arrayBuffer);

      const soundfont2Sampler = new Soundfont2Sampler(audioContext, {
        data: buffer,
        createSoundfont: (data) => new SoundFont2(data),
      })
      // This could be not async since I'm passing the Uint8Array directly into the options
      soundfont2Sampler.load.then((sampler) => {
        sampler.loadInstrument(sampler.instrumentNames[0]);
        onLoadSuccess(sampler, sampler.instrumentNames[0]);
      });
    }
  }, [audioContext, onLoadSuccess]);
  return handleUploadSf2;
}