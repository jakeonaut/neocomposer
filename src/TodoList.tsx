import React from 'react';

export function TodoList() {
  return (
    <div style={{ textAlign: "left", }}>
      <h3>&nbsp;&nbsp;&nbsp;TODO:</h3>
      <ul>
        <li>[ ] import with different sf2s then the default????</li>
        <li>[ ] add an eye icon u can press on an instrument to toggle opacity or visibility and pointer interaction for all notes</li>
        <li>[ ] also add a mute or Solo button for all notes too</li>
        <li>[ ] copy and paste (or cut and paste) notes as well with ctrl+x / ctrl+c / ctrl+v</li>
        <li><b>EXPORT TO MP3!!!!!: <a href="https://github.com/zhuker/lamejs">https://github.com/zhuker/lamejs</a></b></li>
        <li>[ ] undo/redo. each action (placing a note(s)), should have an opposite action (deleting a note(s)).</li>
        <ul><li>this seems preferable than caching the entire state of the application multiple times into memory. will have to have a max undo history though probably..</li></ul>
        <li>[ ] should we delete notes that were dragged off the left of the playhead? (when selected with an offset)</li>
        <br/>
        <li>[ ] C1 - C7 (?) Piano range</li>
        <li>[ ] Longer tracks</li>
        <li>[ ] note length divisions??? (quarter note, eighth note, sixteenth note, triplet? (8th note / quarter note triplet), 32nd note?)</li>
        <ul>
        <li>[ ] Investigate how midi instructions do this today, maybe they just have a time (can round to nearest 2-3 decimal points???)</li>
        <li>[ ] if it's just time based, how do we represent this graphically and user input wise</li>
        <li>[ ] is there a way to change tempo dynamically in midi?</li>
        <li>[ ] Record samples as instruments: <a href="https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API">https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API</a></li>
        </ul>
      </ul>
    </div>
  );
}