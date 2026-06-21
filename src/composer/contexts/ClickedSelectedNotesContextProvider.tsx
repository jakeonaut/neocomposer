import React, { createContext, useCallback, useRef, useState } from "react";
import { InstrumentInstruction, NoteId, NoteIdWithOffset } from "../consts";
import _ from "lodash";

export function ClickedSelectedNotesContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [heldPianoKeys, setHeldPianoKeys] = useState<Record<string, boolean>>({});
  const [_clickedNote, _setClickedNote] = useState<NoteId | undefined>(undefined);
  const [_selectedNotes, _setSelectedNotes] = useState<Record<string, NoteIdWithOffset>>({});
  
  const clickedNoteRef = useRef(_clickedNote);
  const selectedNotesRef = useRef(_selectedNotes);

  const setClickedNote = useCallback((newClickedNote: NoteId | undefined) => {
    clickedNoteRef.current = newClickedNote;
    _setClickedNote(newClickedNote);
  }, []);
  const setSelectedNotes = useCallback((newSelectedNotes: Record<string, NoteIdWithOffset>) => {
    if (_.isEqual(Object.keys(selectedNotesRef.current), Object.keys(newSelectedNotes))) {
      return;
    }
    selectedNotesRef.current = newSelectedNotes;
    _setSelectedNotes(newSelectedNotes);
  }, []);
  const toggleSelectionOnNoteSet = useCallback((noteSet: Record<string, NoteIdWithOffset>) => {
    const currSelectedNotes = {...selectedNotesRef.current};
    const currSelectedNoteIds = Object.keys(currSelectedNotes);
    const notesToRemove: string[] = []; 
    const notesToAdd: Record<string, NoteIdWithOffset> = {};
    const noteIdsToToggleSelectionOn = Object.keys(noteSet);
    noteIdsToToggleSelectionOn.forEach((noteId) => {
      if (currSelectedNoteIds.includes(noteId)) {
        notesToRemove.push(noteId);
      } else {
        notesToAdd[noteId] = noteSet[noteId];
      }
    });
    notesToRemove.forEach((noteId) => {
      delete currSelectedNotes[noteId];
    });
    setSelectedNotes({
      ...currSelectedNotes,
      ...notesToAdd,
    })
  }, [setSelectedNotes]);
  const selectNotesByInstrument = useCallback((userInstrumentIndex: number, compositionByInstructionId: Record<string, InstrumentInstruction>) => {
    toggleSelectionOnNoteSet({
      ...(Object.entries(compositionByInstructionId).reduce((acc, [noteId, instrumentInstruction]) => {
        if (instrumentInstruction.userInstrumentIndex === userInstrumentIndex) {
          return {
            ...acc,
            [noteId]: {
              noteId: parseInt(noteId),
              offset: { x: 0, y: 0 },
            },
          };
        }
        return acc;
      }, {} as Record<string, NoteIdWithOffset>)),
    });
  }, [toggleSelectionOnNoteSet]);

  return (
    <ClickedSelectedNotesContext value={{
      heldPianoKeys,
      setHeldPianoKeys,
      _clickedNote, clickedNoteRef, setClickedNote,
      _selectedNotes, selectedNotesRef, setSelectedNotes,
      selectNotesByInstrument,
      toggleSelectionOnNoteSet,
    }}>
      {children}
    </ClickedSelectedNotesContext>
  );
}

export const ClickedSelectedNotesContext = createContext<{
  heldPianoKeys: Record<string, boolean>,
  setHeldPianoKeys: (keys: Record<string, boolean>) => void,
  _clickedNote: NoteId | undefined,
  clickedNoteRef: React.RefObject<NoteId | undefined>,
  setClickedNote: (noteId: NoteId | undefined) => void,
  _selectedNotes: Record<string, NoteIdWithOffset>,
  selectedNotesRef: React.RefObject<Record<string, NoteIdWithOffset>>,
  setSelectedNotes: (notes: Record<string, NoteIdWithOffset>) => void,
  selectNotesByInstrument: (userInstrumentIndex: number, compositionByInstructionId: Record<string, InstrumentInstruction>) => void
  toggleSelectionOnNoteSet: (notes: Record<string, NoteIdWithOffset>) => void,
} | undefined>(undefined);