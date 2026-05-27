import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { InstrumentInstruction, isNoteEqual } from "../consts";
import { CompositionActionsContext } from "./CompositionActionsContextProvider";
import { globals } from "../globals";

// TODO(jaketrower): Should song renaming also be included? I think song loading / saving / clearing can be ignored for now...
// TODO(jaketrower): Need to include User Instrument Creation / Deletion / renaming / changing (uploadsf2?) too?
export enum HistoryFrameType {
  COMPOSITION_DIFF,
  USER_INSTRUMENT_DIFF
}

type CompositionDiffHistoryFrame = {
  type: HistoryFrameType.COMPOSITION_DIFF,
  addedNotes: Record<string, InstrumentInstruction>,
  removedNotes: Record<string, InstrumentInstruction>
}

type UserInstrumentDiffHistoryFrame = {
  type: HistoryFrameType.USER_INSTRUMENT_DIFF,
}

export type HistoryFrame = CompositionDiffHistoryFrame | UserInstrumentDiffHistoryFrame;

export function UndoRedoHistoryContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [_undoHistory, _setUndoHistory] = useState<HistoryFrame[]>([]);
  const [_historyIndex, _setHistoryIndex] = useState(-1);

  const undoHistoryRef = useRef(_undoHistory);
  const historyIndexRef = useRef(_historyIndex);

  const setUndoHistory = useCallback((newUndoHistory: HistoryFrame[]) => {
    undoHistoryRef.current = newUndoHistory;
    _setUndoHistory(newUndoHistory);
  }, []);

  const setHistoryIndex = useCallback((newHistoryIndex: number) => {
    historyIndexRef.current = newHistoryIndex;
    _setHistoryIndex(newHistoryIndex);
  }, []);

  const handleAddToUndoStack = useCallback((newUndoHistoryFrame: HistoryFrame) => {
    if (globals.isExecutingUndoRedo) { return; }
    console.log("Add to undo stack: ", newUndoHistoryFrame);
    const existingUndoHistoryToKeep = undoHistoryRef.current.slice(0, historyIndexRef.current + 1);
    setUndoHistory([
      ...existingUndoHistoryToKeep,
      newUndoHistoryFrame,
    ]);
    setHistoryIndex(undoHistoryRef.current.length - 1);
  }, [historyIndexRef, setHistoryIndex, setUndoHistory, undoHistoryRef]);

  const getHistoryFrameFromCompositionDiff = useCallback((
    newComposition: Record<string, InstrumentInstruction>,
    oldComposition: Record<string, InstrumentInstruction>,
  ): HistoryFrame => {
    const addedNotes: Record<string, InstrumentInstruction> = {};
    const removedNotes: Record<string, InstrumentInstruction> = {};
    // Add all the new notes, and for any updated (e.g. moved) note, remove and readd it
    Object.values(newComposition).forEach((newNote) => {
      const oldNote = newNote.noteId in oldComposition ? oldComposition[newNote.noteId] : undefined;
      if (oldNote) {
        if (isNoteEqual(oldNote, newNote)) {
          return;
        }
        removedNotes[oldNote.noteId] = oldNote;
        addedNotes[newNote.noteId] = newNote;
        // Delete from the oldComposition so the new forEach loop is quicker.
        // delete oldComposition[newNote.noteId];
      } else if (!oldNote) {
        addedNotes[newNote.noteId] = newNote;
      }
    });
    // For all notes that were removed wholesale, remove them.
    Object.values(oldComposition).forEach((oldNote) => {
      const newNote = oldNote.noteId in newComposition ? newComposition[oldNote.noteId] : undefined;
      if (!newNote) {
        removedNotes[oldNote.noteId] = oldNote;
      }
    });
    return {
      type: HistoryFrameType.COMPOSITION_DIFF,
      addedNotes,
      removedNotes,
    }
  }, []);

  return (
    <UndoRedoHistoryContext value={{
      undoHistoryRef,
      historyIndexRef,
      setUndoHistory,
      setHistoryIndex,
      handleAddToUndoStack,
      getHistoryFrameFromCompositionDiff,
    }}>
      {children}
    </UndoRedoHistoryContext>
  );
}

export const UndoRedoHistoryContext = createContext<{
  undoHistoryRef: React.RefObject<HistoryFrame[]>,
  historyIndexRef: React.RefObject<number>,
  setUndoHistory: (newUndoHistory: HistoryFrame[]) => void,
  setHistoryIndex: (newHistoryIndex: number) => void,
  handleAddToUndoStack: (newUndoHistoryFrame: HistoryFrame) => void,
  getHistoryFrameFromCompositionDiff: (
    newComposition: Record<string, InstrumentInstruction>,
    oldComposition: Record<string, InstrumentInstruction>
  ) => HistoryFrame
} | undefined>(undefined);