import { toMidi } from "../smplr/player/midi";
import { SampleStart } from "../smplr/player/types";
import { Soundfont2Sampler } from "../smplr/soundfont2";

export const zIndex_placedNote = 1;
export const zIndex_rectSelect = 2;

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
export type MidiNoteNum = number;
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
    [id: MidiNoteNum]: {
      [id: NoteId]: InstrumentInstruction;
    }
  };
};
type Bounds = { left: number, right: number, top: number, bottom: number };
export function getPlacedNotesFromComposition(composition: Composition, bounds?: Bounds) {
  const allPlacedNotes: InstrumentInstruction[] = [];
  if (bounds) {
    for (let x = bounds.left; x < bounds.right + 1; x++) {
      for (let y = bounds.top; y < bounds.bottom + 1; y++) {
        if (composition[x]?.[y]) {
          allPlacedNotes.push(...Object.values(composition[x][y]));
        }
      }
    }
  } else {
    Object.entries(composition).forEach(([_, column]) => {
      Object.entries(column).forEach(([_, allPlacedNotesStartingHere]) => {
        Object.values(allPlacedNotesStartingHere).forEach((placedNote) => {
          allPlacedNotes.push(placedNote);
        });
      });
    });
  }
  return allPlacedNotes;
}
export type Song = {
  composition: Composition;
  volume: number; // 0 - 127
  tempo: number; // 20 - 200
};
export enum InputMode {
  DEFAULT = "default",
  SELECT = "select"
}