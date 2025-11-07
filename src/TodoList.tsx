import React from 'react';

export function TodoList() {
  return (
    <div style={{ textAlign: "left", }}>
      <h3>&nbsp;&nbsp;&nbsp;TODO:</h3>
      <ul>
        <li>[ ] placing notes should create new absolutely positioned divs that span their note length and z-index: 1</li>
        <li>- [ ] right clickign should delete them, left click and move them</li>
        <li>[ ] default sound font?</li>
        <li>[ ] save/export/load/import: composition is easy to export as json, but will also have to include the soundfonts and selected instruments?</li>
        <li>[ ] undo/redo. each action (placing a note), should have an opposite action (deleting a note).
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