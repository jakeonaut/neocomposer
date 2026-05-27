import React, {useState} from 'react';
import { TipsAndTricks } from "./TipsAndTricks";

export function TodoList() {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div style={{
      textAlign: "left",
      position: "absolute",
      right: 1,
      top: 37,
      zIndex: 999,
      border: "1px solid black",
      background: "lightgray",
      width: isExpanded ? "300px" : "150px",
      maxHeight: isExpanded ? "1120px" : "28px",
      minHeight: isExpanded ? "1120px" : "28px",
      marginBottom: isExpanded ? "-1120px" : "-28px",
      overflow: "clip",
    }}>
      {isExpanded ? (<>
        <TipsAndTricks />
        <hr/><hr/><hr/>
        <h3 style={{color: "gray"}}><center>TODO (ignore if ur not jakeonaut):</center></h3>
      </>) : (<>
        <div style={{fontSize: "15px", lineHeight: "26px"}}>&nbsp;How to Play:</div>
      </>)}
      <div onClick={()=>setIsExpanded((prev) => !prev)}
        style={{userSelect: "none", border: "1px solid black", cursor: "pointer", width: "20px", position: "absolute", height: "20px", textAlign: "center", right: "3px", top: "3px", fontSize: "18px", lineHeight: "19px", background: "white",}}>
        {isExpanded ? "-" : "+"}
      </div>
      {isExpanded && (
      <ul style={{color: "gray"}}>
        <li>[ ] handle save/load with different .sf2s then the default !</li>
<hr/>
        <li>[ ] undo is saved weird when clicking and dragging notes (saves a weird in-between state)</li>
        <li>[ ] this is similar but even worse with moving with arrow keys, </li>
        <li>[ ] undo / redo when deleting an instrument ? (or creating an instrument?)</li>
        <li>will have to have a max undo history though probably..</li>
<hr/>
        <li>[ ] moving notes with arrow keys should only save an undo state after the user changes (or removes) selection</li>
        <li>[ ] - :think: patterns????</li>
<hr/>
        <li><b>EXPORT TO MP3!!!!!: <a href="https://github.com/zhuker/lamejs">https://github.com/zhuker/lamejs</a></b></li>
        <li>[ ] make it play nicer in mobile</li>
        <li>[ ] Longer tracks</li>
<hr/>
        <li>[ ] QOL - should we delete notes that were dragged off the left of the playhead? (when selected with an offset)</li>
        <li>[ ] QOL - could remove notes from the selection that are reselected with shift (like a toggle... like Finder)</li>
        <li>clicking and dragging multiple triplet notes doesn't properly set their relative note offsets to each other</li>
        <li>same with clicking and dragging quarter notes when triplets are ALSO selected</li>
        <hr />
        <br/>
        <li>[ ] is there a way to change tempo dynamically in midi?</li>
        <li>[ ] Record samples as instruments: <a href="https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API">https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API</a></li>
      </ul>
    )}
    </div>
  );
}