import { Mp3Encoder, WavHeader } from "@breezystack/lamejs";

export function convertWav16ToMp3(wavBlob: Blob) {
  return new Promise((resolve: (blob: Blob) => void, reject) => {
    const reader = new FileReader();

    reader.onload = function () {
      const arrayBuffer = this.result;
      if (arrayBuffer === null || typeof arrayBuffer === "string") {
        reject("Result not found from file reader!");
        return;
      }

      // Create a WAV decoder
      const wavDecoder = WavHeader.readHeader(new DataView(arrayBuffer));

      // Get the WAV audio data as an array of samples
      const wavSamples = new Int16Array(arrayBuffer as ArrayBuffer, wavDecoder.dataOffset, wavDecoder.dataLen / 2);

      // Create an MP3 encoder
      const mp3Encoder = new Mp3Encoder(1, wavDecoder.sampleRate * 2, 192);

      // Encode the WAV samples to MP3
      const mp3Buffer = mp3Encoder.encodeBuffer(wavSamples);

      // Finalize the MP3 encoding
      const mp3Data = mp3Encoder.flush();

      // Combine the MP3 header and data into a new ArrayBuffer
      const mp3BufferWithHeader = new Uint8Array(mp3Buffer.length + mp3Data.length);
      mp3BufferWithHeader.set(mp3Buffer, 0);
      mp3BufferWithHeader.set(mp3Data, mp3Buffer.length);

      // Create a Blob from the ArrayBuffer
      const mp3Blob = new Blob([mp3BufferWithHeader], { type: 'audio/mp3' });

      resolve(mp3Blob);
    };

    reader.onerror = function (error) {
      reject(error);
    };

    // Read the input blob as an ArrayBuffer
    reader.readAsArrayBuffer(wavBlob);
  });
}

export function encodeMp3(audioBuffer: AudioBuffer) {
  // Create an MP3 encoder
  const mp3Encoder = new Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, 128);

  const left = new Int16Array(audioBuffer.getChannelData(0));
  const right = audioBuffer.numberOfChannels > 1 ? new Int16Array(audioBuffer.getChannelData(1)) : undefined;
  // Encode the WAV samples to MP3
  const mp3Buffer = mp3Encoder.encodeBuffer(left, right);

  // Finalize the MP3 encoding
  const mp3Data = mp3Encoder.flush();

  // Combine the MP3 header and data into a new ArrayBuffer
  const mp3BufferWithHeader = new Uint8Array(mp3Buffer.length + mp3Data.length);
  mp3BufferWithHeader.set(mp3Buffer, 0);
  mp3BufferWithHeader.set(mp3Data, mp3Buffer.length);

  // Create a Blob from the ArrayBuffer
  return new Blob([mp3BufferWithHeader], { type: 'audio/mp3' });
};