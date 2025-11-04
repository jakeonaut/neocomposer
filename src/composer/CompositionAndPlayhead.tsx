import React, { ReactElement, useCallback } from 'react';
import { Composition, MidiNote, UserInstrument } from './useComposition';

const pianoRollKeys: MidiNote[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'].reverse();
const pianoRollBeats = [1, 2, 3, 4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];

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

  const beatWidth = 32;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex' }}>
        <div key="empty" style={{ width: beatWidth}}>&nbsp;</div>
        {pianoRollBeats.map((beat) => (
          <div key={beat} style={{ width: beatWidth, textAlign: 'left', }}>
            {playheadPosX === beat ? playheadNode : ' '}
          </div>
        ))}
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