import React, { ReactElement, useCallback } from 'react';
import { Composition, MidiNote, OctavelessMidiNote, UserInstrument } from './useComposition';

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
const pianoRollBeats = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];

export function CompositionAndPlayhead({ composition, userInstruments, handleUpdateCompositionAtBeatAndNote, playheadNode, playheadPosX } : {
  composition: Composition,
  userInstruments: Array<UserInstrument | undefined>,
  handleUpdateCompositionAtBeatAndNote: (midiBeat: number, midiNote: string) => void,
  playheadNode: ReactElement,
  playheadPosX: number,
}) {
  const handleNoteClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: number, midiNote: string) => {
    e.preventDefault();
    e.stopPropagation();
    handleUpdateCompositionAtBeatAndNote(midiBeat, midiNote);
  }, [handleUpdateCompositionAtBeatAndNote]);

  const beatWidth = 16;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', height: beatWidth }}>
        <div key="empty" style={{ width: beatWidth*2}}>&nbsp;</div>
        {pianoRollBeats.map((beat) => (
          <div key={beat} style={{ width: beatWidth, textAlign: 'left', }}>
            {playheadPosX === beat ? playheadNode : ' '}
          </div>
        ))}
      </div>
      {pianoRollKeys.map((midiNote) => (
        <div style={{ display: 'flex', height: beatWidth }}>
          <div key={midiNote} style={{ width: beatWidth*2, textAlign: 'left'}}>{midiNote}</div>
          {pianoRollBeats.map((midiBeat) => (
            <div key={midiBeat} className='hoverable'
              style={{
                outline: '1px dashed lightgray',
                width: beatWidth,
                cursor: 'pointer',
                ...(composition[midiBeat]?.[midiNote] !== undefined ? {
                  backgroundColor: userInstruments[composition[midiBeat][midiNote]!.userInstrumentIndex]?.color ?? 'gray',
                }  : {}),
              }}
              onClick={(e) => handleNoteClick(e, midiBeat, midiNote) }/>
          ))}
        </div>
      ))}
    </div>
  );
}