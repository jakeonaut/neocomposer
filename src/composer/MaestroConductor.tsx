import React, { useCallback, useRef, useState } from "react";
import styled from "styled-components";
import { InputMode } from "./consts";
import { Maestro } from "./Maestro";
import { SongOptionsHeader } from "./SongOptionsHeader";
import { UserInstrumentsHeader } from "./UserInstrumentsHeader";
import { CompositionCanvas } from "./composition/CompositionCanvas";
import { PlayheadNode } from "./PlayheadNode";

const MaestroContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Header = styled.div`
  max-width: 960px;
  display: flex;
  flex-direction: column;
  position: relative;
`;

export function MaestroConductor() {
  const [_inputMode, _setInputMode] = useState(InputMode.DEFAULT);
  const inputModeRef = useRef(_inputMode);
  const setInputMode = useCallback((newInputMode: InputMode) => {
    inputModeRef.current = newInputMode;
    _setInputMode(newInputMode);
  }, []);
  const trySetInputMode = useCallback((newInputMode: InputMode, isMouseDown: boolean) => {
    if (isMouseDown) return;
    setInputMode(newInputMode);
  }, [setInputMode]);
  
  return (
    <Maestro
      _inputMode={_inputMode}
      setInputMode={setInputMode}
      trySetInputMode={trySetInputMode}
      renderChildren={(footer: React.ReactElement, undoRedoButtons: React.ReactElement) => (
        <MaestroContainer>
          <Header>
            <SongOptionsHeader footer={footer} />
            <div style={{display: "flex"}}>
              {/* <div> */}
              <UserInstrumentsHeader />
              {undoRedoButtons}
              {/* </div>
              <TodoList /> */}
            </div>
          </Header>
          {/* TODO(jaketrower): Can I refactor this now after the ref refactors? */}
          {/* Pass setInputMode in directly since we are firing it at the end of a handleMouseUp callback and
            * isCompositionMouseDown won't update the state and the trySetInputMode function until after the event bubbling */}
          <CompositionCanvas _inputMode={_inputMode} inputModeRef={inputModeRef} setInputMode={setInputMode}>
            <PlayheadNode _inputMode={_inputMode} inputModeRef={inputModeRef} />
          </CompositionCanvas>
          <div style={{textAlign: "left", marginTop: "-8px"}}>
            <h4>### okay it's still being kind of weird with the undo / redo. bugs I found:</h4>
            <ul>
              <li>when saving/loading instruments with non-default soundfonts, need to mark them on save, and prompt you to load those sf2s when you load</li>
              <li>click and drag (selection or not), undo seems to just delete the note(s) initially</li>
              <li>UNDO after instrument CREATION just throws an error..</li>
              <li>UNDO/REDO with instruments should ALWAYS try to update the selected instrument index??? got an error when placing a note</li>
            </ul>
          </div>
        </MaestroContainer>
      )} />
  );
}