import React from 'react';

export function TodoList() {
  return (
    <div style={{ textAlign: "left", }}>
      <h3>&nbsp;&nbsp;&nbsp;TODO:</h3>
      <ul>
        <li>[ ] delete on mouseUp should do a lookup on that placedNote</li>
        <li>[ ] left click existing notes to drag them (without changing noteWidth)</li>
        <li> - [ ] this is gonna require: A. changing mouseMove when hasClickedNote=true, B. </li>
        <br/>
        <li>[ ] holding shift or ctrl and click dragging should SELECT, and then can move or delete all notes</li>
        <li>[ ] copy and paste (or cut and paste) notes as well with ctrl+x / ctrl+c / ctrl+v</li>
        <li>[ ] save/export/load/import: composition is easy to export as json, but will also have to include the soundfonts and selected instruments?</li>
        <li>[ ] undo/redo. each action (placing a note), should have an opposite action (deleting a note).
        <br/>
        <li>[ ] default sound font?</li>
          <ul><li>this seems preferable than caching the entire state of the application multiple times into memory. will have to have a max undo history though probably..</li></ul></li>
        <li>[ ] C1 - C7 (?) Piano range</li>
        <li>[ ] Longer tracks</li>
        <li>[ ] note length divisions??? (quarter note, eighth note, sixteenth note, triplet? (8th note / quarter note triplet), 32nd note?)
          <ul>
          <li>[ ] Investigate how midi instructions do this today, maybe they just have a time (can round to nearest 2-3 decimal points???)</li>
          <li>[ ] if it's just time based, how do we represent this graphically and user input wise</li>
          <li>[ ] is there a way to change tempo dynamically in midi?</li>
          </ul>
        </li>
      </ul>
    </div>
  );
}