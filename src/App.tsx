import React, { useState } from 'react';
import './App.css';
import { CompositionContextProvider } from "./composer/contexts/CompositionContextProvider";
import { AudioContextContext } from './composer/consts';
import { UserInstrumentContextProvider } from './composer/contexts/UserInstrumentContextProvider';
import { SongSettingsContextProvider } from './composer/contexts/SongSettingsContextProvider';
import { SubdivisionTypeContextProvider } from './composer/contexts/SubdivisionTypeContextProvider';
import { PristineContextProvider } from './composer/contexts/PristineContextProvider';
import { PlayheadContextProvider } from './composer/contexts/PlayheadContextProvider';
import { ClipboardContextProvider } from './composer/contexts/ClipboardContextProvider';
import { TimeSignatureContextProvider } from './composer/contexts/TimeSignatureContextProvider';
import { PlayTheSongContextProvider } from './composer/contexts/PlayTheSongContextProvider';
import { PlayheadPosXContextProvider } from './composer/contexts/PlayheadPosXContextProvider';
import { MaestroConductor } from './composer/MaestroConductor';
import { MouseDownContextProvider } from './composer/contexts/MouseDownContextProvider';
import { ClickedSelectedNotesContextProvider } from './composer/contexts/ClickedSelectedNotesContextProvider';
import { CompositionActionsContextProvider } from './composer/contexts/CompositionActionsContextProvider';
import { UndoRedoContextProvider } from './composer/contexts/UndoRedoContextProvider';
import { ExecuteUndoRedoContextProvider } from './composer/contexts/ExecuteUndoRedoContextProvider';
import { BeatSizeContextProvider } from './composer/contexts/BeatSizeContextProvider';

function App() {
  const [audioContext] = useState(new AudioContext());
  return (
    <div className="App">
      <AudioContextContext value={audioContext}>
        <BeatSizeContextProvider>
          <PristineContextProvider>
            <PlayheadContextProvider>
              <PlayheadPosXContextProvider>
                <SongSettingsContextProvider>
                  <UserInstrumentContextProvider>
                    <TimeSignatureContextProvider>
                      <SubdivisionTypeContextProvider>
                        <ClipboardContextProvider>
                          <UndoRedoContextProvider>
                            <CompositionContextProvider>
                              <CompositionActionsContextProvider>
                                <ExecuteUndoRedoContextProvider>
                                  <PlayTheSongContextProvider>
                                    <ClickedSelectedNotesContextProvider>
                                      <MouseDownContextProvider>
                                        <MaestroConductor/>
                                      </MouseDownContextProvider>
                                    </ClickedSelectedNotesContextProvider> 
                                  </PlayTheSongContextProvider>
                                </ExecuteUndoRedoContextProvider>
                              </CompositionActionsContextProvider>
                            </CompositionContextProvider>
                          </UndoRedoContextProvider>
                        </ClipboardContextProvider>
                      </SubdivisionTypeContextProvider>
                    </TimeSignatureContextProvider>
                  </UserInstrumentContextProvider>
                </SongSettingsContextProvider>
              </PlayheadPosXContextProvider>
            </PlayheadContextProvider>
          </PristineContextProvider>
        </BeatSizeContextProvider>
      </AudioContextContext>
    </div>
  );
}

export default App;
