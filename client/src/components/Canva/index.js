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

const Pointer = Object.freeze({
    Pencil: 1,
    Eraser: 2,
    Crosshair: 3,
});


function Canva({ socket, hasStarted, hasAdminConfigured, isPublic, admin, userGuest, amIArtistParent, waitingForNewArtist }) {
    // For dimensions of canvas
    const containerRef = useRef();
    const toolboxRef = useRef();
    const [dimensions, setDimensions] = useState({});
    const stageRef = useRef(null);
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
    const undoHistoryRef = useRef(undoHistory);
    const bufferRef = useRef([]);
    // Mouse pointer states
    const toolLocation = useRef(null); // {x: , y: }
    const toolPointer = useRef(Pointer.Pencil);
    const [drawingPointerStyle, setDrawingPointerStyle] = useState({ 'display': 'none' });


    // Drawing useEffects

    useEffect(() => {
        const interval1 = setInterval(() => {
            if (socket && amIArtist && bufferRef && bufferRef.current.length !== 0) {
                // console.log(bufferRef.current);
                socket.emit("provide-new-history", bufferRef.current, { ...dimensions });
                bufferRef.current = [];
            }
        }, 100);
        return () => {
            clearInterval(interval1);
        }
    }, [socket, amIArtist, dimensions]);


    useEffect(() => {
        socket?.on("get-new-history", (drawingChanges, originalDimensions) => {
            const scaleX = dimensions.width / originalDimensions.width;
            const scaleY = dimensions.height / originalDimensions.height;
            // history = history.map((value) => {
            //     switch (value.type) {
            //         case Tools.Pencil: {
            //             value.points = value.points.map((value, i) => {
            //                 if (i % 2 === 0)
            //                     value *= scaleX;
            //                 else
            //                     value *= scaleY;
            //                 return value;
            //             });
            //             break;
            //         }
            //         case Tools.Eraser: {
            //             value.points = value.points.map((value, i) => {
            //                 if (i % 2 === 0)
            //                     value *= scaleX;
            //                 else
            //                     value *= scaleY;
            //                 return value;
            //             });
            //             break;
            //         }
            //         case Tools.Rectangle: {
            //             value.x0 *= scaleX;
            //             value.y0 *= scaleY;
            //             value.x1 *= scaleX;
            //             value.y1 *= scaleY;
            //             break;
            //         }
            //         case Tools.Circle: {
            //             value.x *= scaleX;
            //             value.y *= scaleY;
            //             value.radius *= Math.min(scaleX, scaleY);
            //             break;
            //         }
            //         default:
            //             break;
            //     }
            //     return value;
            // });

            drawingChanges.forEach((value) => {
                switch (value?.action) {
                    case 'add': {
                        // TODO: Scaling
                        historyRef?.current.push(value?.drawing);
                        break;
                    }
                    case 'update': {
                        let lastDrawing = historyRef?.current[historyRef?.current.length - 1];
                        switch (lastDrawing?.type) {
                            case Tools.Pencil: {
                                // TODO: Scale value.point
                                lastDrawing.points = lastDrawing?.points.concat(Array.from(value.point));
                                break;
                            }
                            case Tools.Eraser: {
                                // TODO: Scale value.point
                                lastDrawing.points = lastDrawing?.points.concat(Array.from(value.point));
                                break;
                            }
                            case Tools.Rectangle: {
                                // TODO: Scale value.point
                                const point = Array.from(value.point);
                                lastDrawing.x1 = point[0];
                                lastDrawing.y1 = point[1];
                                break;
                            }
                            case Tools.Circle: {
                                // TODO: Scale value.point
                                const radius = value.radius;
                                lastDrawing.radius = radius;
                                break;
                            }
                            default:
                                break;
                        }
                        break;
                    }
                    default:
                        break;
                }
            });
            setHistory([...historyRef?.current]);
            undoHistoryRef.current = [];
            setUndoHistory([]);
        });

        return () => {
            socket.off("get-new-history");
        }
    }, [socket, amIArtist, dimensions]);


    useEffect(() => {
        historyRef.current = history;
    }, [history]);


    // Mouse location useEffects

    useEffect(() => {
        const interval2 = setInterval(() => {
            if (socket && amIArtist) {
                // console.log(toolLocation?.current, toolPointer?.current);
                socket.emit("provide-mouse-pointer", toolLocation?.current, toolPointer?.current);
            }
        }, 100);
        return () => {
            clearInterval(interval2);
        }
    }, [socket, amIArtist]);

    useEffect(() => {
        socket?.on("get-mouse-pointer", (location, pointerType) => {
            // console.log(location, pointerType);
            setDrawingToolPointer(location, pointerType);
        });
        return () => {
            socket?.off("get-mouse-pointer");
        }
    }, [socket, amIArtist]);

    useEffect(() => {
        if (amIArtist) {
            switch (tool) {
                case Tools.Pencil: {
                    toolPointer.current = Pointer.Pencil;
                    break;
                }
                case Tools.Eraser: {
                    toolPointer.current = Pointer.Eraser;
                    break;
                }
                case Tools.Rectangle:
                case Tools.Circle: {
                    toolPointer.current = Pointer.Crosshair;
                    break;
                }
                default:
                    break;
            }
        }
    }, [tool, amIArtist]);





    // Function to add new Drawing
    function addNewDrawing(pos, tool) {
        // console.log('New drawing');
        switch (tool) {
            case Tools.Pencil: {
                const newLine = {
                    type: Tools.Pencil,
                    points: [pos.x, pos.y],
                    strokeColor: strokeColor,
                    strokeWidth: strokeWidth
                };
                const newLineClone = {
                    type: Tools.Pencil,
                    points: [pos.x, pos.y],
                    strokeColor: strokeColor,
                    strokeWidth: strokeWidth
                };
                setHistory(history => [...history, newLine]);
                bufferRef?.current.push({ action: 'add', drawing: newLineClone });
                break;
            }
            case Tools.Eraser: {
                const newLine = {
                    type: Tools.Eraser,
                    points: [pos.x, pos.y],
                    strokeWidth: strokeWidth
                }
                const newLineClone = {
                    type: Tools.Eraser,
                    points: [pos.x, pos.y],
                    strokeWidth: strokeWidth
                }
                setHistory(history => [...history, newLine]);
                bufferRef?.current.push({ action: 'add', drawing: newLineClone });
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
                bufferRef?.current.push({ action: 'add', drawing: { ...newRectangle } });
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
                bufferRef?.current.push({ action: 'add', drawing: { ...newCircle } });
                break;
            }
            default:
                break;
        }
        undoHistoryRef.current = [];
    }

    // Update as mouse moves
    function updateLastDrawing(point, tool) {
        switch (tool) {
            case Tools.Pencil: {
                let lastLine = history[history.length - 1];
                lastLine.points = lastLine.points.concat([point.x, point.y]);
                history.splice(history.length - 1, 1, lastLine);
                setHistory(history.concat());
                // Set the buffer to send to other users
                if (bufferRef?.current?.length === 0 || bufferRef?.current[bufferRef?.current.length - 1].action !== 'update') {
                    bufferRef?.current?.push({ action: 'update', point: [point.x, point.y] });
                } else {
                    bufferRef?.current[bufferRef.current.length - 1].point.push(...[point.x, point.y]);
                }
                break;
            }
            case Tools.Eraser: {
                let lastLine = historyRef.current[historyRef.current.length - 1];
                lastLine.points = lastLine.points.concat([point.x, point.y]);
                setHistory([...historyRef.current]);
                // Set the buffer to send to other users
                if (bufferRef?.current?.length === 0 || bufferRef?.current[bufferRef?.current.length - 1].action !== 'update') {
                    bufferRef?.current?.push({ action: 'update', point: [point.x, point.y] });
                } else {
                    bufferRef?.current[bufferRef.current.length - 1].point.push(...[point.x, point.y]);
                }
                break;
            }
            case Tools.Rectangle: {
                let lastRectangle = history[history.length - 1];
                lastRectangle.x1 = point.x;
                lastRectangle.y1 = point.y;
                history.splice(history.length - 1, 1, lastRectangle);
                setHistory(history.concat());
                // Set the buffer to send to other users
                if (bufferRef?.current?.length === 0 || bufferRef?.current[bufferRef?.current.length - 1].action !== 'update') {
                    bufferRef?.current?.push({ action: 'update', point: [point.x, point.y] });
                } else {
                    bufferRef.current[bufferRef.current.length - 1].point = [point.x, point.y];
                }

                break;
            }
            case Tools.Circle: {
                let lastCircle = history[history.length - 1];
                const radius = Math.abs(Math.min(point.x - lastCircle.x, point.y - lastCircle.y));
                lastCircle.radius = radius;
                history.splice(history.length - 1, 1, lastCircle);
                setHistory(history.concat());
                // Set the buffer to send to other users
                if (bufferRef?.current?.length === 0 || bufferRef?.current[bufferRef?.current.length - 1].action !== 'update') {
                    bufferRef?.current?.push({ action: 'update', radius });
                } else {
                    bufferRef.current[bufferRef.current.length - 1].radius = radius;
                }
                break;
            }
            default:
                break;
        }
        undoHistoryRef.current = [];
    }


    // Drawing handlers
    const handleMouseDown = (e) => {
        if (!amIArtist) return;
        isDrawing.current = true;
        const pos = e.target.getStage().getPointerPosition();
        addNewDrawing(pos, tool);
    };

    const handleMouseMove = (e) => {
        if (!amIArtist) return;
        // no drawing - skipping
        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        if (isDrawing.current) {
            updateLastDrawing(point, tool);
        }
        // update tool location
        toolLocation.current = { x: point.x, y: point.y };
        setDrawingToolPointer(toolLocation?.current, toolPointer?.current);
    };

    const handleMouseUp = (e) => {
        if (!amIArtist) return;
        isDrawing.current = false;
    };

    const handleMouseLeave = (e) => {
        handleMouseUp(e);
        // Update tool location to null
        if (amIArtist) {
            toolLocation.current = null;
            setDrawingToolPointer(toolLocation?.current, toolPointer?.current);
        }
    }





    // Undo/Redo useEffects

    useEffect(() => {
        socket.on("undo-event-to-client", () => {
            handleUndo();
        });
        socket.on("redo-event-to-client", () => {
            handleRedo();
        });
        return () => {
            socket.off("undo-event-to-client");
            socket.off("redo-event-to-client");
        }
    }, [socket, amIArtist])



    // Undo (pop from history to push into undoHistory)
    const handleUndo = () => {
        console.log('undo');
        let lastShape = historyRef?.current.pop();
        if (lastShape) {
            setHistory([...historyRef?.current]);
            undoHistoryRef.current.push(lastShape);
            setUndoHistory([...undoHistoryRef?.current]);
        }
    }
    // Redo (pop from undoHistory to push into history)
    const handleRedo = () => {
        console.log('redo');
        let lastUndoShape = undoHistoryRef?.current.pop();
        if (lastUndoShape) {
            setUndoHistory([...undoHistoryRef?.current]);
            historyRef.current.push(lastUndoShape);
            setHistory([...historyRef?.current]);
        }
    }


    const undoEventHandler = (e) => {
        e.preventDefault();
        if (!amIArtist) return;
        handleUndo();
        if (socket && amIArtist)
            socket.emit("undo-event-from-client");
    }
    const redoEventHandler = (e) => {
        e.preventDefault();
        if (!amIArtist) return;
        handleRedo();
        if (socket && amIArtist)
            socket.emit("redo-event-from-client");
    }


    // TODO: create a state of pointer to improve rendering
    function setDrawingToolPointer(location, pointerType) {
        // console.log(location, pointerType);
        if (location && location.x && location.y) {
            const dynamicRadius = 20; // You can set your desired dynamic radius here
            setDrawingPointerStyle({
                display: '',
                left: (location.x + ((pointerType === Pointer.Pencil) ? 0 : (pointerType === Pointer.Eraser) ? -dynamicRadius : -10)) + 'px',
                top: (location.y + ((pointerType === Pointer.Pencil) ? -20 : (pointerType === Pointer.Eraser) ? -dynamicRadius : -10)) + 'px',
                backgroundImage: (() => {
                    if (pointerType === Pointer.Pencil)
                        return `url('/assets/cursors/pencil.svg')`;
                    else if (pointerType === Pointer.Crosshair)
                        return `url('/assets/cursors/crosshair.svg')`;
                    else if (pointerType === Pointer.Eraser) {
                        return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="${dynamicRadius * 2}" width="${dynamicRadius * 2}"><circle cx="${dynamicRadius}" cy="${dynamicRadius}" r="${dynamicRadius - 0.1}" fill="white" stroke="black" stroke-width="0.1"/></svg>')`;
                    } else
                        return ``;
                })(),
            });
        } else {
            // setDrawingPointerStyle({
            //     display: 'none',
            // });
        }
    }

    // Handling Toolbar
    const handleSetTool = (toolType) => {
        setTool(toolType);
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
                    onMouseLeave={handleMouseLeave}
                    ref={stageRef}
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
                <PointerDiv style={drawingPointerStyle} />

                {/* Tool selector for drawing */}
                {<Toolbox ref={toolboxRef}>
                    <img src='/assets/pencil.svg' className={'tool ' + (tool === Tools.Pencil ? 'selectedTool' : '')} alt=''
                        onClick={() => {
                            handleSetTool(Tools.Pencil);
                            // console.log(stageRef?.current?.attrs?.container?.style);
                            // if (stageRef?.current)
                            //     stageRef.current.attrs.container.style.cursor = 'url("/assets/cursors/pencil.svg") 0 20, auto';
                        }} />
                    <img src='/assets/eraser.svg' className={'tool ' + (tool === Tools.Eraser ? 'selectedTool' : '')} alt=''
                        onClick={() => {
                            handleSetTool(Tools.Eraser);
                        }} />
                    <img src='/assets/rectangle.svg' className={'tool ' + (tool === Tools.Rectangle ? 'selectedTool' : '')} alt=''
                        onClick={() => {
                            handleSetTool(Tools.Rectangle);
                        }} />
                    <img src='/assets/circle.svg' className={'tool ' + (tool === Tools.Circle ? 'selectedTool' : '')} alt=''
                        onClick={() => {
                            handleSetTool(Tools.Circle);
                        }} />
                    <RangeSelector
                        type='range'
                        min={1}
                        max={20}
                        value={strokeWidth}
                        onChange={(e) => { setStrokeWidth(e.target.value) }}
                    />
                    <img src='/assets/undo.svg' className="undo" alt='' onClick={undoEventHandler} />
                    <img src='/assets/redo.svg' className="redo" alt='' onClick={redoEventHandler} />
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

const PointerDiv = styled.div`
    width: 100%;
    height: 100%;
    background-repeat: no-repeat;
    position: absolute;
    top: 0;
    left: 0;
    /* background-color: red; */
    pointer-events: none;
`;

export default Canva;