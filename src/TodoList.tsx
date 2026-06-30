import React, {useState} from 'react';
import { TipsAndTricks } from "./TipsAndTricks";

export function TodoList() {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="howToPlay" style={{
      textAlign: "left",
      position: "absolute",
      right: 3,
      zIndex: 999,
      border: "1px solid black",
      background: "lightgray",
      width: isExpanded ? "300px" : "150px",
      maxHeight: isExpanded ? "1120px" : "28px",
      minHeight: isExpanded ? "1120px" : "28px",
      marginBottom: isExpanded ? "-1120px" : "-28px",
      overflow: "clip",
      // pointerEvents: isExpanded ? "auto" : "none",
      // opacity: isExpanded ? 1.0 : 0.4,
    }}>
      {isExpanded ? (<>
        <TipsAndTricks />
        <hr/><hr/><hr/>
        <h3 style={{color: "gray"}}><center>TODO (ignore if ur not jakeonaut):</center></h3>
      </>) : (<>
        <div style={{fontSize: "15px", lineHeight: "26px"}}>&nbsp;How to Play:</div>
      </>)}
      <div onClick={()=>setIsExpanded((prev) => !prev)}
        style={{pointerEvents: "auto", userSelect: "none", border: "1px solid black", cursor: "pointer", width: "20px", position: "absolute", height: "20px", textAlign: "center", right: "3px", top: "3px", fontSize: "18px", lineHeight: "19px", background: "white",}}>
        {isExpanded ? "-" : "+"}
      </div>
      {isExpanded && (
      <ul style={{color: "gray"}}>
        <li>[ ] - :think: patterns????</li>
<hr/>
        <li>[ ] make it play nicer in mobile</li>
<hr/>
        <li>[ ] QOL - should we delete notes that were dragged off the left of the playhead? (when selected with an offset)</li>
        <li>clicking and dragging multiple triplet notes doesn't properly set their relative note offsets to each other</li>
        <li>same with clicking and dragging quarter notes when triplets are ALSO selected</li>
        <hr />
        <br/>
        <li>[ ] is there a way to change tempo dynamically in midi?</li>
      </ul>
    )}
    </div>
  );
}