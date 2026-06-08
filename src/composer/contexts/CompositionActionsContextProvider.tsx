import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Composition, InstrumentInstruction, NoteId } from "../consts";
import _ from "lodash";
import { globals } from "../globals";
import { CompositionContext } from "./CompositionContextProvider";
import { UndoRedoContext } from "./UndoRedoContextProvider";

export function CompositionActionsContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    _composition, 
    _setComposition,
    _farthestRightNoteEnd,
    _setFarthestRightNoteEnd,
  } = useContext(CompositionContext)!;
  const { addToUndoStack } = useContext(UndoRedoContext)!;
  
  const farthestRightNoteEndRef = useRef(_farthestRightNoteEnd);
  const compositionRef = useRef(_composition);
  const compositionByInstructionIdRef = useRef<Record<string, InstrumentInstruction>>({});

  const setFarthestRightNoteEnd = useCallback((newFarthestRightNoteEnd: number) => {
    farthestRightNoteEndRef.current = newFarthestRightNoteEnd;
    _setFarthestRightNoteEnd(newFarthestRightNoteEnd);
  }, [_setFarthestRightNoteEnd]);
  const manuallyUpdateFarthestRightNoteEnd = useCallback(() => {
    let newFarthestRightNoteEnd = 1;
    Object.values(compositionByInstructionIdRef.current).forEach((instrumentInstruction) => {
      if (instrumentInstruction.midiBeat + instrumentInstruction.noteWidth > newFarthestRightNoteEnd) {
        newFarthestRightNoteEnd = instrumentInstruction.midiBeat + instrumentInstruction.noteWidth;
      }
    });
    setFarthestRightNoteEnd(newFarthestRightNoteEnd);
  }, [setFarthestRightNoteEnd]);

  const setComposition = useCallback((newComposition: Composition, shouldAddToUndoStack: boolean) => {
    const prevCompositionByInstructionId = { ...compositionByInstructionIdRef.current };
    compositionByInstructionIdRef.current = {};
    Object.values(newComposition).forEach((row) => {
      Object.values(row).forEach((instrumentInstructions) => {
        Object.values(instrumentInstructions).forEach((instrumentInstruction) => {
          compositionByInstructionIdRef.current[instrumentInstruction.noteId] = instrumentInstruction;
        });
      });
    });
    compositionRef.current = newComposition;
    if (shouldAddToUndoStack) {
      addToUndoStack({
        newState: { composition: { ...compositionByInstructionIdRef.current }},
        oldState: { composition: {...prevCompositionByInstructionId}},
      })
    }
    _setComposition(newComposition);
  }, [_setComposition, addToUndoStack]);

  const removeCompositionNotes = useCallback((
    idsToRemove: string[], 
    shouldAddToUndoStack: boolean,
  ) => {
    const removedInstrumentInstructions: Record<NoteId, InstrumentInstruction> = {};
    const newComposition = { ...compositionRef.current };
    idsToRemove.forEach((id) => {
      const instrumentInstruction = compositionByInstructionIdRef.current[id];
      if (!instrumentInstruction) return;
      const { midiBeat, midiNote, noteId } = instrumentInstruction;
      removedInstrumentInstructions[noteId] = instrumentInstruction;
      delete newComposition[midiBeat][midiNote][noteId];
      if (Object.keys(newComposition[midiBeat][midiNote]).length === 0) {
        delete newComposition[midiBeat][midiNote];
      }
      if (Object.keys(newComposition[midiBeat]).length === 0) {
        delete newComposition[midiBeat];
      }
      delete compositionByInstructionIdRef.current[noteId];
      if (farthestRightNoteEndRef.current <= instrumentInstruction.midiBeat + instrumentInstruction.noteWidth) {
        manuallyUpdateFarthestRightNoteEnd();
      }
    });
    setComposition(newComposition, shouldAddToUndoStack);
    return removedInstrumentInstructions;
  }, [manuallyUpdateFarthestRightNoteEnd, setComposition]);
  const removeInstrumentFromComposition = useCallback((
    userInstrumentIndexToDelete: number,
    shouldAddToUndoStack: boolean,
  ) => {
    const newComposition = { ...compositionRef.current };
    Object.entries(newComposition).forEach(([midiBeatStr, column]) => {
      Object.entries(column).forEach(([midiNoteStr, row]) => {
        Object.entries(row).forEach(([noteIdStr, instrumentInstruction]) => {
          const midiBeat = parseInt(midiBeatStr);
          const midiNote = parseInt(midiNoteStr);
          const noteId = parseInt(noteIdStr);
          if (instrumentInstruction.userInstrumentIndex === userInstrumentIndexToDelete) {
            delete newComposition[midiBeat][midiNote][noteId];
            if (Object.keys(newComposition[midiBeat][midiNote]).length === 0) {
              delete newComposition[midiBeat][midiNote];
            }
            if (Object.keys(newComposition[midiBeat]).length === 0) {
              delete newComposition[midiBeat];
            }
          } else if (instrumentInstruction.userInstrumentIndex > userInstrumentIndexToDelete) {
            newComposition[midiBeat][midiNote][noteId].userInstrumentIndex -= 1;
          }
        });
      });
    });
    setComposition(newComposition, shouldAddToUndoStack);
    manuallyUpdateFarthestRightNoteEnd();
  }, [manuallyUpdateFarthestRightNoteEnd, setComposition]);
  const addCompositionNotes = useCallback(
    (
      notesToAdd: (Omit<InstrumentInstruction, 'noteId'> & { noteId?: number })[],
      shouldAddToUndoStack: boolean
    ): InstrumentInstruction[] => {
      const newComposition = { ...compositionRef.current };
      const addedNotes = notesToAdd.map((noteToAdd) => {
        const { midiBeat, midiNote, noteWidth } = noteToAdd;
        if (!newComposition[midiBeat]) newComposition[midiBeat] = {};
        if (!newComposition[midiBeat][midiNote]) newComposition[midiBeat][midiNote] = {};
        if (midiBeat + noteWidth > farthestRightNoteEndRef.current) {
          setFarthestRightNoteEnd(midiBeat + noteWidth);
        }
        const noteId = noteToAdd.noteId || ++globals.instructionId;
        const newInstrumentInstruction = {
          ...noteToAdd,
          noteId,
        };
        newComposition[midiBeat][midiNote][noteId] = newInstrumentInstruction;
        return newInstrumentInstruction;
      });
      setComposition(newComposition, shouldAddToUndoStack);
      return addedNotes;
    },
    [setComposition, setFarthestRightNoteEnd]
  );

  const contextValue = useMemo(() => ({
    farthestRightNoteEndRef,
    setFarthestRightNoteEnd,
    compositionByInstructionIdRef,
    compositionRef, setComposition,
    addCompositionNotes,
    removeCompositionNotes,
    removeInstrumentFromComposition,
    manuallyUpdateFarthestRightNoteEnd,
  }), [addCompositionNotes, manuallyUpdateFarthestRightNoteEnd, removeCompositionNotes, removeInstrumentFromComposition, setComposition, setFarthestRightNoteEnd]);
  return (
    <CompositionActionsContext value={contextValue}>
      {children}
    </CompositionActionsContext>
  );
}

export const CompositionActionsContext = createContext<{
  compositionByInstructionIdRef: React.RefObject<Record<string, InstrumentInstruction>>,
  compositionRef: React.RefObject<Composition>,
  setComposition: (composition: Composition, shouldAddToUndoStack: boolean) => void,
  addCompositionNotes: (
    notesToAdd: (Omit<InstrumentInstruction, "noteId"> & {noteId?: NoteId;})[],
    shouldAddToUndoStack: boolean
  ) => InstrumentInstruction[],
  removeCompositionNotes: (noteIdsToRemove: string[], shouldAddToUndoStack: boolean) => Record<NoteId, InstrumentInstruction>,
  removeInstrumentFromComposition: (userInstrumentIndex: number, shouldAddToUndoStack: boolean) => void,
  farthestRightNoteEndRef: React.RefObject<number>,
  setFarthestRightNoteEnd: (newFarthestRightNoteEnd: number) => void,
  manuallyUpdateFarthestRightNoteEnd: () => void,
} | undefined>(undefined);