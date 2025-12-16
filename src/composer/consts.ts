import { createContext } from "react";
import { Soundfont2Sampler } from "../smplr/soundfont2";
import { globals } from "./globals";

export const zIndex_placedNote = 1;
export const zIndex_selectedNote = 2;
export const zIndex_rectSelect = 2;
export const zIndex_clickedNote = 3;
export const zIndex_playhead = 4;
export const zIndex_resetPlayheadButton = 5;

export const lightColor = '#b2bcc2'; // 'rgba(17, 156, 238, 0.25)';
export const mediumColor = '#b2bcc2'; // 'rgba(17, 156, 238, 0.5)'
export const veryLightColor = '#ced8e0ff'; //"rgba(17, 156, 238, 0.12)";

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
[1, 2, 3, 4, 5, 6].forEach((octave) =>
  fullOctave.forEach((note: OctavelessMidiNote) =>
    pianoRollKeys.push(`${note}${octave}`)
  )
);
pianoRollKeys.push(...["C7", "Db7", "D7", "Eb7", "E7", "F7"]);
pianoRollKeys.reverse();
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
export enum TimeSignature { ts4_4 = '4_4', ts3_4 = '3_4' };
export type InstrumentInstruction = {
  noteId: number;
  userInstrumentIndex: number;
  noteWidth: number; // NoteWidth is in units of SubdivisionType...
  midiBeat: MidiBeat; // MidiBeat is in units of SubdivisionType...
  midiNote: MidiNoteNum;
  subdivisionType: SubdivisionType,
};
export function isNoteEqual(a: InstrumentInstruction, b: InstrumentInstruction) {
  return a.noteId === b.noteId
    && a.userInstrumentIndex === b.userInstrumentIndex
    && a.noteWidth === b.noteWidth
    && a.midiBeat === b.midiBeat
    && a.midiNote === b.midiNote
    && a.subdivisionType === b.subdivisionType;
}
export type Offset = { x: number, y: number };
export type NoteIdWithOffset = { offset: Offset };
export type InstrumentInstructionWithOffset = { instrumentInstruction: InstrumentInstruction, offset: Offset };
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
  composition: CompositionByInstrument,
  timeSignature: TimeSignature,
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
export type CursorPosition = { midiNote: MidiNoteNum; midiBeat: MidiBeat; };

export const AudioContextContext = createContext<AudioContext | undefined>(undefined);

export type PlayheadBounds = { start: Offset['x'], end?: Offset['x'] };

export function getMidiBeatFromGridBeat(gridBeat: MidiBeat, subdivisionType: SubdivisionType, noteSubdivisionType: SubdivisionType, roundUpInstead: boolean = false) {
  let midiBeat = gridBeat;
  if (subdivisionType === SubdivisionType.t) {
    if (noteSubdivisionType === SubdivisionType.q) {
      midiBeat = Math.round((4 * (gridBeat - 1) / 3) + 1);
    } else if (noteSubdivisionType === SubdivisionType.t) {
      const offset = (gridBeat - 1) % 3;
      const whichQuarterNote = Math.floor((gridBeat - 1) / 3.0);
      const roundingUpOffset = roundUpInstead && offset === 2 ? 1 : 0;
      midiBeat = whichQuarterNote * 4 + offset + 1 + roundingUpOffset;
    }
  } else if (subdivisionType === SubdivisionType.q && noteSubdivisionType === SubdivisionType.t) {
    const currOffset = (gridBeat - 1) % 4;
    const newOffset = Math.min(currOffset, 2);
    midiBeat = midiBeat - currOffset + newOffset;
  }
  // If subdivisionType === SubdivisionType.q && noteSubdivisionType === SubdivisionType.q, don't need to do anything
  return midiBeat;
}

export function getGridBeatFromMidiBeat(midiBeat: MidiBeat, subdivisionType: SubdivisionType) { // , noteSubdivisionType: SubdivisionType) {
  let gridBeat = midiBeat;
  if (subdivisionType === SubdivisionType.t) {
    const offset = midiBeat % 4;
    gridBeat = (Math.floor((midiBeat - 1) / 4) * 3) + offset;
    // if (noteSubdivisionType === SubdivisionType.q && offset === 0) {
    //   gridBeat += 3;
    // }
  }
  return gridBeat;
}

// TODO(jaketrower): ruh roh! it won't work with the scrolling sizes..
export function getRelativeBeatWidth(subdivisionType: SubdivisionType, baseBeatWidth: number) {
  switch(subdivisionType) {
    case SubdivisionType.q:
      return baseBeatWidth;
    case SubdivisionType.t:
      return (baseBeatWidth * 4.0) / 3.0;
    default:
      const exhaustiveCheck: never = subdivisionType;
      throw new Error(`Unhandled subdivision type: ${exhaustiveCheck}`);
  }
}

export function convertCompositionToCompositionByInstrument(composition: Composition) {
  const compositionByInstrument: CompositionByInstrument = {};
  Object.entries(composition).forEach(([_, row]) => {
    Object.entries(row).forEach(([_, instructions]) => {
      Object.values(instructions).forEach((instruction) => {
        if (!compositionByInstrument[instruction.userInstrumentIndex]) {
          compositionByInstrument[instruction.userInstrumentIndex] = [];
        }
        compositionByInstrument[instruction.userInstrumentIndex].push([
          instruction.midiBeat,
          instruction.midiNote,
          instruction.noteWidth,
          instruction.subdivisionType,
        ]);
      });
    });
  });
  return compositionByInstrument;
}

export const DEFAULT_BEAT_WIDTH = 15;
export const DEFAULT_BEAT_HEIGHT = 15;

export function getStartOfMeasureFromBeat(beat: MidiBeat, timeSignature: TimeSignature) {
  const timeSignatureVal = timeSignature === TimeSignature.ts4_4 ? 4 : 3;
  const measureBeatMultiplier = 4 * timeSignatureVal;
  return Math.floor(beat / measureBeatMultiplier) * measureBeatMultiplier
}

export function getEndOfMeasureFromBeat(beat: MidiBeat, timeSignature: TimeSignature) {
  const timeSignatureVal = timeSignature === TimeSignature.ts4_4 ? 4 : 3;
  const measureBeatMultiplier = 4 * timeSignatureVal;
  return Math.ceil((beat + 1) / measureBeatMultiplier) * measureBeatMultiplier;
}

export function getEndOfMeasureToLoopAtBeat(
  farthestRightNoteEnd: number, 
  timeSignature: TimeSignature,
  userPlayheadBounds: PlayheadBounds | undefined,
) {
  const timeSignatureVal = timeSignature === TimeSignature.ts4_4 ? 4 : 3;
  const measureBeatMultiplier = 4 * timeSignatureVal;
  return (
    Math.max(Math.ceil(
      Math.max(
        (farthestRightNoteEnd - 1),
        (userPlayheadBounds?.start ?? 0) + 1,
      ) / measureBeatMultiplier
    ), 1) * measureBeatMultiplier
  );
}

export function convertCompositionByInstrumentToComposition(compositionByInstrument: CompositionByInstrument) {
  globals.instructionId = 0;
  const composition: Composition = {};
  Object.entries(compositionByInstrument).forEach(([userInstrumentIndex, instructions]) => {
    instructions.forEach((instruction) => {
      const midiBeat = instruction[0] as number;
      const midiNote = instruction[1] as number;
      const noteWidth = instruction[2] as number;
      const subdivisionType = instruction[3] as SubdivisionType || 'q';
      const newInstruction: InstrumentInstruction = {
        noteId: ++globals.instructionId,
        userInstrumentIndex: parseInt(userInstrumentIndex),
        midiBeat,
        midiNote,
        noteWidth,
        subdivisionType,
      }
      if (!composition[midiBeat]) composition[midiBeat] = {};
      if (!composition[midiBeat][midiNote]) composition[midiBeat][midiNote] = {};
      composition[midiBeat][midiNote][newInstruction.noteId] = newInstruction;
    });
  });
  return composition;
};

export function getBeatLengthInMs(tempo: number) {
  const bpm = tempo;
  const bps = bpm / 60.0;
  const nthNoteDivision = 4.0;
  const nthNotesPerSec = bps * nthNoteDivision;
  const beatLengthInSeconds = 1 / nthNotesPerSec;
  return beatLengthInSeconds * 1000;
}

export function playCompositionNotesAtBeat({
    composition,
    tempo,
    midiBeat,
    userInstruments,
    audioContext,
    incrementBabyDanceFrame,
  } : {
    composition: Composition,
    tempo: number
    midiBeat: number
    userInstruments: UserInstrument[],
    audioContext: AudioContext,
    incrementBabyDanceFrame: () => void,
  }) {
  const beatLengthInSeconds = getBeatLengthInMs(tempo) / 1000;
  const now = audioContext.currentTime;
  if (composition[midiBeat]) {
    Object.values(composition[midiBeat]).forEach((midiNoteInstructions) => 
      Object.values(midiNoteInstructions).forEach((instrumentInstruction) => {
        const { midiNote } = instrumentInstruction;
        // TODO(jaketrower): in order to achieve ^^, will need playhead to instantiate sampler play at runtime,
        // rather than preprogram them all at PLAY button press...
        const userInstrumentToPlay =
          userInstruments[instrumentInstruction.userInstrumentIndex];
        if (!userInstrumentToPlay?.sf2Sampler) return;
        const durationSec = beatLengthInSeconds * instrumentInstruction.noteWidth;
        const tripletBeatOffsetInSeconds = instrumentInstruction.subdivisionType === SubdivisionType.q
          ? 0
          : ((midiBeat - 1) % 4) * beatLengthInSeconds * ((beatLengthInSeconds * 4.0) / 3.0);
        userInstrumentToPlay.sf2Sampler.start({
          note: midiNote,
          time: now + tripletBeatOffsetInSeconds,
          duration: durationSec,
          onStart: () => incrementBabyDanceFrame()
        });
      })
    );
  }
}