import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'
import styled from 'styled-components';
import { Stage, Layer, Line, Rect, Ellipse } from 'react-konva';
import WaitingToStart from '../Loader/WaitingToStart';
import Lobby from '../Loader/Lobby';
import { HexColorPicker } from 'react-colorful';

const Tools = Object.freeze({
    Pencil: 1,
    Eraser: 2,
    Rectangle: 3,
    Ellipse: 4,
});

const Pointer = Object.freeze({
    Pencil: 1,
    Eraser: 2,
    Crosshair: 3,
});

const eraserMultiplier = 5;

const Canva = React.forwardRef(({ socket, hasStarted, hasAdminConfigured, isPublic, admin, userGuest, amIArtistParent, waitingForNewArtist }, ref) => {
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
        }
        return () => {
        }
    }, [containerRef, toolboxRef]);
    useEffect(() => {
        const handleResize = (e) => {
            if (containerRef && toolboxRef) {
                setDimensions(prevDims => {
                    const finalDims = {
                        width: containerRef.current.clientWidth,
                        height: containerRef.current.clientHeight - toolboxRef.current.clientHeight - 2,
                    };
                    // const scaleX = 1.0 * prevDims.width / finalDims.width;
                    // const scaleY = 1.0 * prevDims.height / finalDims.height;
                    // // Resizing history
                    // const newHistory = [];
                    // historyRef?.current?.forEach(drawing => {
                    //     switch (drawing.type) {
                    //         case Tools.Pencil:
                    //         case Tools.Eraser:
                    //             drawing.points = drawing?.points?.map((pnt, i) => {
                    //                 if (i % 2 === 0) return Math.floor(pnt * scaleX);
                    //                 else return Math.floor(pnt * scaleY);
                    //             });
                    //             break;
                    //         case Tools.Rectangle:
                    //             drawing.x0 = drawing.x0 * scaleX;
                    //             drawing.y0 = drawing.y0 * scaleY;
                    //             drawing.x1 = drawing.x1 * scaleX;
                    //             drawing.y1 = drawing.y1 * scaleY;
                    //             break;
                    //         case Tools.Ellipse:
                    //             drawing.x = drawing.x * scaleX;
                    //             drawing.y = drawing.y * scaleY;
                    //             drawing.radiusX = drawing.radiusX * scaleX;
                    //             drawing.radiusY = drawing.radiusY * scaleY;
                    //             break;
                    //         default:
                    //             break;
                    //     }

                    // });
                    // setHistory([...historyRef.current]);
                    return finalDims;
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
    const [strokeColor, setStrokeColor] = useState("#000000");
    const [colorPickerState, setColorPickerState] = useState(false);
    const isDrawing = React.useRef(false);
    const [history, setHistory] = useState([]); // Use it like a linear list of operations
    const [undoHistory, setUndoHistory] = useState([]); // Use it like a stack
    const historyRef = useRef(history);
    const undoHistoryRef = useRef(undoHistory);
    const bufferRef = useRef([]);
    // Mouse pointer states
    const toolLocation = useRef(null); // {x: , y: }
    const toolPointer = useRef({ type: Pointer.Pencil }); // {type: , size: }
    const [drawingPointerStyle, setDrawingPointerStyle] = useState({ 'display': 'none' });


    // Drawing useEffects

    useEffect(() => {
        const interval1 = setInterval(() => {
            if (socket && amIArtist && bufferRef && bufferRef.current.length !== 0) {
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

            drawingChanges.forEach((value) => {
                switch (value?.action) {
                    case 'add': {
                        // TODO: Scaling
                        switch (value.drawing.type) {
                            case Tools.Pencil:
                            case Tools.Eraser:
                                value.drawing.points = value?.drawing?.points?.map((pnt, i) => {
                                    if (i % 2 === 0) return Math.floor(pnt * scaleX);
                                    else return Math.floor(pnt * scaleY);
                                });
                                break;
                            case Tools.Rectangle:
                                value.drawing.x0 = value.drawing.x0 * scaleX;
                                value.drawing.y0 = value.drawing.y0 * scaleY;
                                value.drawing.x1 = value.drawing.x0;
                                value.drawing.y1 = value.drawing.y0;
                                break;
                            case Tools.Ellipse:
                                value.drawing.x = value.drawing.x * scaleX;
                                value.drawing.y = value.drawing.y * scaleY;
                                break;
                            default:
                                break;
                        }
                        historyRef?.current.push(value?.drawing);
                        break;
                    }
                    case 'update': {
                        let lastDrawing = historyRef?.current[historyRef?.current.length - 1];
                        switch (lastDrawing?.type) {
                            case Tools.Pencil: {
                                // TODO: Scale value.point
                                value.point = value?.point?.map((pnt, i) => {
                                    if (i % 2 === 0) return Math.floor(pnt * scaleX);
                                    else return Math.floor(pnt * scaleY);
                                });
                                lastDrawing.points = lastDrawing?.points.concat(Array.from(value.point));
                                break;
                            }
                            case Tools.Eraser: {
                                // TODO: Scale value.point
                                value.point = value?.point?.map((pnt, i) => {
                                    if (i % 2 === 0) return Math.floor(pnt * scaleX);
                                    else return Math.floor(pnt * scaleY);
                                });
                                lastDrawing.points = lastDrawing?.points.concat(Array.from(value.point));
                                break;
                            }
                            case Tools.Rectangle: {
                                // TODO: Scale endpoints
                                value.point = value?.point?.map((pnt, i) => {
                                    if (i % 2 === 0) return Math.floor(pnt * scaleX);
                                    else return Math.floor(pnt * scaleY);
                                });
                                const point = Array.from(value.point);
                                lastDrawing.x1 = point[0];
                                lastDrawing.y1 = point[1];
                                break;
                            }
                            case Tools.Ellipse: {
                                // TODO: Scale radius
                                const radiusX = value.radiusX * scaleX;
                                const radiusY = value.radiusY * scaleY;
                                lastDrawing.radiusX = radiusX;
                                lastDrawing.radiusY = radiusY;
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
            if (toolLocation?.current && socket && amIArtist) {
                socket.emit("provide-mouse-pointer", toolLocation?.current, toolPointer?.current, dimensions);
            }
        }, 100);
        return () => {
            clearInterval(interval2);
        }
    }, [socket, amIArtist, dimensions]);

    useEffect(() => {
        socket?.on("get-mouse-pointer", (location, pointerType, originalDimensions) => {
            setDrawingToolPointer(location, pointerType, originalDimensions);
        });
        return () => {
            socket?.off("get-mouse-pointer");
        }
    }, [socket, amIArtist, dimensions]);

    useEffect(() => {
        if (amIArtist) {
            switch (tool) {
                case Tools.Pencil: {
                    toolPointer.current = { type: Pointer.Pencil };
                    break;
                }
                case Tools.Eraser: {
                    toolPointer.current = { type: Pointer.Eraser, size: strokeWidth * eraserMultiplier };
                    break;
                }
                case Tools.Rectangle:
                case Tools.Ellipse: {
                    toolPointer.current = { type: Pointer.Crosshair };
                    break;
                }
                default:
                    break;
            }
        }
    }, [tool, amIArtist, strokeWidth]);





    // Function to add new Drawing
    function addNewDrawing(pos, tool) {
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
                    strokeWidth: strokeWidth * eraserMultiplier
                }
                const newLineClone = {
                    type: Tools.Eraser,
                    points: [pos.x, pos.y],
                    strokeWidth: strokeWidth * eraserMultiplier
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
            case Tools.Ellipse: {
                const newEllipse = {
                    type: Tools.Ellipse,
                    strokeColor: strokeColor,
                    strokeWidth: strokeWidth,
                    x: pos.x,
                    y: pos.y,
                    radiusX: 0,
                    radiusY: 0,
                }
                setHistory([...history, newEllipse]);
                bufferRef?.current.push({ action: 'add', drawing: { ...newEllipse } });
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
            case Tools.Ellipse: {
                let lastEllipse = history[history.length - 1];
                lastEllipse.radiusX = Math.abs(point.x - lastEllipse.x);
                lastEllipse.radiusY = Math.abs(point.y - lastEllipse.y);
                history.splice(history.length - 1, 1, lastEllipse);
                setHistory(history.concat());
                // Set the buffer to send to other users
                if (bufferRef?.current?.length === 0 || bufferRef?.current[bufferRef?.current.length - 1].action !== 'update') {
                    bufferRef?.current?.push({ action: 'update', radiusX: lastEllipse.radiusX, radiusY: lastEllipse.radiusY });
                } else {
                    bufferRef.current[bufferRef.current.length - 1].radiusX = lastEllipse.radiusX;
                    bufferRef.current[bufferRef.current.length - 1].radiusY = lastEllipse.radiusY;
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
        let lastShape = historyRef?.current.pop();
        if (lastShape) {
            setHistory([...historyRef?.current]);
            undoHistoryRef.current.push(lastShape);
            setUndoHistory([...undoHistoryRef?.current]);
        }
    }
    // Redo (pop from undoHistory to push into history)
    const handleRedo = () => {
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
    function setDrawingToolPointer(location, pointerType, originalDimensions) {
        if (!originalDimensions || !originalDimensions.height || !originalDimensions.width) {
            originalDimensions = {
                width: dimensions.width,
                height: dimensions.height,
            };
        }
        const scaleX = 1.0 * dimensions.width / originalDimensions.width;
        const scaleY = 1.0 * dimensions.height / originalDimensions.height;
        if (dimensions && dimensions.height && dimensions.width && location && location.x && location.y && pointerType && pointerType.type) {
            location.x = Math.floor(location.x * scaleX);
            location.y = Math.floor(location.y * scaleY);
            const dynamicRadius = pointerType.size / 2 || 10; // You can set your desired dynamic radius here
            setDrawingPointerStyle({
                display: '',
                left: (location.x + ((pointerType.type === Pointer.Pencil) ? 0 : (pointerType.type === Pointer.Eraser) ? -dynamicRadius : -10)) + 'px',
                top: (location.y + ((pointerType.type === Pointer.Pencil) ? -20 : (pointerType.type === Pointer.Eraser) ? -dynamicRadius : -10)) + 'px',
                backgroundImage: (() => {
                    if (pointerType.type === Pointer.Pencil)
                        return `url('/assets/cursors/pencil.svg')`;
                    else if (pointerType.type === Pointer.Crosshair)
                        return `url('/assets/cursors/crosshair.svg')`;
                    else if (pointerType.type === Pointer.Eraser) {
                        return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="${dynamicRadius * 2}" width="${dynamicRadius * 2}"><circle cx="${dynamicRadius}" cy="${dynamicRadius}" r="${dynamicRadius - 0.1}" fill="white" stroke="black" stroke-width="0.1"/></svg>')`;
                    } else
                        return ``;
                })(),
            });
        } else {
            setDrawingPointerStyle({
                display: 'none',
            });
        }
    }

    // Handling Toolbar
    const handleSetTool = (toolType) => {
        setTool(toolType);
    }


    // Mouse click outside color picker
    useEffect(() => {
        const mouseOutEvent = (e) => {
            if (colorPickerState) {
                const ele1 = document.getElementsByClassName('hex-color-picker')[0];
                const ele2 = document.getElementsByClassName('color-pick-btn')[0];
                if (ele1 && !ele1.contains(e.target) && ele2 && !ele2.contains(e.target)) {
                    setColorPickerState(false);
                }
            }
        }
        document.body.addEventListener('mousedown', mouseOutEvent);
        return () => {
            document.body.removeEventListener('mousedown', mouseOutEvent);
        }
    }, [colorPickerState]);


    // Export the image to system
    useImperativeHandle(ref, () => ({
        exportImage: () => {
            const stage = stageRef.current.getStage();
            const dataURL = stage.toDataURL();
            const downloadLink = document.createElement('a');
            downloadLink.href = dataURL;
            downloadLink.download = 'stage_export.png';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    }), []);





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
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                    ref={stageRef}
                >
                    <Layer>
                        <Rect
                            x={0}
                            y={0}
                            width={dimensions.width}
                            height={dimensions.height}
                            fill='white'
                            key={-1}
                        />
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
                                case Tools.Ellipse:
                                    return <Ellipse
                                        key={i}
                                        x={shape.x}
                                        y={shape.y}
                                        radiusX={shape.radiusX}
                                        radiusY={shape.radiusY}
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
                    <ColorPickDiv>
                        <HexColorPicker className='hex-color-picker' color={strokeColor} onChange={setStrokeColor}
                            style={{ visibility: (colorPickerState === true) ? 'visible' : 'hidden' }}
                        />
                        <ColorPickBtn className='color-pick-btn' strokecolor={strokeColor} onClick={() => { setColorPickerState(state => !state) }}>{strokeColor}</ColorPickBtn>
                    </ColorPickDiv>
                    <img src='/assets/pencil.svg' className={'tool ' + (tool === Tools.Pencil ? 'selectedTool' : '')} alt=''
                        onClick={() => {
                            handleSetTool(Tools.Pencil);
                        }} />
                    <img src='/assets/eraser.svg' className={'tool ' + (tool === Tools.Eraser ? 'selectedTool' : '')} alt=''
                        onClick={() => {
                            handleSetTool(Tools.Eraser);
                        }} />
                    <img src='/assets/rectangle.svg' className={'tool ' + (tool === Tools.Rectangle ? 'selectedTool' : '')} alt=''
                        onClick={() => {
                            handleSetTool(Tools.Rectangle);
                        }} />
                    <img src='/assets/circle.svg' className={'tool ' + (tool === Tools.Ellipse ? 'selectedTool' : '')} alt=''
                        onClick={() => {
                            handleSetTool(Tools.Ellipse);
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
});





const CanvaContainer = styled.div`
    --toolbox-height: 40px;

    border: 2px double var(--primary);
    height: 100%;
    width: 60vw;
    min-height: calc(100vh - var(--topbar-height));
    min-height: calc(100svh - var(--topbar-height));
    position: relative;
    padding-bottom: var(--toolbox-height);
    overflow: hidden;
    @media (max-width:710px) {
        order: -1;
        width: 100%;
        height: 50vh;
        height: 50svh;
        min-height: 50vh;
        min-height: 50svh;
    }

    .stage {
        width: 100%;
        height: calc(100vh - var(--topbar-height) - var(--toolbox-height) - 4px);
        height: calc(100svh - var(--topbar-height) - var(--toolbox-height) - 4px);
        overflow: hidden;
        @media (max-width:710px) {
            height: calc(50vh - var(--topbar-height) - 4px);
            height: calc(50svh - var(--topbar-height) - 4px);
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
        @media (max-width:710px) {
            width: 27px;
        }
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

const ColorPickDiv = styled.div`
    height: 100%;
    position: relative;
    .hex-color-picker {
        height: 150px;
        width: 150px;
        position: absolute;
        z-index: 2;
        top: -150px;
        left: 0px;
        .react-colorful__saturation {
            border-bottom: none;
        }
    }
`;

const ColorPickBtn = styled.button.attrs(props => ({
    style: {
        backgroundColor: props.strokecolor,
    },
}))`
    border-radius: 7px;
    height: 70%;
    min-width: 70px;
    border: 1px solid white;
    color: white;
    margin-right: 4px;
    position: relative;
    top: 15%;
    right: 0px;
    z-index: 2;
`;


const RangeSelector = styled.input`
    @media (max-width:710px) {
        width: 120px;
    }
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