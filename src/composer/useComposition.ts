import { useCallback, useState } from "react";
import { Composition, UserInstrument } from "./consts";

export function useComposition({
  context,
  tempo,
  userInstruments,
  userInstrumentIndex,
  setPlayheadPosX,
}: {
  context: AudioContext;
  tempo: number;
  userInstruments: Array<UserInstrument | undefined>;
  userInstrumentIndex: number;
  setPlayheadPosX: (posX: number) => void;
}) {
  const [composition, setComposition] = useState<Composition>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handleUpdateCompositionAtBeatAndNote = useCallback(
    (midiBeat: number, midiNote: string, noteWidth: number) => {
      const newComposition = { ...composition };
      if (!newComposition[midiBeat]) {
        newComposition[midiBeat] = {};
      }
      if (newComposition[midiBeat][midiNote] && noteWidth <= 0) {
        delete newComposition[midiBeat][midiNote];
      } else {
        newComposition[midiBeat][midiNote] = {
          userInstrumentIndex,
          noteWidth,
          sampleStart: { note: midiNote, duration: 0.25 }, // TODO(jaketrower): Why is duration in seconds? probably just set to a variation of 1.0 and allow the tempo to change things on play dynamically
        };
      }
      setComposition(newComposition);
    },
    [composition, userInstrumentIndex]
  );

  const handlePlayComposition = useCallback(() => {
    const bpm = tempo;
    const bps = bpm / 60.0;
    const nthNoteDivision = 4.0;
    const nthNotesPerSec = bps * nthNoteDivision;
    const beatLengthInSeconds = 1 / nthNotesPerSec;
    // TODO(jaketrower): totally based on bpm... 120 beats per minute = 2 beats per second, 32 noteBlocks per second = duration of 0.03125
    // so beatLengthInSeconds = tempo / 2
    const now = context.currentTime;
    setPlayheadPosX(1);
    Object.entries(composition).forEach(([beatStr, beatNotes]) => {
      const beat = parseFloat(beatStr) - 1; // TODO(jaketrower): I think beat should represent... 16th notes?
      Object.values(beatNotes).forEach((instrumentInstruction) => {
        // TODO(jaketrower): This doesn't currently allow for at-time-of-note-play-swapping of the instrument/sf2
        if (!instrumentInstruction) return;
        const { sampleStart } = instrumentInstruction;
        // TODO(jaketrower): in order to achieve ^^, will need playhead to instantiate sampler play at runtime,
        // rather than preprogram them all at PLAY button press...
        const userInstrumentToPlay =
          userInstruments[instrumentInstruction.userInstrumentIndex];
        if (!userInstrumentToPlay?.sf2Sampler) return;
        userInstrumentToPlay.sf2Sampler.start({
          note: sampleStart.note,
          time: now + beat * beatLengthInSeconds,
          duration: sampleStart.duration, // TODO(jaketrower): need to calculate duration from bpm + sampleStart.duration
          onStart: () => {
            setPlayheadPosX(beat + 1);
          },
        });
      });
    });
    setIsPlaying(true);
  }, [userInstruments, composition, tempo]);

  const handleStopComposition = useCallback(() => {
    setPlayheadPosX(1);
    userInstruments.forEach((userInstrument) => {
      userInstrument?.sf2Sampler?.stop();
    });
    setIsPlaying(false);
  }, [userInstruments]);

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

  return {
    composition,
    setComposition,
    handleUpdateCompositionAtBeatAndNote,
    handlePlayComposition,
    handleStopComposition,
    handleClearComposition,
    isPlaying,
  };
}
