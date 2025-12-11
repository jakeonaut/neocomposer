import React from 'react';

export function TodoList() {
  return (
    <div style={{ textAlign: "left", }}>
      <h3>&nbsp;&nbsp;&nbsp;TODO:</h3>
      <ul>
        <li>[ ] - Double click should snap the PLAYHEAD_START & STOP to the measure! (shift + double click should add to this (and cover the distance))</li>
        <hr/>
        <li>[ ] undo/redo. each action (placing a note(s)), should have an opposite action (deleting a note(s)).</li>
        <ul><li>this seems preferable than caching the entire state of the application multiple times into memory.
          <br/>will have to have a max undo history though probably..</li></ul>
<hr/>
        <li>[ ] import with different sf2s then the default????</li>
        <li>[ ] add an eye icon u can press on an instrument to toggle opacity or visibility and pointer interaction for all notes</li>
        <li>[ ] also add a mute or Solo button for all notes too</li>
        <li>[ ] - Playhead doesn't seem to play well with triplet mode.. at least switching</li>
        <li><b>EXPORT TO MP3!!!!!: <a href="https://github.com/zhuker/lamejs">https://github.com/zhuker/lamejs</a></b></li>
        <li>[ ] should we delete notes that were dragged off the left of the playhead? (when selected with an offset)</li>
        <li>[ ] QOL - could remove notes from the selection that are reselected with shift (like a toggle... like Finder)</li>
        <li>clicking and dragging multiple triplet notes doesn't properly set their relative note offsets to each other</li>
        <li>same with clicking and dragging quarter notes when triplets are ALSO selected</li>
        <hr />
        <br/>
        <li>[ ] C1 - C7 (?) Piano range</li>
        <li>[ ] Longer tracks</li>
        <li>[ ] is there a way to change tempo dynamically in midi?</li>
        <li>[ ] Record samples as instruments: <a href="https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API">https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API</a></li>
      </ul>
    </div>
  );
}