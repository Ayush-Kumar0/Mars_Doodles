import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components';
import { Stage, Layer, Line, Text } from 'react-konva';


function Canva() {
    const stageRef = useRef(null);
    const [tool, setTool] = React.useState('pen');
    const [lines, setLines] = React.useState([]);
    const isDrawing = React.useRef(false);


    const handleMouseDown = (e) => {
        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();
        setLines([...lines, { tool, points: [pos.x, pos.y] }]);
    };

    const handleMouseMove = (e) => {
        // no drawing - skipping
        if (!isDrawing.current) {
            return;
        }
        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        let lastLine = lines[lines.length - 1];
        // add point
        lastLine.points = lastLine.points.concat([point.x, point.y]);

        // replace last
        lines.splice(lines.length - 1, 1, lastLine);
        setLines(lines.concat());
    };

    const handleMouseUp = () => {
        isDrawing.current = false;
    };

    return (
        <>
            <CanvaContainer>
                {/* Drawing board */}
                <Stage
                    ref={stageRef}
                    className='stage'
                    width={window.innerWidth}
                    height={window.innerHeight}
                    onMouseDown={handleMouseDown}
                    onMousemove={handleMouseMove}
                    onMouseup={handleMouseUp}
                >
                    <Layer>
                        {lines.map((line, i) => (
                            <Line
                                key={i}
                                points={line.points}
                                stroke="#df4b26"
                                strokeWidth={5}
                                tension={0.5}
                                lineCap="round"
                                lineJoin="round"
                                globalCompositeOperation={
                                    line.tool === 'eraser' ? 'destination-out' : 'source-over'
                                }
                            />
                        ))}
                    </Layer>
                </Stage>

                {/* Tool selector for drawing */}
                <Toolbox>
                </Toolbox>
            </CanvaContainer>
        </>
    )
}


const CanvaContainer = styled.div`
    --toolbox-height: 40px;

    border: 2px double var(--primary);
    height: 100%;
    width: 60vw;
    min-height: calc(100vh - var(--topbar-height));
    position: relative;
    padding-bottom: var(--toolbox-height);

    .stage {
        width: 100%;
        height: calc(100vh - var(--topbar-height) - var(--toolbox-height) - 4px);
        overflow: hidden;
    }
`;


const Toolbox = styled.div`
    position: absolute;
    width: 100%;
    height: var(--toolbox-height);
    bottom: 0;
    background-color: var(--whitesmoke);
    box-sizing: border-box;
    border-top: 2px solid var(--primary);
`;

export default Canva;