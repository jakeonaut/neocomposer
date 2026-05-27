import React from "react";

export function TipsAndTricks() {
  return (<>
    <h3><center>How to Play:</center></h3>
    <ul>
      <li>Click (and drag) the grid to place notes!</li>
      <li>Quickly click a note again to delete it!</li>
      <li>Press <b>Space</b> to play / pause!</li>
      <li>Use asdfghjkl;wetyuop keys to practice!</li>
      <li>Use 1, 2, 3, etc. to quickly swap between instruments!</li>
      <li><b>Ctrl+Z</b> and <b>Ctrl+Y</b> kind of work too!</li>
    </ul>
    <h3><center>Expert Tips:</center></h3>
    <ul>
      <li>Use shift to quickly swap between note pencil and select mode!</li>
      <li>Hold shift + drag the cursor to select notes!</li>
      <li>Press shift + 1, 2, 3, etc. to select all notes for a given instrument!</li>
      <li>Use escape to clear note selection!</li>
    </ul>
  </>);
}