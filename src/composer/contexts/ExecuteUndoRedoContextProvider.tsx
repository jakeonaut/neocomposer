import React, { createContext, useCallback, useContext } from "react";
import { CompositionActionsContext } from "./CompositionActionsContextProvider";
import { UndoMemory, UndoRedoContext } from "./UndoRedoContextProvider";
import { globals } from "../globals";
import { UserInstrumentContext } from "./UserInstrumentContextProvider";
import { getARandomNote, UserInstrument } from "../consts";

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
    _debouncedAddToUndoStackFlush,
  } = useContext(UndoRedoContext)!;

  const getUndoMemoryInverse = useCallback((undoMemory: UndoMemory) => {
    return {
      addedNotes: undoMemory.removedNotes,
      removedNotes: undoMemory.addedNotes,
      addedInstruments: undoMemory.removedInstruments,
      removedInstruments: undoMemory.addedInstruments,
    }
  }, []);

  const executeUndoOrRedoMemory = useCallback(async (memory: UndoMemory) => {
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
    const howManyAddedInstruments = Object.keys(memory.addedInstruments).length;
    await Promise.all(Object.keys(memory.addedInstruments).map(async (idxStr: string) => {
      const idx = Number.parseInt(idxStr);
      const addedInstrument = memory.addedInstruments[idxStr];
      if (addedInstrument.sf2Sampler && addedInstrument.sf2InstrumentName) { 
        await addedInstrument.sf2Sampler.loadInstrument(addedInstrument.sf2InstrumentName);
        if (howManyAddedInstruments === 1) {
          addedInstrument.sf2Sampler.start({ note: getARandomNote(), duration: 0.25 });
        }
      }
      if (idx < newUserInstruments.length) {
        newUserInstruments[idx] = addedInstrument;
      } else {
        newUserInstruments.push(addedInstrument);
      }
    }));
    setUserInstruments([...newUserInstruments.filter((inst) => inst !== undefined)] as UserInstrument[]);

    globals.isExecutingUndoRedo = false;
  }, [addCompositionNotes, removeCompositionNotes, setUserInstruments, userInstrumentsRef]);

  const handleUndo = useCallback(async () => {
    debugger;
    _debouncedAddToUndoStackFlush();
    const undoHistoryFrame = undoHistoryRef.current[historyIndexRef.current];
    if (!undoHistoryFrame) return;
    await executeUndoOrRedoMemory(getUndoMemoryInverse(undoHistoryFrame));
    setHistoryIndex(historyIndexRef.current - 1);
  }, [_debouncedAddToUndoStackFlush, executeUndoOrRedoMemory, getUndoMemoryInverse, historyIndexRef, setHistoryIndex, undoHistoryRef]);

  const handleRedo = useCallback(async () => {
    _debouncedAddToUndoStackFlush();
    const redoMemory = undoHistoryRef.current[historyIndexRef.current + 1];
    if (!redoMemory) return;
    await executeUndoOrRedoMemory(redoMemory);
    setHistoryIndex(historyIndexRef.current + 1);
  }, [_debouncedAddToUndoStackFlush, executeUndoOrRedoMemory, historyIndexRef, setHistoryIndex, undoHistoryRef]);

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
  handleUndo: () => Promise<void>,
  handleRedo: () => Promise<void>,
} | undefined>(undefined);