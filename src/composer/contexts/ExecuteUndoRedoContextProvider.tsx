import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { InstrumentInstruction, isNoteEqual } from "../consts";
import { CompositionActionsContext } from "./CompositionActionsContextProvider";
import { HistoryFrame, HistoryFrameType, UndoRedoHistoryContext } from "./UndoRedoHistoryContextProvider";
import { globals } from "../globals";

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
    undoHistoryRef,
    historyIndexRef,
    setUndoHistory,
    setHistoryIndex,
  } = useContext(UndoRedoHistoryContext)!;

  const getHistoryFrameInverse = useCallback((frameToInvert: HistoryFrame) => {
    switch (frameToInvert.type) {
      case HistoryFrameType.COMPOSITION_DIFF:
        return {
          type: HistoryFrameType.COMPOSITION_DIFF,
          addedNotes: frameToInvert.removedNotes,
          removedNotes: frameToInvert.addedNotes,
        };
      case HistoryFrameType.USER_INSTRUMENT_DIFF: {
        alert("need to implement!!! for USER_INSTRUMENT_DIFF")
        return frameToInvert;
      }
      default: {
        const exhaustiveCheck: never = frameToInvert;
        throw new Error(`I don't know how to inverse ${exhaustiveCheck}`);
      }
    }
  }, []);

  const executeHistoryFrameForwards = useCallback((undoHistoryFrame: HistoryFrame) => {
    globals.isExecutingUndoRedo = true;
    switch (undoHistoryFrame.type) {
      case HistoryFrameType.COMPOSITION_DIFF: {
        removeCompositionNotes(Object.values(undoHistoryFrame.removedNotes).map((note) => note.noteId.toString()));
        addCompositionNotes(Object.values(undoHistoryFrame.addedNotes));
        break;
      }
      case HistoryFrameType.USER_INSTRUMENT_DIFF: {
        alert("need to implement EXECUTION!!! for USER_INSTRUMENT_DIFF");
        break;
      }
      default: {
        const exhaustiveCheck: never = undoHistoryFrame;
        throw new Error(`I don't know how to execute: ${exhaustiveCheck}`);
      }
    }
    globals.isExecutingUndoRedo = false;
  }, [addCompositionNotes, removeCompositionNotes]);

  const handleUndo = useCallback(() => {
    const undoHistoryFrame = undoHistoryRef.current[historyIndexRef.current];
    if (!undoHistoryFrame) return;
    executeHistoryFrameForwards(getHistoryFrameInverse(undoHistoryFrame));
    setHistoryIndex(historyIndexRef.current - 1);
  }, [executeHistoryFrameForwards, getHistoryFrameInverse, historyIndexRef, setHistoryIndex, undoHistoryRef]);

  const handleRedo = useCallback(() => {
    const redoHistoryFrame = undoHistoryRef.current[historyIndexRef.current + 1];
    if (!redoHistoryFrame) return;
    executeHistoryFrameForwards(redoHistoryFrame);
    setHistoryIndex(historyIndexRef.current + 1);
  }, [executeHistoryFrameForwards, historyIndexRef, setHistoryIndex, undoHistoryRef]);

  return (
    <ExecuteUndoRedoContext value={{
      historyIndexRef,
      undoHistoryRef,
      handleUndo,
      handleRedo,
    }}>
      {children}
    </ExecuteUndoRedoContext>
  );
}

export const ExecuteUndoRedoContext = createContext<{
  historyIndexRef: React.RefObject<number>,
  undoHistoryRef: React.RefObject<HistoryFrame[]>,
  handleUndo: () => void,
  handleRedo: () => void,
} | undefined>(undefined);