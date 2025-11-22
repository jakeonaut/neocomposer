import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioContextContext,
  getPlacedNotesFromComposition,
  InputMode,
  InstrumentInstruction,
  InstrumentInstructionWithOffset,
  MidiBeat,
  MidiNote,
  MidiNoteNum,
  OctavelessMidiNote,
  SubdivisionType,
  zIndex_rectSelect,
} from "./consts";
import styled from "styled-components";
import { toMidi } from "../smplr/player/midi";
import { PlacedNote } from "./PlacedNote";
import { CompositionContext } from "./contexts/CompositionContextProvider";
import { UserInstrumentContext } from "./contexts/UserInstrumentContextProvider";
import { SongSettingsContext } from "./contexts/SongSettingsContextProvider";

type CursorPosition = { midiNote: MidiNoteNum; midiBeat: MidiBeat; };
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
const pianoRollKeys: MidiNote[] = [];
[3, 4].forEach((octave) =>
  fullOctave.forEach((note: OctavelessMidiNote) =>
    pianoRollKeys.push(`${note}${octave}`)
  )
);
pianoRollKeys.push(...["C5", "Db5", "D5", "Eb5", "E5", "F5"]);
pianoRollKeys.reverse();
const beatHeight = 15;
const pianoRollBeats: number[] = new Array(70);
pianoRollBeats.fill(0);

const GridCell = styled.div<{
  $idx: number,
  $pianoRollBeats: number[],
  $subdivision: SubdivisionType,
  $midiNote: string,
  $pianoRollKeys: string[],
  $beatWidth: number,
}>`
  position: relative;
  cursor: pointer;
  border-top: 1px ${({ $midiNote, $pianoRollKeys }) => $midiNote === $pianoRollKeys[0] || ($midiNote[0] === "B" && $midiNote[1] !== 'b')
    ? 'solid #b2bcc2'
    : 'dotted #b2bcc2'};
  width: ${({ $beatWidth }) => `${$beatWidth - 1}px`};
  min-width: ${({ $beatWidth }) => `${$beatWidth - 1}px`};
  border-left: ${({ $idx, $subdivision }) => `1px ${
    $idx % ($subdivision === SubdivisionType.q ? 4 : 3) === 0 ? "solid" : "dashed"
  } ${
    $idx % ($subdivision === SubdivisionType.q ? 16 : 12) === 0
      ? "black"
      : $idx % ($subdivision === SubdivisionType.q ? 4 : 3) === 0
        ? "#b2bcc2"
        : "#ced8e0ff"
  }`};
  border-bottom: ${({ $midiNote, $pianoRollKeys }) => $midiNote === $pianoRollKeys[$pianoRollKeys.length - 1]
      ? '1px solid #b2bcc2'
      : 'unset' };
  border-right: ${({ $idx, $pianoRollBeats }) => $idx === $pianoRollBeats.length - 1
    ? '1px solid #b2bcc2'
    : 'unset'
  };
`;

const RectSelector = styled.div<{ $width: number, $height: number }>`
  background: #76feff54;
  outline: 1px dashed #004cff54;
  position: absolute;
  width: ${({ $width }) => `${$width}px`};
  height: ${({ $height }) => `${$height}px`};
  z-index: ${zIndex_rectSelect};
  pointer-events: none;
`;

const BabyPlayheadImg = styled.img<{ $frame: number }>`
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  background-image: url("baby_dance_sheet.png");
  position: absolute;
  top: -6px;
  left: 0;
  background-position: ${({ $frame }) => `${$frame * -20}px 0px`};
`;

export function CompositionAndPlayhead({
  inputMode,
  setInputMode,
}: {
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
}) {
  const audioContext = useContext(AudioContextContext)!;
  const { playheadPosX, babyDanceFrame, setPristine } = useContext(SongSettingsContext)!;
  const {
    userInstruments,
    userInstrumentIndex,
  } = useContext(UserInstrumentContext)!;
  const {
    composition,
    isCompositionMouseDown: isMouseDown, setIsCompositionMouseDown: setIsMouseDown,
    onCompositionMouseUp, setOnCompositionMouseUp,
    heldPianoKeys,
    subdivisionType,
    addCompositionNotes,
    removeCompositionNotes,
    clickedNote, setClickedNote,
    selectedNotes, setSelectedNotes,
  } = useContext(CompositionContext)!;
  const cursorXOffsetRef = useRef(0);
  const hasMouseMovedRef = useRef(false);
  const clickedNoteRef = useRef(undefined as InstrumentInstruction | undefined);
  const selectedNotesRef = useRef({} as Record<string, InstrumentInstructionWithOffset>);
  const isNoteSelectedRef = useRef((instrumentInstruction: InstrumentInstruction) => {
    return !!Object.keys(selectedNotesRef.current).find((noteId) => parseInt(noteId) === instrumentInstruction.noteId);
  });

  const currUserInstrument = useMemo(
    () => userInstruments[userInstrumentIndex],
    [userInstruments, userInstrumentIndex]
  );
  // This is stupid but, now that I'm setting clickedNotes/selectedNotes elsewhere, I need to update the globalVars
  // I shouldn't be using the global vars, but the event propagation of handlePlacedNoteDown / handleMouseDown
  // is not properly allowing the state to be updated before handleMouseDown is invoked immediately after handlePlacedNoteDown...
  useEffect(() => {
    clickedNoteRef.current = clickedNote;
    selectedNotesRef.current = selectedNotes;
  }, [clickedNote, selectedNotes]);
  const pianoKeyWidth = 30;
  const beatWidth = useMemo(() => {
    switch(subdivisionType) {
      case SubdivisionType.q:
        return 15;
      case SubdivisionType.t:
        return 20;
      default:
        const exhaustiveCheck: never = subdivisionType;
        throw new Error(`Unhandled subdivision type: ${exhaustiveCheck}`);
    }
  }, [subdivisionType]);
  
  const [cursorPosition, setCursorPosition] = useState<
    CursorPosition | undefined
  >();
  const [startingCursorPos, setStartingCursorPos] = useState<
    CursorPosition | undefined
  >();
  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: MidiBeat,
      midiNote: MidiNoteNum,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setOnCompositionMouseUp(undefined);
      if (!clickedNoteRef.current && Object.entries(selectedNotesRef.current).length > 0 && inputMode !== InputMode.SELECT) {
        setIsMouseDown(false);
        setCursorPosition(undefined);
        setStartingCursorPos(undefined);
      } else {
        setIsMouseDown(true);
        setCursorPosition({ midiNote, midiBeat: midiBeat - cursorXOffsetRef.current });
        setStartingCursorPos({ midiNote, midiBeat });
        if (!clickedNoteRef.current && inputMode === InputMode.DEFAULT) {
          if (audioContext.state === "suspended") {
            audioContext.resume();
          }
          currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 });
        }
      }
      hasMouseMovedRef.current = false;
      if (!clickedNoteRef.current || !isNoteSelectedRef.current(clickedNoteRef.current)) {
        setSelectedNotes({});
        selectedNotesRef.current = {};
      }
      return false;
    },
    [setOnCompositionMouseUp, inputMode, audioContext, setIsMouseDown, currUserInstrument.sf2Sampler, setSelectedNotes]
  );
  const handleMouseUp = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string
    ) => {
      if (isMouseDown && cursorPosition && startingCursorPos) {
        if (inputMode === InputMode.DEFAULT) {
          if ((!clickedNote || hasMouseMovedRef.current)) {
            setPristine(false);
            if (!clickedNote) {
              const noteWidth = Math.abs(cursorPosition.midiBeat - startingCursorPos.midiBeat) + 1;
              const midiBeat = Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat);
              // TODO(jaketrower): if we ever implement 3/4 or other time signatures, 16 and 4 here need to be dynamic...
              // const NOTES_IN_MEASURE = 4;
              // const SUBDIVISION_MULT = subdivisionType === 'q' ? 4 : 3
              // const MEASURE_DIVISOR = NOTES_IN_MEASURE * SUBDIVISION_MULT
              // const measure = Math.floor(midiBeat / MEASURE_DIVISOR);
              // const measureNote = Math.floor((midiBeat - (measure * MEASURE_DIVISOR)) / NOTES_IN_MEASURE);
              // const measureNoteSubdivision = Math.floor((midiBeat - (measure * MEASURE_DIVISOR) - (measureNote * NOTES_IN_MEASURE)) / SUBDIVISION_MULT);
              addCompositionNotes([{
                midiBeat, // actually, I think just by adding the midiBeat ++ the subdivision type, we can place it fine!
                // as long as we calculate an individual notes midiBeat + noteWidth based on its store subdivision type...
                midiNote: toMidi(midiNote)!,
                noteWidth, // noteWidth is in midiBeats, so relative to the subdivision type!!!
                userInstrumentIndex,
                subdivisionType,
              }]);
            } else {
              removeCompositionNotes([clickedNote.noteId.toString()]);
              removeCompositionNotes(Object.keys(selectedNotes));
              addCompositionNotes([
                // Place the note that you were clicking and dragging
                {
                  noteId: clickedNote.noteId,
                  midiBeat: cursorPosition.midiBeat + cursorXOffsetRef.current,
                  midiNote: toMidi(midiNote)!,
                  noteWidth: clickedNote.noteWidth,
                  userInstrumentIndex: clickedNote.userInstrumentIndex,
                  subdivisionType,
                },
                // Place all other notes that were currently selected
                ...(Object.entries(selectedNotes).filter(
                  ([noteId, _]) => noteId !== clickedNote.noteId.toString()
                ).map(
                  ([noteId, noteWithOffset]) => {
                    const offset = noteWithOffset.offset;
                    const newMidiBeat = cursorPosition.midiBeat + cursorXOffsetRef.current + offset.x;
                    const newMidiNote = toMidi(midiNote)! - offset.y;
                    // Update the offset and midiBeat / midiNote for the selection too.....
                    // globalSelectedNotes[noteId].instrumentInstruction.midiBeat = newMidiBeat;
                    // globalSelectedNotes[noteId].instrumentInstruction.midiNote = newMidiNote;
                    // globalSelectedNotes[noteId].offset = { x: 0, y: 0 };
                    return {
                      noteId: parseInt(noteId),
                      midiBeat: newMidiBeat,
                      midiNote: newMidiNote,
                      noteWidth: noteWithOffset.instrumentInstruction.noteWidth,
                      userInstrumentIndex: noteWithOffset.instrumentInstruction.userInstrumentIndex,
                      subdivisionType,
                    };
                  }))
              ]);
              // setSelectedNotes({...globalSelectedNotes});
              // fuck it just clear the selected notes
              setSelectedNotes({});
              selectedNotesRef.current = {};
            }
          } else if (clickedNote && !hasMouseMovedRef.current) {
            removeCompositionNotes([clickedNote.noteId.toString()]);
          }
        } else if (inputMode === InputMode.SELECT) {
          const bounds = {
            left: Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat),
            top: Math.min(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!), 
            right: Math.max(cursorPosition.midiBeat, startingCursorPos.midiBeat),
            bottom: Math.max(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!),
          }
          const notes = getPlacedNotesFromComposition(composition, bounds);
          selectedNotesRef.current = notes.reduce((acc, note) => ({ ...acc, [note.noteId]: {
            instrumentInstruction: note,
            offset: { x: 0, y: 0 },
          } as InstrumentInstructionWithOffset}), {});
          setSelectedNotes(selectedNotesRef.current);
        }
      }
      setClickedNote(undefined);
      clickedNoteRef.current = undefined;
      setIsMouseDown(false);
      setCursorPosition(undefined);
      setStartingCursorPos(undefined);
      if (onCompositionMouseUp) {
        onCompositionMouseUp();
      } else {
        setInputMode(InputMode.DEFAULT);
      }
      setOnCompositionMouseUp(undefined);
      cursorXOffsetRef.current = 0;
      hasMouseMovedRef.current = false;
      // TODO(jaketrower): do this with the window documnet too like handleKeyDown
    },
    [isMouseDown, cursorPosition, startingCursorPos, setClickedNote, setIsMouseDown, onCompositionMouseUp, setOnCompositionMouseUp, inputMode, clickedNote, setPristine, addCompositionNotes, userInstrumentIndex, subdivisionType, removeCompositionNotes, selectedNotes, setSelectedNotes, composition, setInputMode]
  );
  const handleMouseMove = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: MidiBeat,
      midiNote: MidiNoteNum
    ) => {
      if (
        isMouseDown &&
        cursorPosition &&
        (cursorPosition.midiBeat !== midiBeat ||
          cursorPosition.midiNote !== midiNote)
      ) {
        hasMouseMovedRef.current = true;
        setCursorPosition({ midiNote, midiBeat });
        if (inputMode !== InputMode.DEFAULT) return;
        if (midiNote !== cursorPosition.midiNote) {
          if (clickedNoteRef.current) {
            userInstruments[clickedNoteRef.current.userInstrumentIndex].sf2Sampler?.start({
              note: midiNote,
              duration: 0.25,
            });
          } else {
            currUserInstrument.sf2Sampler?.start({
              note: midiNote,
              duration: 0.25,
            });
          }
        }
      }
    },
    [isMouseDown, cursorPosition, inputMode, userInstruments, currUserInstrument.sf2Sampler]
  );

  const handlePlacedNoteMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      instrumentInstruction: InstrumentInstruction
    ) => {
      e.preventDefault();
      if (inputMode !== InputMode.DEFAULT) return;
      const clientRect = (e.target as Element).getBoundingClientRect();
      cursorXOffsetRef.current = -Math.floor((e.pageX - clientRect.left) / beatWidth);
      if (isNoteSelectedRef.current(instrumentInstruction)) {
        setClickedNote(instrumentInstruction);
        clickedNoteRef.current = instrumentInstruction;
        Object.entries(selectedNotesRef.current).forEach(([noteId, noteWithOffset]) => {
          if (noteId === instrumentInstruction.noteId.toString()) return;
          noteWithOffset.offset = {
            x: noteWithOffset.instrumentInstruction.midiBeat - instrumentInstruction.midiBeat,
            y: instrumentInstruction.midiNote - noteWithOffset.instrumentInstruction.midiNote,
          }
        });
        setSelectedNotes({...selectedNotesRef.current});
      } else {
        setClickedNote(instrumentInstruction);
        clickedNoteRef.current = instrumentInstruction;
        setSelectedNotes({});
        selectedNotesRef.current = {};
      }
      userInstruments[instrumentInstruction.userInstrumentIndex].sf2Sampler?.start({ note: instrumentInstruction.midiNote, duration: 0.25 });

      handleMouseDown(e, instrumentInstruction.midiBeat, instrumentInstruction.midiNote);
    },
    [inputMode, beatWidth, userInstruments, setClickedNote, setSelectedNotes, handleMouseDown]
  );

  const playheadNode = useMemo(() => <BabyPlayheadImg src="trans.png" $frame={babyDanceFrame} style={{
    left: playheadPosX,
  }}/>, [babyDanceFrame, playheadPosX])

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ marginLeft: 22, height: 15, content: ' ', position: 'relative' }}>
        {playheadNode}
      </div>
      <div>
        {pianoRollKeys.map((midiNote, _) => (
          <div style={{
            display: "flex",
            height: beatHeight - 1,
            ...(heldPianoKeys[midiNote] ? {
              background: currUserInstrument ? `${currUserInstrument.color}40` : '#b2bcc240',
            } : {}),
            position: 'relative',
          }}>
            <div
              key={`row-${midiNote}`}
              style={{
                width: pianoKeyWidth,
                minWidth: pianoKeyWidth,
                textAlign: "left",
                userSelect: "none",
                cursor: 'pointer',
                ...(heldPianoKeys[midiNote] ? {
                  fontWeight: 700,
                  fontSize: 16,
                  marginTop: -2,
                } : {}),
              }}
              onMouseDown={() => { currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 }); }}
            >
              {midiNote}
            </div>
            {/* STATIC(ISH) PLACED NOTES */}
            {composition[toMidi(midiNote)!] !== undefined && (
              Object.values(composition[toMidi(midiNote)!]).map((row) => Object.values(row).map((instrumentInstruction) => {
                if (clickedNote && (instrumentInstruction.noteId === clickedNote.noteId || isNoteSelectedRef.current(instrumentInstruction))) {
                  return null;
                }
                const bgColor = userInstruments[instrumentInstruction.userInstrumentIndex].color ?? 'gray';
                return (<PlacedNote
                  bgColor={bgColor}
                  instrumentInstruction={instrumentInstruction}
                  onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => handlePlacedNoteMouseDown(
                    e, instrumentInstruction
                  )}
                  shouldMouseIgnoreMe={isMouseDown}
                  isNoteSelected={isNoteSelectedRef.current(instrumentInstruction)}
                />)
            })))}
            {/* DRAGGING TO CREATE A NEW NOTE */}
            {inputMode === InputMode.DEFAULT
              && isMouseDown
              && startingCursorPos
              && cursorPosition
              && cursorPosition.midiNote === toMidi(midiNote)!
              && !clickedNote
              && (
                <PlacedNote
                  bgColor={currUserInstrument.color ?? "gray"}
                  instrumentInstruction={{
                    midiBeat: Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat),
                    noteWidth: Math.abs(startingCursorPos.midiBeat - cursorPosition.midiBeat) + 1,
                    subdivisionType,
                  }}
                  isClickedNote
                />
              )}
            {/* DRAGGING EXISTING NOTE */}
            {inputMode === InputMode.DEFAULT
              && isMouseDown
              && startingCursorPos
              && cursorPosition
              && cursorPosition.midiNote === toMidi(midiNote)!
              && clickedNote
              && (
                <>
                  <PlacedNote
                    bgColor={userInstruments[clickedNote.userInstrumentIndex].color}
                    instrumentInstruction={{
                      midiBeat: cursorPosition.midiBeat + cursorXOffsetRef.current,
                      noteWidth: clickedNote.noteWidth,
                      subdivisionType,
                    }}
                    isNoteSelected={isNoteSelectedRef.current(clickedNote)}
                    isClickedNote
                  />
                  {Object.entries(selectedNotes).map(([noteId, noteWithOffset]) =>
                    noteId !== clickedNote.noteId.toString()
                    && (<PlacedNote
                      bgColor={userInstruments[noteWithOffset.instrumentInstruction.userInstrumentIndex].color}
                      instrumentInstruction={{
                        midiBeat: cursorPosition.midiBeat + cursorXOffsetRef.current + noteWithOffset.offset.x,
                        noteWidth: noteWithOffset.instrumentInstruction.noteWidth,
                        subdivisionType,
                      }}
                      isNoteSelected
                      isClickedNote
                      style={{
                        top: (noteWithOffset.offset.y) * (beatHeight - 1),
                      }}
                    />
                  ))}
                </>
              )}
            {pianoRollBeats.map((_, idx) => {
              const index = idx + 1;
              return (
                <GridCell
                  key={`cell-${midiNote}-${index}`}
                  className="hoverable"
                  onMouseDown={(e) => handleMouseDown(e, index, toMidi(midiNote)!)}
                  onMouseMove={(e) => handleMouseMove(e, index, toMidi(midiNote)!)}
                  onMouseUp={(e) => handleMouseUp(e, index, midiNote)}
                  $idx={idx}
                  $subdivision={subdivisionType}
                  $pianoRollBeats={pianoRollBeats}
                  $midiNote={midiNote}
                  $pianoRollKeys={pianoRollKeys}
                  $beatWidth={beatWidth}
                >
                  {/* DRAGGING THE RECT SELECTOR TO SELECT PLACED NOTES */}
                  {inputMode === InputMode.SELECT
                    && isMouseDown
                    && startingCursorPos
                    && cursorPosition
                    && Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat) === index
                    && Math.max(toMidi(cursorPosition.midiNote)!, toMidi(startingCursorPos.midiNote)!) === toMidi(midiNote)
                    && (
                      <RectSelector
                        $width={(Math.abs(startingCursorPos.midiBeat - cursorPosition.midiBeat) + 1) * beatWidth}
                        $height={(Math.abs(toMidi(startingCursorPos.midiNote)! - toMidi(cursorPosition.midiNote)!) + 1) * (beatHeight - 1)}
                      />
                    )}
                </GridCell>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
