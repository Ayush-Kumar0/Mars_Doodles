import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components';
import { Stage, Layer, Line } from 'react-konva';


function Canva() {
    // For dimensions of canvas
    const containerRef = useRef();
    const toolboxRef = useRef();
    const [dimensions, setDimensions] = useState({});
    // Drawing states
    const [tool, setTool] = React.useState('pen');
    const [lines, setLines] = React.useState([]);
    const isDrawing = React.useRef(false);


    // Layout and resizing of canvas 
    useEffect(() => {
        if (containerRef && toolboxRef) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight - toolboxRef.current.clientHeight - 2,
            });
            console.log(containerRef.current, toolboxRef);
        }
        return () => {
        }
    }, [containerRef, toolboxRef]);
    useEffect(() => {
        const handleResize = (e) => {
            if (containerRef && toolboxRef) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight - toolboxRef.current.clientHeight - 2,
                });
            }
        }
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); }
    }, []);


    // Drawing handlers
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
            <CanvaContainer ref={containerRef}>
                {/* Drawing board */}
                <Stage
                    className='stage'
                    width={dimensions.width}
                    height={dimensions.height}
                    onMouseDown={handleMouseDown}
                    onMousemove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
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
                <Toolbox ref={toolboxRef}>
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
    @media (max-width:720px) {
        order: -1;
        width: 100vw;
        height: 50vh;
        min-height: 50vh;
    }

    .stage {
        width: 100%;
        height: calc(100vh - var(--topbar-height) - var(--toolbox-height) - 4px);
        overflow: hidden;
        @media (max-width:720px) {
            height: calc(50vh - var(--topbar-height) - 4px);
        }
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