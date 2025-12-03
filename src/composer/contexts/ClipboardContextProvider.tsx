import React, { createContext, useCallback, useRef, useState } from "react";
import { InstrumentInstruction } from "../consts";

export function ClipboardContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [_copiedNotes, _setCopiedNotes] = useState<InstrumentInstruction[]>([]);
  const copiedNotesRef = useRef(_copiedNotes);
  const copiedNotesOffsetRef = useRef(0);

  const setCopiedNotes = useCallback((newCopiedNotes: InstrumentInstruction[]) => {
    copiedNotesRef.current = newCopiedNotes;
    _setCopiedNotes(newCopiedNotes);
  }, []);

  const removeInstrumentFromCopiedNotes = useCallback((userInstrumentIndexToDelete: number) => {
    setCopiedNotes(copiedNotesRef.current.filter(
      (copiedNote) => copiedNote.userInstrumentIndex !== userInstrumentIndexToDelete));
  }, [setCopiedNotes]);

  return (
    <ClipboardContext value={{
      _copiedNotes, copiedNotesRef, setCopiedNotes,
      copiedNotesOffsetRef,
      removeInstrumentFromCopiedNotes,
    }}>
      {children}
    </ClipboardContext>
  );
}

export const ClipboardContext = createContext<{
  _copiedNotes: InstrumentInstruction[],
  copiedNotesRef: React.RefObject<InstrumentInstruction[]>,
  setCopiedNotes: (notes: InstrumentInstruction[]) => void,
  copiedNotesOffsetRef: React.RefObject<number>,
  removeInstrumentFromCopiedNotes: (userInstrumentIndexToDelete: number) => void
} | undefined>(undefined);