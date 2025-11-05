import React, { ReactElement, useCallback } from 'react';
import { Composition, MidiNote, OctavelessMidiNote, UserInstrument } from './consts';

const fullOctave: OctavelessMidiNote[] = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'
];
const pianoRollKeys: MidiNote[] = [];
[3,4].forEach(
  (octave) => fullOctave.forEach(
    (note: OctavelessMidiNote) => pianoRollKeys.push(`${note}${octave}`)
  )
);
pianoRollKeys.push('C5');
pianoRollKeys.reverse();
const beatWidth = 16;
const pianoRollBeats = new Array(40);
pianoRollBeats.fill(0);

export function CompositionAndPlayhead({
  composition,
  userInstruments,
  handleUpdateCompositionAtBeatAndNote,
  playheadNode,
  playheadPosX
} : {
  composition: Composition,
  userInstruments: Array<UserInstrument>,
  handleUpdateCompositionAtBeatAndNote: (midiBeat: number, midiNote: string) => void,
  playheadNode: ReactElement,
  playheadPosX: number,
}) {
  const handleNoteClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: number, midiNote: string) => {
    e.preventDefault();
    e.stopPropagation();
    handleUpdateCompositionAtBeatAndNote(midiBeat, midiNote);
  }, [handleUpdateCompositionAtBeatAndNote]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', height: beatWidth }}>
        <div key="empty" style={{ width: beatWidth*2}}>&nbsp;</div>
        {pianoRollBeats.map((_, idx) => {
          const index = idx + 1;
          return (
            <div key={index} style={{ width: beatWidth, textAlign: 'left', }}>
              {playheadPosX === index ? playheadNode : ' '}
            </div>
          );
        })}
      </div>
      {pianoRollKeys.map((midiNote) => (
        <div style={{ display: 'flex', height: beatWidth }}>
          <div key={midiNote} style={{ width: beatWidth*2, textAlign: 'left'}}>{midiNote}</div>
          {pianoRollBeats.map((_, idx) => {
            const index = idx + 1;
            return (
              <div key={index} className='hoverable'
                style={{
                  outline: '1px dashed lightgray',
                  width: beatWidth,
                  cursor: 'pointer',
                  ...(composition[index]?.[midiNote] !== undefined ? {
                    backgroundColor: userInstruments[composition[index][midiNote]!.userInstrumentIndex]?.color ?? 'gray',
                  }  : {}),
                }}
                onClick={(e) => handleNoteClick(e, index, midiNote) }/>
            );
          })}
        </div>
      ))}
    </div>
  );
}