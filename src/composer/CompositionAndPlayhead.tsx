import React, { ReactElement, useCallback, useState } from 'react';
import { Composition, MidiBeat, MidiNote, OctavelessMidiNote, UserInstrument } from './consts';

type CursorPosition = { midiNote: MidiNote, midiBeat: MidiBeat };
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
  userInstrumentIndex,
  handleUpdateCompositionAtBeatAndNote,
  playheadNode,
  playheadPosX
} : {
  composition: Composition,
  userInstruments: Array<UserInstrument>,
  userInstrumentIndex: number,
  handleUpdateCompositionAtBeatAndNote: (midiBeat: number, midiNote: string) => void,
  playheadNode: ReactElement,
  playheadPosX: number,
}) {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | undefined>();
  const [startingCursorPos, setStartingCursorPos] = useState<CursorPosition | undefined>();
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: number, midiNote: string) => {
    setIsMouseDown(true);
    setCursorPosition({ midiNote, midiBeat });
    setStartingCursorPos({ midiNote, midiBeat });
  }, []);
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: number, midiNote: string) => {
    setIsMouseDown(false);
    setCursorPosition(undefined);
    setStartingCursorPos(undefined);
    // TODO(jaketrower): do this with the window documnet too like handleKeyDown
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: number, midiNote: string) => {
    if (isMouseDown && cursorPosition && (cursorPosition.midiBeat !== midiBeat || cursorPosition.midiNote !== midiNote)) {
      setCursorPosition({ midiNote, midiBeat });
    }
  }, [isMouseDown, cursorPosition]);

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
      {pianoRollKeys.map((midiNote, y) => (
        <div style={{ display: 'flex', height: beatWidth-1 }}>
          <div key={midiNote} style={{ width: beatWidth*2, textAlign: 'left'}}>{midiNote}</div>
          {pianoRollBeats.map((_, idx) => {
            const index = idx + 1;
            return (
              <div key={index} className='hoverable'
                style={{
                  borderLeft: `2px ${idx % 4 === 0 ? 'solid' : 'dotted'} ${idx % 16 === 0 ? 'gray' : 'lightgray'}`,
                  borderTop: '2px dotted lightgray',
                  borderBottom: midiNote[0] === 'C'
                    ? '2px solid lightgray'
                    : y === pianoRollKeys.length - 1
                      ? '2px dotted lightgray'
                      : 'unset',
                  borderRight: idx === pianoRollBeats.length - 1 ? '2px dotted lightgray' : 'unset',
                  width: beatWidth-1,
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