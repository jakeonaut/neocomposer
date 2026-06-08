import React, { createContext, useCallback, useEffect, useRef, useState } from "react";
import { InstrumentInstruction, isInstrumentEqual, isNoteEqual, UserInstrument } from "../consts";
import { globals } from "../globals";

export type UndoMemory = {
  addedNotes: Record<string, InstrumentInstruction>,
  removedNotes: Record<string, InstrumentInstruction>,
  // Even though we pass in UserInstrument[] as the input, the output will be
  // a record keyed by the index, so we can easily parse which ones in order were changed or removed/added...
  // without storing the whole array.
  addedInstruments: Record<string, UserInstrument>,
  removedInstruments: Record<string, UserInstrument>,
}

// Will construct UndoMemory from the diff of two given HistoryFrames
// Rather than just storing the entire app history state each time
// (which is much more memory intensive)
type HistoryFrame = {
  composition?: Record<string, InstrumentInstruction>,
  instruments?: UserInstrument[],
}

type HistoryFrameDiffArgs = {
  newState: HistoryFrame,
  oldState: HistoryFrame,
}

export function UndoRedoContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [_undoHistory, _setUndoHistory] = useState<UndoMemory[]>([]);
  const [_historyIndex, _setHistoryIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const undoHistoryRef = useRef(_undoHistory);
  const historyIndexRef = useRef(_historyIndex);

  const setUndoHistory = useCallback((newUndoMemory: UndoMemory[]) => {
    undoHistoryRef.current = newUndoMemory;
    _setUndoHistory(newUndoMemory);
  }, []);

  const setHistoryIndex = useCallback((newHistoryIndex: number) => {
    historyIndexRef.current = newHistoryIndex;
    _setHistoryIndex(newHistoryIndex);
  }, []);
  
  useEffect(() => {
    setCanUndo(!!_undoHistory[_historyIndex]);
    setCanRedo(!!_undoHistory[_historyIndex + 1]);
  }, [_historyIndex, _undoHistory]);

  const handleAddToUndoStack = useCallback((newUndoMemory: UndoMemory) => {
    if (globals.isExecutingUndoRedo) { return; }
    // console.log("Add to undo stack: ", newUndoMemory);
    const existingUndoHistoryToKeep = undoHistoryRef.current.slice(0, historyIndexRef.current + 1);
    setUndoHistory([
      ...existingUndoHistoryToKeep,
      newUndoMemory,
    ]);
    setHistoryIndex(undoHistoryRef.current.length - 1);
  }, [setHistoryIndex, setUndoHistory]);

  const getUndoMemoryFromDiff = useCallback(({newState, oldState} : HistoryFrameDiffArgs): UndoMemory => {
    // ==================== PARSING USER INSTRUMENT DIFFERENCES ========================
    const newInstruments = newState.instruments ?? [];
    const oldInstruments = oldState.instruments ?? [];
    const addedInstruments: Record<string, UserInstrument> = {};
    const removedInstruments: Record<string, UserInstrument> = {};

    // Add all the new instruments, and for any updated (e.g. moved) note, remove and readd it
    newInstruments.forEach((newInstrument, idx) => {
      const oldInstrument = oldInstruments[idx];
      if (oldInstrument) {
        if (isInstrumentEqual(oldInstrument, newInstrument)) {
          return;
        }
        removedInstruments[idx] = oldInstrument;
        addedInstruments[idx] = newInstrument;
      } else if (!oldInstrument) {
        addedInstruments[idx] = newInstrument;
      }
    });
    // For all instruments that were removed wholesale, remove them.
    oldInstruments.forEach((oldInstrument, idx) => {
      const newInstrument = newInstruments[idx];
      if (!newInstrument) {
        removedInstruments[idx] = oldInstrument;
      }
    });

    // ==================== PARSING NOTE DIFFERENCES ========================
    const newComposition = newState.composition ?? {};
    const oldComposition = oldState.composition ?? {};
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
      addedNotes,
      removedNotes,
      addedInstruments,
      removedInstruments,
    }
  }, []);

  const _addToUndoStack = useCallback((args: HistoryFrameDiffArgs) => {
    handleAddToUndoStack(getUndoMemoryFromDiff(args));
  }, [getUndoMemoryFromDiff, handleAddToUndoStack]);

  // This stuff is a little weird, but the reason I'm using this manual method instead of useDebouncedCallback, is that
  // I want to have subsequent debounced calls to this use the original `oldState` while the `newState` updates!
  const _timeoutId = useRef<number | undefined>(undefined);
  const _savedHistoryFrame = useRef<HistoryFrameDiffArgs | undefined>(undefined);
  const _clearTimeout = useCallback(() => {
    if (_timeoutId.current !== undefined) {
      window.clearTimeout(_timeoutId.current);
    }
    _timeoutId.current = undefined;
  }, []);
  const _debouncedAddToUndoStackFlush = useCallback(() => {
    _clearTimeout();
    if (_savedHistoryFrame.current) {
      _addToUndoStack(_savedHistoryFrame.current);
    }
    _savedHistoryFrame.current = undefined;
  }, [_addToUndoStack, _clearTimeout]);
  const debouncedAddToUndoStack = useCallback(({newState, oldState}: HistoryFrameDiffArgs) => {
    if (_savedHistoryFrame.current) {
      // subsequent debounced calls should use the original `oldState` while the `newState` updates!
      _savedHistoryFrame.current = {
        ..._savedHistoryFrame.current,
        newState,
      }
    } else {
      _savedHistoryFrame.current = {newState, oldState};
    }
    _clearTimeout();
    _timeoutId.current = window.setTimeout(() => {
      _debouncedAddToUndoStackFlush();
      _timeoutId.current = undefined;
    }, 1000);
  }, [_clearTimeout, _debouncedAddToUndoStackFlush]);

  const addToUndoStack = useCallback((args : HistoryFrameDiffArgs) => {
    // Try to flush the debounced timeout in case we had one set and we did another action in the intervening time that should save state.
    // In this case, there will be 2 save states, but that's intentional!
    _debouncedAddToUndoStackFlush();
    _addToUndoStack(args);
  }, [_addToUndoStack, _debouncedAddToUndoStackFlush]);

  return (
    <UndoRedoContext value={{
      undoHistoryRef,
      historyIndexRef,
      setHistoryIndex,
      addToUndoStack,
      debouncedAddToUndoStack,
      canUndo,
      canRedo,
    }}>
      {children}
    </UndoRedoContext>
  );
}

export const UndoRedoContext = createContext<{
  undoHistoryRef: React.RefObject<UndoMemory[]>,
  historyIndexRef: React.RefObject<number>,
  setHistoryIndex: (newHistoryIndex: number) => void,
  addToUndoStack: ({newState, oldState} :
    {
      newState: HistoryFrame,
      oldState: HistoryFrame
    }) => void,
  debouncedAddToUndoStack: ({newState, oldState} :
    {
      newState: HistoryFrame,
      oldState: HistoryFrame
    }) => void,
  canUndo: boolean,
  canRedo: boolean
} | undefined>(undefined);