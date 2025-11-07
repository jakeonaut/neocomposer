import React, { ReactElement, useCallback, useMemo, useState } from 'react';
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
const pianoRollBeats = new Array(70);
pianoRollBeats.fill(0);

export function CompositionAndPlayhead({
  context,
  composition,
  userInstruments,
  userInstrumentIndex,
  handleUpdateCompositionAtBeatAndNote,
  playheadNode,
  playheadPosX
} : {
  context: AudioContext
  composition: Composition,
  userInstruments: Array<UserInstrument>,
  userInstrumentIndex: number,
  handleUpdateCompositionAtBeatAndNote: (midiBeat: number, midiNote: string) => void,
  playheadNode: ReactElement,
  playheadPosX: number,
}) {
  const currUserInstrument = useMemo(() => userInstruments[userInstrumentIndex], [userInstruments, userInstrumentIndex]);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | undefined>();
  const [startingCursorPos, setStartingCursorPos] = useState<CursorPosition | undefined>();
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: number, midiNote: string) => {
    setIsMouseDown(true);
    setCursorPosition({ midiNote, midiBeat });
    setStartingCursorPos({ midiNote, midiBeat });
    if (context.state === "suspended") { context.resume(); }
    currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 });
  }, [currUserInstrument, context]);
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: number, midiNote: string) => {
    setIsMouseDown(false);
    setCursorPosition(undefined);
    setStartingCursorPos(undefined);
    // TODO(jaketrower): do this with the window documnet too like handleKeyDown
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, midiBeat: number, midiNote: string) => {
    if (isMouseDown && cursorPosition && (cursorPosition.midiBeat !== midiBeat || cursorPosition.midiNote !== midiNote)) {
      setCursorPosition({ midiNote, midiBeat });
      if (midiNote !== cursorPosition.midiNote) {
        currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 });
      }
    }
  }, [isMouseDown, cursorPosition, currUserInstrument]);

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
      <div onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}>
      {pianoRollKeys.map((midiNote, y) => (
        <div style={{ display: 'flex', height: beatWidth-1 }}>
          <div key={midiNote} style={{ width: beatWidth*2, textAlign: 'left', userSelect: 'none' }}>{midiNote}</div>
          {pianoRollBeats.map((_, idx) => {
            const index = idx + 1;
            return (
              <div key={index} className='hoverable'
                style={{
                  position: 'relative',
                  borderLeft: `1px ${idx % 4 === 0 ? 'solid' : 'dashed'} ${idx % 16 === 0 ? 'black' : 'lightgray'}`,
                  borderTop: '1px dotted #b2bcc2',
                  borderBottom: midiNote[0] === 'C'
                    ? '1px solid #b2bcc2'
                    : y === pianoRollKeys.length - 1
                      ? '1px dashed #b2bcc2'
                      : 'unset',
                  borderRight: idx === pianoRollBeats.length - 1 ? '1px dashed #b2bcc2' : 'unset',
                  width: beatWidth-1,
                  cursor: 'pointer',
                }}
                onClick={(e) => handleNoteClick(e, index, midiNote) }
                onMouseDown={(e) => handleMouseDown(e, index, midiNote) }
                onMouseMove={(e) => handleMouseMove(e, index, midiNote) }
                onMouseUp={(e) => handleMouseUp(e, index, midiNote) }
              >
                {composition[index]?.[midiNote] !== undefined && (<div style={{
                  width: 15,
                  height: 14,
                  content: ' ',
                  backgroundColor: userInstruments[composition[index][midiNote]!.userInstrumentIndex]?.color ?? 'gray',
                  position: 'absolute',
                  left: 0,
                  zIndex: 1,
                  top: 0,
                  // border: '1px solid black',
                  borderRadius: 0,
                }} />)}
              </div>
            );
          })}
        </div>
      ))}
      </div>
    </div>
  );
}