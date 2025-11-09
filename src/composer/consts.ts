import { SampleStart } from "../smplr/player/types";
import { Soundfont2Sampler } from "../smplr/soundfont2";

export const sf2DefaultColours = [
  "#f1ad85ff",
  "#87b8a4ff",
  "#85c9f1ff",
  "#eae4a1ff",
  "#cdb3d7ff",
];

export type UserInstrument = {
  name: string;
  color: string;
  sf2Sampler: Soundfont2Sampler | undefined;
  sf2InstrumentName: string | undefined;
  volume: number;
};
export type MidiNote = string;
export type OctavelessMidiNote = string;
export type MidiBeat = number;
export type NoteId = number;
export type InstrumentInstruction = {
  noteId: number;
  userInstrumentIndex: number;
  noteWidth: number;
  sampleStart: SampleStart;
};
export type Composition = {
  [id: MidiBeat]: {
    [id: MidiNote]: {
      [id: NoteId]: InstrumentInstruction;
    }
  };
};
export type Song = {
  composition: Composition;
  volume: number; // 0 - 127
  tempo: number; // 20 - 200
};
