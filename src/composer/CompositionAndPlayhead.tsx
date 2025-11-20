import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AudioContextContext,
  getPlacedNotesFromComposition,
  InputMode,
  InstrumentInstruction,
  InstrumentInstructionWithOffset,
  MidiBeat,
  MidiNote,
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

type CursorPosition = { midiNote: MidiNote; midiBeat: MidiBeat; };
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
let globalCursorXOffset = 0;
let globalHasMouseMoved = false;
let globalClickedNote: InstrumentInstruction | undefined;
let globalSelectedNotes: Record<string, InstrumentInstructionWithOffset> = {};
function globalIsNoteSelected(instrumentInstruction: InstrumentInstruction) {
  return !!Object.keys(globalSelectedNotes).find((noteId) => parseInt(noteId) === instrumentInstruction.noteId);
}

const GridCell = styled.div<{
  $idx: number,
  $pianoRollBeats: number[],
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
  border-left: ${({ $idx }) => `1px ${
    $idx % 4 === 0 ? "solid" : "dashed"
  } ${
    $idx % 16 === 0
      ? "black"
      : $idx % 4 === 0
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
  position: relative;
  left: -10px;
  top: -6px;
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
    addCompositionNotes,
    removeCompositionNotes,
    clickedNote, setClickedNote,
    selectedNotes, setSelectedNotes,
  } = useContext(CompositionContext)!;
  const currUserInstrument = useMemo(
    () => userInstruments[userInstrumentIndex],
    [userInstruments, userInstrumentIndex]
  );
  // This is stupid but, now that I'm setting clickedNotes/selectedNotes elsewhere, I need to update the globalVars
  // I shouldn't be using the global vars, but the event propagation of handlePlacedNoteDown / handleMouseDown
  // is not properly allowing the state to be updated before handleMouseDown is invoked immediately after handlePlacedNoteDown...
  useEffect(() => {
    globalClickedNote = clickedNote;
    globalSelectedNotes = selectedNotes;
  }, [clickedNote, selectedNotes]);
  const [subdivisionType, setSubdivisionType] = useState(SubdivisionType.q);
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
      midiBeat: number,
      midiNote: string,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setOnCompositionMouseUp(undefined);
      if (!globalClickedNote && Object.entries(globalSelectedNotes).length > 0 && inputMode !== InputMode.SELECT) {
        setIsMouseDown(false);
        setCursorPosition(undefined);
        setStartingCursorPos(undefined);
      } else {
        setIsMouseDown(true);
        setCursorPosition({ midiNote, midiBeat: midiBeat - globalCursorXOffset });
        setStartingCursorPos({ midiNote, midiBeat });
        if (!globalClickedNote && inputMode === InputMode.DEFAULT) {
          currUserInstrument.sf2Sampler?.start({ note: midiNote, duration: 0.25 });
        }
      }
      globalHasMouseMoved = false;
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      if (!globalClickedNote || !globalIsNoteSelected(globalClickedNote)) {
        setSelectedNotes({});
        globalSelectedNotes = {};
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
          if ((!clickedNote || globalHasMouseMoved)) {
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
                  midiBeat: cursorPosition.midiBeat + globalCursorXOffset,
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
                    const newMidiBeat = cursorPosition.midiBeat + globalCursorXOffset + offset.x;
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
              globalSelectedNotes = {};
            }
          } else if (clickedNote && !globalHasMouseMoved) {
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
          globalSelectedNotes = notes.reduce((acc, note) => ({ ...acc, [note.noteId]: {
            instrumentInstruction: note,
            offset: { x: 0, y: 0 },
          } as InstrumentInstructionWithOffset}), {});
          setSelectedNotes(globalSelectedNotes);
        }
      }
      setClickedNote(undefined);
      globalClickedNote = undefined;
      setIsMouseDown(false);
      setCursorPosition(undefined);
      setStartingCursorPos(undefined);
      if (onCompositionMouseUp) {
        onCompositionMouseUp();
      } else {
        setInputMode(InputMode.DEFAULT);
      }
      setOnCompositionMouseUp(undefined);
      globalCursorXOffset = 0;
      globalHasMouseMoved = false;
      // TODO(jaketrower): do this with the window documnet too like handleKeyDown
    },
    [isMouseDown, cursorPosition, startingCursorPos, setClickedNote, setIsMouseDown, onCompositionMouseUp, setOnCompositionMouseUp, inputMode, clickedNote, addCompositionNotes, userInstrumentIndex, subdivisionType, removeCompositionNotes, selectedNotes, setSelectedNotes, composition, setInputMode]
  );
  const handleMouseMove = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      midiBeat: number,
      midiNote: string
    ) => {
      if (
        isMouseDown &&
        cursorPosition &&
        (cursorPosition.midiBeat !== midiBeat ||
          cursorPosition.midiNote !== midiNote)
      ) {
        globalHasMouseMoved = true;
        setCursorPosition({ midiNote, midiBeat });
        if (inputMode !== InputMode.DEFAULT) return;
        if (midiNote !== cursorPosition.midiNote) {
          if (globalClickedNote) {
            userInstruments[globalClickedNote.userInstrumentIndex].sf2Sampler?.start({
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
      midiBeat: number,
      midiNote: string,
      noteJustClicked: InstrumentInstruction
    ) => {
      e.preventDefault();
      if (inputMode !== InputMode.DEFAULT) return;
      const clientRect = (e.target as Element).getBoundingClientRect();
      globalCursorXOffset = -Math.floor((e.pageX - clientRect.left) / beatWidth);
      if (globalIsNoteSelected(noteJustClicked)) {
        setClickedNote(noteJustClicked);
        globalClickedNote = noteJustClicked;
        Object.entries(globalSelectedNotes).forEach(([noteId, noteWithOffset]) => {
          if (noteId === noteJustClicked.noteId.toString()) return;
          noteWithOffset.offset = {
            x: noteWithOffset.instrumentInstruction.midiBeat - noteJustClicked.midiBeat,
            y: noteJustClicked.midiNote - noteWithOffset.instrumentInstruction.midiNote,
          }
        });
        setSelectedNotes({...globalSelectedNotes});
      } else {
        setClickedNote(noteJustClicked);
        globalClickedNote = noteJustClicked;
        setSelectedNotes({});
        globalSelectedNotes = {};
      }
      userInstruments[noteJustClicked.userInstrumentIndex].sf2Sampler?.start({ note: midiNote, duration: 0.25 });
    },
    [inputMode, beatWidth, userInstruments, setClickedNote, setSelectedNotes]
  );

  const playheadNode = useMemo(() => <BabyPlayheadImg src="trans.png" $frame={babyDanceFrame} />, [babyDanceFrame])

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", height: beatHeight }}>
        <div
          key="empty"
          style={{ width: beatWidth * 2, minWidth: beatWidth * 2 }}
        >
          &nbsp;
        </div>
        {pianoRollBeats.map((_, idx) => {
          const index = idx + 1;
          return (
            <div
              key={index}
              style={{
                width: beatWidth,
                minWidth: beatWidth,
                textAlign: "left",
              }}
            >
              {playheadPosX === index ? playheadNode : " "}
            </div>
          );
        })}
      </div>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
      >
        {pianoRollKeys.map((midiNote, _) => (
          <div style={{
            display: "flex",
            height: beatHeight - 1,
            ...(heldPianoKeys[midiNote] ? {
              background: currUserInstrument ? `${currUserInstrument.color}40` : '#b2bcc240',
            } : {}),
          }}>
            <div
              key={`row-${midiNote}`}
              style={{
                width: beatWidth * 2,
                minWidth: beatWidth * 2,
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
            {pianoRollBeats.map((_, idx) => {
              const index = idx + 1;
              const currBgColor = currUserInstrument.color ?? "gray";
              return (
                <GridCell
                  key={`cell-${midiNote}-${index}`}
                  className="hoverable"
                  onMouseDown={(e) => handleMouseDown(e, index, midiNote)}
                  onMouseMove={(e) => handleMouseMove(e, index, midiNote)}
                  onMouseUp={(e) => handleMouseUp(e, index, midiNote)}
                  $idx={idx}
                  $pianoRollBeats={pianoRollBeats}
                  $midiNote={midiNote}
                  $pianoRollKeys={pianoRollKeys}
                  $beatWidth={beatWidth}
                >
                  {/* STATIC(ISH) PLACED NOTES */}
                  {composition[index]?.[toMidi(midiNote)!] !== undefined && (
                    Object.values(composition[index]?.[toMidi(midiNote)!]).map((instrumentInstruction) => {
                      if (clickedNote && (instrumentInstruction.noteId === clickedNote.noteId || globalIsNoteSelected(instrumentInstruction))) {
                        return null;
                      }
                      const bgColor = userInstruments[instrumentInstruction.userInstrumentIndex].color ?? 'gray';
                      return (<PlacedNote
                        bgColor={bgColor}
                        beatWidth={beatWidth}
                        noteWidth={instrumentInstruction.noteWidth}
                        onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => handlePlacedNoteMouseDown(
                          e, index, midiNote, instrumentInstruction
                        )}
                        shouldMouseIgnoreMe={isMouseDown}
                        isNoteSelected={globalIsNoteSelected(instrumentInstruction)}
                      />)
                  }))}
                  {/* DRAGGING TO CREATE A NEW NOTE */}
                  {inputMode === InputMode.DEFAULT
                    && isMouseDown
                    && startingCursorPos
                    && cursorPosition
                    && cursorPosition.midiNote === midiNote
                    && !clickedNote
                    && Math.min(cursorPosition.midiBeat, startingCursorPos.midiBeat) === index
                    && (
                      <PlacedNote
                        bgColor={currBgColor}
                        beatWidth={beatWidth}
                        noteWidth={Math.abs(startingCursorPos.midiBeat - cursorPosition.midiBeat) + 1}
                        isClickedNote
                      />
                    )}
                  {/* DRAGGING EXISTING NOTE */}
                  {inputMode === InputMode.DEFAULT
                    && isMouseDown
                    && startingCursorPos
                    && cursorPosition
                    && cursorPosition.midiNote === midiNote
                    && clickedNote
                    && cursorPosition.midiBeat + globalCursorXOffset === index
                    && (
                      <>
                        <PlacedNote
                          bgColor={userInstruments[clickedNote.userInstrumentIndex].color}
                          noteWidth={clickedNote.noteWidth}
                          beatWidth={beatWidth}
                          isNoteSelected={globalIsNoteSelected(clickedNote)}
                          isClickedNote
                        />
                        {Object.entries(selectedNotes).map(([noteId, noteWithOffset]) =>
                          noteId !== clickedNote.noteId.toString()
                          && (<PlacedNote
                            bgColor={userInstruments[noteWithOffset.instrumentInstruction.userInstrumentIndex].color}
                            noteWidth={noteWithOffset.instrumentInstruction.noteWidth}
                            beatWidth={beatWidth}
                            isNoteSelected
                            isClickedNote
                            style={{
                              left: (noteWithOffset.offset.x) * beatWidth,
                              top: (noteWithOffset.offset.y) * (beatHeight - 1),
                            }}
                          />
                        ))}
                      </>
                    )}

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
