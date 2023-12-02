import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import WaitingToStart from '../Loader/WaitingToStart';
import Lobby from '../Loader/Lobby';

const Tools = Object.freeze({
    Pencil: 1,
    Eraser: 2,
    Rectangle: 3,
    Circle: 4
});


function Canva({ socket, hasStarted, hasAdminConfigured, isPublic, admin, userGuest, amIArtistParent, waitingForNewArtist }) {
    // For dimensions of canvas
    const containerRef = useRef();
    const toolboxRef = useRef();
    const [dimensions, setDimensions] = useState({});
    // Auth states
    const [amIAdmin, setAmIAdmin] = useState(false);
    const [amIArtist, setAmIArtist] = useState(amIArtistParent);

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

    // Set whether you are admin or not
    useEffect(() => {
        const userid = (userGuest && userGuest.user) ? userGuest.user._id : null;
        if (admin && userid === admin.id) {
            setAmIAdmin(true);
        } else
            setAmIAdmin(false);
    }, [admin, userGuest]);

    // Set whether you are artist or not
    useEffect(() => {
        setAmIArtist(amIArtistParent);
    }, [amIArtistParent]);
    useEffect(() => {
        setHistory([]);
    }, [waitingForNewArtist]);


    // Drawing states
    const [tool, setTool] = React.useState(Tools.Pencil);
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [strokeColor, setStrokeColor] = useState("#df4b26");
    const isDrawing = React.useRef(false);
    const [history, setHistory] = useState([]); // Use it like a linear list of operations
    const [undoHistory, setUndoHistory] = useState([]); // Use it like a stack
    const historyRef = useRef(history);


    useEffect(() => {
        const interval = setInterval(() => {
            if (socket && amIArtist && historyRef) {
                socket.emit("provide-new-history", historyRef.current, { ...dimensions });
            }
        }, 25);
        return () => {
            clearInterval(interval);
        }
    }, [socket, amIArtist]);




    useEffect(() => {
        socket.on("get-new-history", (history, originalDimensions) => {
            // setHistory(history);
            const scaleX = dimensions.width / originalDimensions.width;
            const scaleY = dimensions.height / originalDimensions.height;
            history = history.map((value) => {
                switch (value.type) {
                    case Tools.Pencil: {
                        value.points = value.points.map((value, i) => {
                            if (i % 2 === 0)
                                value *= scaleX;
                            else
                                value *= scaleY;
                            return value;
                        });
                        break;
                    }
                    case Tools.Eraser: {
                        value.points = value.points.map((value, i) => {
                            if (i % 2 === 0)
                                value *= scaleX;
                            else
                                value *= scaleY;
                            return value;
                        });
                        break;
                    }
                    case Tools.Rectangle: {
                        value.x0 *= scaleX;
                        value.y0 *= scaleY;
                        value.x1 *= scaleX;
                        value.y1 *= scaleY;
                        break;
                    }
                    case Tools.Circle: {
                        value.x *= scaleX;
                        value.y *= scaleY;
                        value.radius *= Math.min(scaleX, scaleY);
                        break;
                    }
                    default:
                        break;
                }
                return value;
            });
            setHistory(history);
        });
        return () => {
            socket.off("get-new-history");
        }
    }, [socket, amIArtist, dimensions]);






    useEffect(() => {
        historyRef.current = history;
    }, [history]);


    // Drawing handlers
    const handleMouseDown = (e) => {
        if (!amIArtist) return;
        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();
        switch (tool) {
            case Tools.Pencil: {
                const newLine = {
                    type: Tools.Pencil,
                    points: [pos.x, pos.y],
                    strokeColor: strokeColor,
                    strokeWidth: strokeWidth
                }
                setHistory([...history, newLine]);
                break;
            }
            case Tools.Eraser: {
                const newLine = {
                    type: Tools.Eraser,
                    points: [pos.x, pos.y],
                    strokeWidth: strokeWidth
                }
                setHistory([...history, newLine]);
                break;
            }
            case Tools.Rectangle: {
                const newRectangle = {
                    type: Tools.Rectangle,
                    strokeColor: strokeColor,
                    strokeWidth: strokeWidth,
                    x0: pos.x,
                    y0: pos.y,
                    x1: pos.x,
                    y1: pos.y,
                }
                setHistory([...history, newRectangle]);
                break;
            }
            case Tools.Circle: {
                const newCircle = {
                    type: Tools.Circle,
                    strokeColor: strokeColor,
                    strokeWidth: strokeWidth,
                    x: pos.x,
                    y: pos.y,
                    radius: 1
                }
                setHistory([...history, newCircle]);
                break;
            }
            default:
                break;
        }
    };

    const handleMouseMove = (e) => {
        if (!amIArtist) return;
        // no drawing - skipping
        if (!isDrawing.current) {
            return;
        }
        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        switch (tool) {
            case Tools.Pencil: {
                let lastLine = history[history.length - 1];
                lastLine.points = lastLine.points.concat([point.x, point.y]);
                history.splice(history.length - 1, 1, lastLine);
                setHistory(history.concat());
                break;
            }
            case Tools.Eraser: {
                let lastLine = history[history.length - 1];
                lastLine.points = lastLine.points.concat([point.x, point.y]);
                history.splice(history.length - 1, 1, lastLine);
                setHistory(history.concat());
                break;
            }
            case Tools.Rectangle: {
                let lastRectangle = history[history.length - 1];
                lastRectangle.x1 = point.x;
                lastRectangle.y1 = point.y;
                history.splice(history.length - 1, 1, lastRectangle);
                setHistory(history.concat());
                break;
            }
            case Tools.Circle: {
                let lastCircle = history[history.length - 1];
                lastCircle.radius = Math.abs(Math.min(point.x - lastCircle.x, point.y - lastCircle.y));
                history.splice(history.length - 1, 1, lastCircle);
                setHistory(history.concat());
                break;
            }
            default:
                break;
        }
    };

    const handleMouseUp = () => {
        if (!amIArtist) return;
        isDrawing.current = false;
    };


    // Undo (pop from history to push into undoHistory)
    const handleUndo = (e) => {
        if (!amIArtist) return;
        console.log('undo');
        let lastShape = history.pop();
        if (lastShape) {
            setHistory(history.concat());
            undoHistory.push(lastShape);
            setUndoHistory(undoHistory.concat());
        }
    }
    // Redo (pop from undoHistory to push into history)
    const handleRedo = (e) => {
        if (!amIArtist) return;
        console.log('redo');
        let lastUndoShape = undoHistory.pop();
        if (lastUndoShape) {
            setUndoHistory(undoHistory.concat());
            history.push(lastUndoShape);
            setHistory(history.concat());
        }
    }


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
                        {history.map((shape, i) => {
                            switch (shape.type) {
                                case Tools.Pencil:
                                    return <Line
                                        key={i}
                                        points={shape.points}
                                        stroke={shape.strokeColor}
                                        strokeWidth={shape.strokeWidth}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                    />
                                    break;
                                case Tools.Eraser:
                                    return <Line
                                        key={i}
                                        points={shape.points}
                                        stroke={"white"}
                                        strokeWidth={shape.strokeWidth}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                    />
                                    break;
                                case Tools.Rectangle:
                                    return <Rect
                                        key={i}
                                        x={shape.x0}
                                        y={shape.y0}
                                        width={shape.x1 - shape.x0}
                                        height={shape.y1 - shape.y0}
                                        stroke={shape.strokeColor}
                                        strokeWidth={shape.strokeWidth}
                                    />
                                    break;
                                case Tools.Circle:
                                    return <Circle
                                        key={i}
                                        x={shape.x}
                                        y={shape.y}
                                        radius={shape.radius}
                                        stroke={shape.strokeColor}
                                        strokeWidth={shape.strokeWidth}
                                    />
                                    break;
                                default:
                                    break;
                            }
                            return <></>;
                        })}
                    </Layer>
                </Stage>

                {/* Tool selector for drawing */}
                {<Toolbox ref={toolboxRef}>
                    <img src='/assets/pencil.svg' className={'tool ' + (tool === Tools.Pencil ? 'selectedTool' : '')} onClick={() => { setTool(Tools.Pencil) }} />
                    <img src='/assets/eraser.svg' className={'tool ' + (tool === Tools.Eraser ? 'selectedTool' : '')} onClick={() => { setTool(Tools.Eraser) }} />
                    <img src='/assets/rectangle.svg' className={'tool ' + (tool === Tools.Rectangle ? 'selectedTool' : '')} onClick={() => { setTool(Tools.Rectangle) }} />
                    <img src='/assets/circle.svg' className={'tool ' + (tool === Tools.Circle ? 'selectedTool' : '')} onClick={() => { setTool(Tools.Circle) }} />
                    <RangeSelector
                        type='range'
                        min={1}
                        max={20}
                        value={strokeWidth}
                        onChange={(e) => { setStrokeWidth(e.target.value) }}
                    />
                    <img src='/assets/undo.svg' className="undo" onClick={handleUndo} />
                    <img src='/assets/redo.svg' className="redo" onClick={handleRedo} />
                </Toolbox>}
                {(!hasStarted && !isPublic && amIAdmin && !hasAdminConfigured && <Lobby />) || (!hasStarted && <WaitingToStart />)}
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
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    .tool {
        padding: 3px;
    }
    .selectedTool {
        background: var(--primary);
        border-radius: 50%;
    }
    .undo, .redo, .tool {
        cursor: pointer;
        transition: transform 0.3s ease-in;
    }
    .undo:active, .redo:active, .tool:active {
        animation: pulse 0.3s ease;
    }
    @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(0.9);
        }
        100% {
            transform: scale(1);
        }
    }
`;


const RangeSelector = styled.input`

`;

export default Canva;