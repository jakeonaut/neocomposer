import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { CompositionActionsContext } from "./CompositionActionsContextProvider";
import { UndoMemory, UndoRedoContext } from "./UndoRedoContextProvider";
import { globals } from "../globals";
import { UserInstrumentContext } from "./UserInstrumentContextProvider";
import { UserInstrument } from "../consts";

export function ExecuteUndoRedoContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    addCompositionNotes,
    removeCompositionNotes,
  } = useContext(CompositionActionsContext)!;
  const {
    userInstrumentsRef,
    setUserInstruments,
    userInstrumentIndexRef,
    setUserInstrumentIndex,
  } = useContext(UserInstrumentContext)!;
  const {
    undoHistoryRef,
    historyIndexRef,
    setHistoryIndex,
  } = useContext(UndoRedoContext)!;

  const getUndoMemoryInverse = useCallback((undoMemory: UndoMemory) => {
    return {
      addedNotes: undoMemory.removedNotes,
      removedNotes: undoMemory.addedNotes,
      addedInstruments: undoMemory.removedInstruments,
      removedInstruments: undoMemory.addedInstruments,
    }
  }, []);

  const executeUndoOrRedoMemory = useCallback((memory: UndoMemory) => {
    globals.isExecutingUndoRedo = true;
    
    // ===================== EXECUTING NOTE COMPOSITION MODIFICATION =================
    removeCompositionNotes(
      Object.values(memory.removedNotes).map((note) => note.noteId.toString()),
      false, /* shouldAddToUndoStack */
    );
    addCompositionNotes(Object.values(memory.addedNotes), false, /* shouldAddToUndoStack */);

    // ===================== EXECUTING USER INSTRUMENT MODIFICATION =================
    const newUserInstruments: (UserInstrument | undefined)[] = [...userInstrumentsRef.current];
    Object.keys(memory.removedInstruments).forEach((idxStr: string) => {
      const idx = Number.parseInt(idxStr);
      if (idx < newUserInstruments.length) {
        newUserInstruments[idx] = undefined;
      }
    });
    Object.keys(memory.addedInstruments).forEach((idxStr: string) => {
      const idx = Number.parseInt(idxStr);
      const addedInstrument = memory.addedInstruments[idxStr];
      if (idx < newUserInstruments.length) {
        newUserInstruments[idx] = addedInstrument;
      } else {
        newUserInstruments.push(addedInstrument);
      }
    });
    setUserInstruments([...newUserInstruments.filter((inst) => inst !== undefined)] as UserInstrument[]);
    if (userInstrumentIndexRef.current >= newUserInstruments.length) {
      setUserInstrumentIndex(userInstrumentIndexRef.current - 1);
    }

    globals.isExecutingUndoRedo = false;
  }, [addCompositionNotes, removeCompositionNotes, setUserInstrumentIndex, setUserInstruments, userInstrumentIndexRef, userInstrumentsRef]);

  const handleUndo = useCallback(() => {
    const undoHistoryFrame = undoHistoryRef.current[historyIndexRef.current];
    if (!undoHistoryFrame) return;
    executeUndoOrRedoMemory(getUndoMemoryInverse(undoHistoryFrame));
    setHistoryIndex(historyIndexRef.current - 1);
  }, [executeUndoOrRedoMemory, getUndoMemoryInverse, historyIndexRef, setHistoryIndex, undoHistoryRef]);

  const handleRedo = useCallback(() => {
    const redoMemory = undoHistoryRef.current[historyIndexRef.current + 1];
    if (!redoMemory) return;
    executeUndoOrRedoMemory(redoMemory);
    setHistoryIndex(historyIndexRef.current + 1);
  }, [executeUndoOrRedoMemory, historyIndexRef, setHistoryIndex, undoHistoryRef]);

  return (
    <ExecuteUndoRedoContext value={{
      handleUndo,
      handleRedo,
    }}>
      {children}
    </ExecuteUndoRedoContext>
  );
}

export const ExecuteUndoRedoContext = createContext<{
  handleUndo: () => void,
  handleRedo: () => void,
} | undefined>(undefined);