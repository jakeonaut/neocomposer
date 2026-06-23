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
      inputModeRef={inputModeRef}
      setInputMode={setInputMode}
      trySetInputMode={trySetInputMode}
      renderChildren={(footer: React.ReactElement, undoRedoButtons: React.ReactElement) => (
        <>
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
        </>
      )} />
  );
}