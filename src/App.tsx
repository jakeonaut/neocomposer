import React, { useCallback, useState } from 'react';
import './App.css';
import { Maestro } from './composer/Maestro';
import { CompositionContextProvider } from "./composer/contexts/CompositionContextProvider";
import { AudioContextContext } from './composer/consts';
import { UserInstrumentContextProvider } from './composer/contexts/UserInstrumentContextProvider';
import { SongSettingsContextProvider } from './composer/contexts/SongSettingsContextProvider';

function App() {
  const [audioContext] = useState(new AudioContext());
  return (
    <div className="App">
      <AudioContextContext value={audioContext}>
        <SongSettingsContextProvider>
          <UserInstrumentContextProvider>
            <CompositionContextProvider>
              <Maestro />
            </CompositionContextProvider>
          </UserInstrumentContextProvider>
        </SongSettingsContextProvider>
      </AudioContextContext>
    </div>
  );
}

export default App;
