import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components'
import { Composition } from './consts';
import { ActionButton, ActionButtonsContainer } from './styled';

const SongHeaderContainer = styled.div`
  background-color: white;
  height: 32px;
  display: flex;
  gap: 4px;
  outline: 1px solid black;
  margin: 2px;
  align-items: center;
`;
const DancingBabyImg = styled.img<{ $frame: number }>`
  margin: 8px 6px 10px 8px;
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  transform: scale(1.5);
  background-image: url('baby_dance_sheet.png');
  background-position: ${({ $frame }) => `${$frame*-20}px 0px`};
  cursor: pointer;
`;
const DivButton = styled.div`
  background: white;
  padding: 2px;
  border: 1px solid black;
  cursor: pointer;
`;

export function SongOptionsHeader({
  songName,
  setSongName,
  handleClearComposition,
  handleImportComposition,
  handleExportComposition,
  babyDanceFrame,
  incrementBabyDanceFrame,
}: {
  songName: string,
  setSongName: (songName: string) => void,
  handleClearComposition: () => void,
  handleImportComposition: () => void,
  handleExportComposition: () => void,
  babyDanceFrame: number,
  incrementBabyDanceFrame: () => void
}) {
  return (
    <>
      <SongHeaderContainer>
        <div><DancingBabyImg src="trans.png" $frame={babyDanceFrame} onClick={() => {
          incrementBabyDanceFrame();
        }}/></div>
        <div style={{ display: 'flex', flexDirection: 'column', }}>
          <div style={{ textAlign: 'left', }}>
            <b>Song Name:</b>&nbsp;
            <input type="text" value={songName} onChange={(e) => {
              setSongName(e.target.value)
            }} />
          </div>
        </div>
        <ActionButtonsContainer style={{ flexGrow: 1, marginRight: 8, justifyContent: 'end', }}>
          <DivButton onClick={handleClearComposition}>💣 New</DivButton>
          <DivButton onClick={handleExportComposition}>💾 Save</DivButton>
          <DivButton onClick={handleImportComposition}>📥 Load</DivButton>
        </ActionButtonsContainer>
      </SongHeaderContainer>
    </>
  );
}