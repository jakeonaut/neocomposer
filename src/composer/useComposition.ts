import { useCallback, useState } from "react";
import { Composition, InputMode, UserInstrument } from "./consts";

let globalNoteId = 0;
let globalIsPlaying = false;
let globalIsLooping = false;
let globalLoopTimeoutId: number | undefined = undefined;
let globalStopHelperTimeoutId: number | undefined = undefined;

export function useComposition({
  songName,
  context,
  tempo,
  userInstruments,
  userInstrumentIndex,
  setPlayheadPosX,
  inputMode,
}: {
  songName: string;
  context: AudioContext;
  tempo: number;
  userInstruments: Array<UserInstrument | undefined>;
  userInstrumentIndex: number;
  setPlayheadPosX: (posX: number) => void;
  inputMode: InputMode
}) {
  const [composition, setComposition] = useState<Composition>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const handleUpdateCompositionAtBeatAndNote = useCallback(
    ({
      midiBeat, midiNote, noteWidth, noteId,
    }: {
      midiBeat: number, 
      midiNote: string, 
      noteWidth: number, 
      noteId: number | undefined
    }) => {
      const newComposition = { ...composition };
      if (!newComposition[midiBeat]) {
        newComposition[midiBeat] = {};
      }
      if (!newComposition[midiBeat][midiNote]) {
        newComposition[midiBeat][midiNote] = {};
      }
      if (noteId !== undefined && newComposition[midiBeat][midiNote][noteId] && noteWidth <= 0) {
        delete newComposition[midiBeat][midiNote][noteId];
        if (Object.keys(newComposition[midiBeat][midiNote]).length === 0) {
          delete newComposition[midiBeat][midiNote];
        }
        if (Object.keys(newComposition[midiBeat]).length === 0) {
          delete newComposition[midiBeat];
        }
      } else {
        const newNoteId = ++globalNoteId;
        newComposition[midiBeat][midiNote][newNoteId] = {
          noteId: newNoteId,
          userInstrumentIndex,
          noteWidth,
          sampleStart: { note: midiNote, duration: 0.25 }, // TODO(jaketrower): Why is duration in seconds? probably just set to a variation of 1.0 and allow the tempo to change things on play dynamically
        };
      }
      setComposition(newComposition);
    },
    [composition, userInstrumentIndex]
  );

  const stopResetHelper = () => {
    globalStopHelperTimeoutId = undefined;
    setPlayheadPosX(1);
    setIsPlaying(false);
    globalIsPlaying = false;
  };
  const handlePlayComposition = useCallback(({ wasStartedFromLoop = false }) => {
    if (wasStartedFromLoop && (!globalIsPlaying || !globalIsLooping)) {
      return;
    }
    const bpm = tempo;
    const bps = bpm / 60.0;
    const nthNoteDivision = 4.0;
    const nthNotesPerSec = bps * nthNoteDivision;
    const beatLengthInSeconds = 1 / nthNotesPerSec;
    // TODO(jaketrower): totally based on bpm... 120 beats per minute = 2 beats per second, 32 noteBlocks per second = duration of 0.03125
    // so beatLengthInSeconds = tempo / 2
    const now = context.currentTime;
    setPlayheadPosX(1);
    let lastBeat = -1; 
    Object.keys(composition).forEach((beatStr) => {
      const beat = parseFloat(beatStr) - 1;
      if (beat > lastBeat) lastBeat = beat;
    });
    console.log("last beat:", lastBeat, composition);
    Object.entries(composition).forEach(([beatStr, perNoteInstrumentInstructions]) => {
      const beat = parseFloat(beatStr) - 1; // TODO(jaketrower): I think beat should represent... 16th notes?
      Object.values(perNoteInstrumentInstructions).forEach((instrumentInstructions) => {
        Object.values(instrumentInstructions).forEach((instrumentInstruction, instructionIndex) => {
          // TODO(jaketrower): This doesn't currently allow for at-time-of-note-play-swapping of the instrument/sf2
          if (!instrumentInstruction) return;
          const { sampleStart } = instrumentInstruction;
          // TODO(jaketrower): in order to achieve ^^, will need playhead to instantiate sampler play at runtime,
          // rather than preprogram them all at PLAY button press...
          const userInstrumentToPlay =
            userInstruments[instrumentInstruction.userInstrumentIndex];
          if (!userInstrumentToPlay?.sf2Sampler) return;
          const durationSec = beatLengthInSeconds * instrumentInstruction.noteWidth;
          const durationPlusOneSec = beatLengthInSeconds * (instrumentInstruction.noteWidth + 1);
          userInstrumentToPlay.sf2Sampler.start({
            note: sampleStart.note,
            time: now + beat * beatLengthInSeconds,
            duration: durationSec, // TODO(jaketrower): need to calculate duration from bpm + sampleStart.duration
            onStart: () => {
              setPlayheadPosX(beat + 1);
              if (beat === lastBeat && instructionIndex === 0) {
                if (globalIsLooping) {
                  globalLoopTimeoutId = window.setTimeout(
                    () => handlePlayComposition({ wasStartedFromLoop: true }),
                    durationPlusOneSec * 1000);
                } else {
                  globalStopHelperTimeoutId = window.setTimeout(stopResetHelper, durationPlusOneSec * 1000);
                }
              }
            },
          });
        });
      });
    });
    if (!wasStartedFromLoop) {
      setIsPlaying(true);
      globalIsPlaying = true;
    }
  }, [userInstruments, composition, tempo, isPlaying]);

  const handleStopComposition = useCallback(() => {
    userInstruments.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    });
    if (globalStopHelperTimeoutId) {
      window.clearTimeout(globalStopHelperTimeoutId);
      globalStopHelperTimeoutId = undefined;
    }
    stopResetHelper();
    if (globalLoopTimeoutId) {
      window.clearTimeout(globalLoopTimeoutId);
      globalLoopTimeoutId = undefined;
    }
  }, [userInstruments]);

  const handleStartLoop = useCallback(() => {
    setIsLooping(true);
    globalIsLooping = true;
  }, []);
  const handleStopLoop = useCallback(() => {
    setIsLooping(false);
    globalIsLooping = false;
  }, []);

  const handleClearComposition = useCallback(() => {
    const shouldDelete = window.confirm(
      "Are you sure you want to destroy your creation?"
    );
    if (!shouldDelete) return;
    userInstruments.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    });
    setPlayheadPosX(1);
    setComposition({});
    setIsPlaying(false);
  }, [userInstruments]);

  const handleImportComposition = useCallback(() => {}, []);
  const handleExportComposition = useCallback(() => {
    debugger;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(composition, null, 2)], {
      type: "text/plain"
    }));
    a.setAttribute("download", `${songName}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [songName, composition]);

  return {
    composition,
    setComposition,
    handleUpdateCompositionAtBeatAndNote,
    handlePlayComposition,
    handleStopComposition,
    handleClearComposition,
    handleExportComposition,
    handleImportComposition,
    isPlaying,
    handleStartLoop,
    handleStopLoop,
    isLooping,
  };
}
