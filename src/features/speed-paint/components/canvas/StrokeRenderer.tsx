import { useRef, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import { Stage, Layer, Shape } from 'react-konva';
import type Konva from 'konva';
import { alpha } from '@mui/material/styles';
import { useAnimationStore } from '../../store/animationStore';
import { setStageRef } from '../../lib/stageRef';
import { APP_BORDER } from '../../../../theme/tokens';

function drawTool(ctx: Konva.Context, x: number, y: number, tool: 'pencil' | 'brush'): void {
  ctx.save();
  ctx.translate(x, y);

  // Add a slight floating/bobbing animation based on position to make it look alive
  const bob = Math.sin(x * 0.1 + y * 0.1) * 2;
  ctx.translate(0, bob);

  // Rotate so tip is at 0,0 and pencil goes up and right
  ctx.rotate(-Math.PI / 4);

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;

  if (tool === 'pencil') {
    // Body
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-8, -100, 16, 80);

    // Wood
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(-8, -20);
    ctx.lineTo(8, -20);
    ctx.lineTo(0, 0);
    ctx.fill();

    // Lead
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(-3, -7.5);
    ctx.lineTo(3, -7.5);
    ctx.lineTo(0, 0);
    ctx.fill();

    // Metal band
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(-8, -110, 16, 10);

    // Eraser
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(-8, -120, 16, 10);
  } else {
    // Marker / Brush
    // Body
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-10, -100, 20, 80);

    // Tip base
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(-8, -20, 16, 10);

    // Felt tip
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(-6, -10);
    ctx.lineTo(6, -10);
    ctx.lineTo(2, 0);
    ctx.lineTo(-2, 0);
    ctx.fill();

    // Cap area
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-10, -120, 20, 20);
  }

  ctx.restore();
}

export function StrokeRenderer() {
  const { job, progress } = useAnimationStore();
  const animation = job.animation;
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  // Offscreen buffer for the whiteboard effect
  const bufferRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const sourceImage = animation?.resizedImage || job.inputImage;
    if (sourceImage) {
      const img = new window.Image();
      img.src = sourceImage;
      img.onload = () => setImageObj(img);
    }
  }, [animation?.resizedImage, job.inputImage]);

  // Expose stageRef via module-level ref (replaces window.__stageRef)
  useEffect(() => {
    setStageRef(stageRef.current ?? null);
  }, [animation]);

  // Track the last rendered stroke index to avoid re-drawing everything every frame
  const lastRenderedIndexRef = useRef<number>(-1);

  // Initialize buffer canvas and reset tracker
  useEffect(() => {
    if (animation) {
      const canvas = document.createElement('canvas');
      canvas.width = animation.canvasWidth;
      canvas.height = animation.canvasHeight;
      bufferRef.current = canvas;
      lastRenderedIndexRef.current = -1;
    }
  }, [animation]);

  // Reset tracker when progress goes backwards (restart/seek)
  useEffect(() => {
    if (progress < (lastRenderedIndexRef.current / (animation?.strokes.length || 1))) {
      lastRenderedIndexRef.current = -1;
    }
  }, [progress, animation?.strokes.length]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        // Use window height to constrain the maximum height, leaving room for header and controls
        const maxHeight = Math.max(300, window.innerHeight - 250);
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: maxHeight,
        });
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();

    // Slight delay to ensure layout is complete
    const timeoutId = setTimeout(updateSize, 100);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeoutId);
    };
  }, [animation]);

  if (!animation) return null;

  const totalStrokes = animation.strokes.length;
  const visibleStrokesCount = Math.floor(progress * totalStrokes);

  // Calculate scaling to fit the container width AND height while maintaining aspect ratio
  const scaleX = animation.canvasWidth > 0 ? containerSize.width / animation.canvasWidth : 1;
  const scaleY = animation.canvasHeight > 0 ? containerSize.height / animation.canvasHeight : 1;
  const scale = Math.min(scaleX, scaleY, 1) || 1;

  const displayWidth = animation.canvasWidth * scale;
  const displayHeight = animation.canvasHeight * scale;

  return (
    <Box
      ref={containerRef}
      id="paint-canvas-container"
      sx={(theme) => ({
        width: '100%',
        maxWidth: 896,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: alpha(theme.palette.background.default, 0.6),
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${APP_BORDER}`,
        boxShadow: `0 24px 80px ${alpha('#020617', 0.55)}`,
        height: displayHeight,
      })}
    >
      <Box
        sx={{
          width: displayWidth,
          height: displayHeight,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            width: animation.canvasWidth,
            height: animation.canvasHeight,
            position: 'absolute',
            top: '50%',
            left: '50%',
            mt: -animation.canvasHeight / 2,
            ml: -animation.canvasWidth / 2,
          }}
        >
          <Stage
            ref={stageRef}
            width={animation.canvasWidth}
            height={animation.canvasHeight}
          >
            {/* Single Layer for everything to ensure reliable video capture */}
            <Layer listening={false}>
              <Shape
                listening={false}
                perfectDrawEnabled={false}
                sceneFunc={(context) => {
                  const { canvasWidth, canvasHeight, canvasColor } = animation;

                  // 1. Draw the original image as the base
                  if (imageObj) {
                    context.drawImage(imageObj, 0, 0, canvasWidth, canvasHeight);
                  }

                  // 2. Prepare the "Whiteboard" buffer
                  const buffer = bufferRef.current;
                  if (!buffer) return;
                  const bCtx = buffer.getContext('2d')!;

                  // OPTIMIZATION: Incremental Drawing
                  if (lastRenderedIndexRef.current === -1 || visibleStrokesCount < lastRenderedIndexRef.current) {
                    bCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                    bCtx.globalCompositeOperation = 'source-over';
                    bCtx.fillStyle = canvasColor === 'white' ? '#ffffff' : '#000000';
                    bCtx.fillRect(0, 0, canvasWidth, canvasHeight);
                    lastRenderedIndexRef.current = 0;
                  }

                  bCtx.lineCap = 'round';
                  bCtx.lineJoin = 'round';

                  let currentStyle = '';
                  let currentWidth = -1;
                  let currentType = '';
                  let isDrawing = false;

                  for (let i = lastRenderedIndexRef.current; i < visibleStrokesCount; i++) {
                    const stroke = animation.strokes[i];
                    const style = stroke.type === 'reveal'
                      ? 'rgba(0,0,0,1)'
                      : `rgba(${stroke.r}, ${stroke.g}, ${stroke.b}, ${stroke.alpha})`;

                    if (stroke.type !== currentType || style !== currentStyle || stroke.lineWidth !== currentWidth) {
                      if (isDrawing) {
                        bCtx.stroke();
                      }
                      bCtx.globalCompositeOperation = stroke.type === 'sketch' ? 'source-over' : 'destination-out';
                      bCtx.strokeStyle = style;
                      bCtx.lineWidth = stroke.lineWidth;
                      bCtx.beginPath();

                      currentType = stroke.type;
                      currentStyle = style;
                      currentWidth = stroke.lineWidth;
                      isDrawing = true;
                    }

                    bCtx.moveTo(stroke.points[0], stroke.points[1]);
                    if (stroke.points.length === 6) {
                      bCtx.quadraticCurveTo(stroke.points[2], stroke.points[3], stroke.points[4], stroke.points[5]);
                    } else {
                      bCtx.lineTo(stroke.points[2], stroke.points[3]);
                    }
                  }

                  if (isDrawing) {
                    bCtx.stroke();
                  }

                  lastRenderedIndexRef.current = visibleStrokesCount;

                  // 4. Draw the buffer onto the main canvas
                  context.globalCompositeOperation = 'source-over';
                  context.drawImage(buffer, 0, 0);

                  // 5. Draw the drawing tool (pencil/brush)
                  if (visibleStrokesCount > 0 && visibleStrokesCount < totalStrokes) {
                    const lastStroke = animation.strokes[visibleStrokesCount - 1];
                    const toolType = lastStroke.type === 'sketch' ? 'pencil' : 'brush';
                    const endX = lastStroke.points.length === 6 ? lastStroke.points[4] : lastStroke.points[2];
                    const endY = lastStroke.points.length === 6 ? lastStroke.points[5] : lastStroke.points[3];
                    drawTool(context, endX, endY, toolType);
                  }
                }}
              />
            </Layer>
          </Stage>
        </Box>
      </Box>
    </Box>
  );
}
