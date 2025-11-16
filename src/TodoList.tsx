import React from 'react';

export function TodoList() {
  return (
    <div style={{ textAlign: "left", }}>
      <h3>&nbsp;&nbsp;&nbsp;TODO:</h3>
      <ul>
        <li>[ ] save/export/load/import: composition is easy to export as json, but will also have to include the soundfonts and selected instruments?</li>
        <li>[ ] undo/redo. each action (placing a note(s)), should have an opposite action (deleting a note(s)).</li>
        <ul><li>this seems preferable than caching the entire state of the application multiple times into memory. will have to have a max undo history though probably..</li></ul>
        <li>[ ] copy and paste (or cut and paste) notes as well with ctrl+x / ctrl+c / ctrl+v</li>
        <li>[ ] should we delete notes that were dragged off the left of the playhead? (when selected with an offset)</li>
        <li>[ ] add an eye icon u can press on an instrument to toggle opacity or visibility and pointer interaction for all notes</li>
        <li>[ ] also add a mute or Solo button for all notes too</li>
        <br/>
        <li>[ ] default sound font?</li>
        <li>[ ] C1 - C7 (?) Piano range</li>
        <li>[ ] Longer tracks</li>
        <li>[ ] note length divisions??? (quarter note, eighth note, sixteenth note, triplet? (8th note / quarter note triplet), 32nd note?)</li>
        <ul>
        <li>[ ] Investigate how midi instructions do this today, maybe they just have a time (can round to nearest 2-3 decimal points???)</li>
        <li>[ ] if it's just time based, how do we represent this graphically and user input wise</li>
        <li>[ ] is there a way to change tempo dynamically in midi?</li>
        </ul>
      </ul>
    </div>
  );
}