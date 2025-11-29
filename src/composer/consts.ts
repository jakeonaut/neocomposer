import { createContext } from "react";
import { Soundfont2Sampler } from "../smplr/soundfont2";

export const zIndex_placedNote = 1;
export const zIndex_selectedNote = 2;
export const zIndex_rectSelect = 2;
export const zIndex_clickedNote = 3;

export const sf2DefaultColours = [
  "#f1ad85",
  "#87b8a4",
  "#85c9f1",
  "#eae4a1",
  "#cdb3d7",
  "#9b9b9b",
];

const fullOctave: OctavelessMidiNote[] = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
export const pianoRollKeys: MidiNote[] = [];
[3, 4].forEach((octave) =>
  fullOctave.forEach((note: OctavelessMidiNote) =>
    pianoRollKeys.push(`${note}${octave}`)
  )
);
pianoRollKeys.push(...["C5", "Db5", "D5", "Eb5", "E5", "F5"]);
pianoRollKeys.reverse();
export const beatHeight = 15;
export const pianoRollBeats: number[] = new Array(160);
pianoRollBeats.fill(0);

export const keyboardPianoKeys = new Map(
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

const majorKeyboardPianoKeys = new Map(
  Object.entries({
    a: "C4",
    s: "D4",
    d: "E4",
    f: "F4",
    g: "G4",
    h: "A4",
    j: "B4",
    k: "C5",
  })
);

export function getARandomNote() {
  const notes = Array.from(majorKeyboardPianoKeys, ([_, value]) => value ); 
  return notes[Math.floor(Math.random() * notes.length)];
}

export function getARandomDischordantNote() {
  const notes = Array.from(keyboardPianoKeys, ([_, value]) => value ); 
  return notes[Math.floor(Math.random() * notes.length)];
}

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
export enum SubdivisionType { q ='q', t = 't' };
export type InstrumentInstruction = {
  noteId: number;
  userInstrumentIndex: number;
  noteWidth: number; // NoteWidth is in units of SubdivisionType...
  midiBeat: MidiBeat; // MidiBeat is in units of SubdivisionType...
  midiNote: MidiNoteNum;
  subdivisionType: SubdivisionType,
};
export type Offset = { x: number, y: number };
export type NoteIdWithOffset = { offset: Offset };
export type Composition = {
  [id: MidiBeat]: {
    [id: MidiNoteNum]: {
      [id: NoteId]: InstrumentInstruction;
    }
  };
};
// The (number | SubdivisionType)[] represents [measure, note, subdivision, midiNote, noteWidth]
// useful to represent as an array in the exported json for brevity
export type CompositionByInstrument = Record<NoteId, (number | SubdivisionType)[][]>;
export type SongJsonExport = {
  songName: string,
  tempo: number,
  userInstruments: Omit<UserInstrument, 'sf2Sampler'>[],
  composition: CompositionByInstrument
}
type Bounds = { left: number, right: number, top: number, bottom: number };
export function getPlacedNotesFromComposition(composition: Composition, bounds?: Bounds) {
  const allPlacedNotes: { [id: NoteId]: InstrumentInstruction } = {};
  const compositionByMidiNote = Object.values(composition).reduce((acc, column) => {
    Object.entries(column).forEach(([midiNote, instrumentInstructions]) => {
      const midiNoteNum = parseInt(midiNote);
      if (!acc[midiNoteNum]) { acc[midiNoteNum] = {} }
      acc[midiNoteNum] = {
        ...instrumentInstructions,
        ...acc[midiNoteNum],
      };
    });
    return acc;
  }, {} as { [id: MidiNoteNum]: { [id: NoteId]: InstrumentInstruction }});
 
  if (bounds) {
    for (let y = bounds.top; y < bounds.bottom + 1; y++) {
      if (!compositionByMidiNote[y]) continue;
      Object.values(compositionByMidiNote[y]).forEach((note) => {
        if ((bounds.left <= note.midiBeat + note.noteWidth - 1 && bounds.left >= note.midiBeat)
           || (bounds.right >= note.midiBeat && bounds.right <= note.midiBeat + note.noteWidth - 1)
           || (bounds.left <= note.midiBeat && bounds.right >= note.midiBeat + note.noteWidth - 1)) {
          allPlacedNotes[note.noteId] = note;
        }
      });
    }
  } else {
    Object.values(compositionByMidiNote).forEach((instrumentInstructions) => {
      Object.values(instrumentInstructions).forEach((note) => {
        allPlacedNotes[note.noteId] = note;
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

export const AudioContextContext = createContext<AudioContext | undefined>(undefined);