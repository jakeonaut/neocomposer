import React, { useState } from 'react';
import './App.css';
import { Maestro } from './composer/Maestro';
import { CompositionContextProvider } from "./composer/contexts/CompositionContextProvider";
import { AudioContextContext } from './composer/consts';
import { UserInstrumentContextProvider } from './composer/contexts/UserInstrumentContextProvider';
import { SongSettingsContextProvider } from './composer/contexts/SongSettingsContextProvider';
import { SubdivisionTypeContextProvider } from './composer/contexts/SubdivisionTypeContextProvider';
import { PristineContextProvider } from './composer/contexts/PristineContextProvider';
import { PlayheadContextProvider } from './composer/contexts/PlayheadContextProvider';
import { ClipboardContextProvider } from './composer/contexts/ClipboardContextProvider';
import { TimeSignatureContextProvider } from './composer/contexts/TimeSignatureContextProvider';

function App() {
  const [audioContext] = useState(new AudioContext());
  return (
    <div className="App">
      <AudioContextContext value={audioContext}>
        <PristineContextProvider>
          <PlayheadContextProvider>
            <SongSettingsContextProvider>
              <UserInstrumentContextProvider>
                <TimeSignatureContextProvider>
                  <SubdivisionTypeContextProvider>
                    <ClipboardContextProvider>
                      <CompositionContextProvider>
                        <Maestro />
                      </CompositionContextProvider>
                    </ClipboardContextProvider>
                  </SubdivisionTypeContextProvider>
                </TimeSignatureContextProvider>
              </UserInstrumentContextProvider>
            </SongSettingsContextProvider>
          </PlayheadContextProvider>
        </PristineContextProvider>
      </AudioContextContext>
    </div>
  );
}

export default App;
