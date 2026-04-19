import type { Stroke, StrokeAnimation } from '../types';

export async function generateStrokesFromImage(dataUrl: string, onProgress: (p: number) => void): Promise<StrokeAnimation> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Resize to high resolution for quality (max 1920x1080)
      const maxW = 1920;
      const maxH = 1080;
      let width = img.width;
      let height = img.height;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Fill with white background first to handle transparent PNGs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      // Save the resized image to prevent holding massive 4K images in memory
      const resizedImage = canvas.toDataURL('image/jpeg', 0.9);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const strokes: Stroke[] = [];
      let strokeId = 0;

      // Let UI update before heavy processing
      setTimeout(() => {
        // --- PHASE 1: SKETCH (Edge Detection) ---
        const grayscale = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
          grayscale[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }

        const edges = new Uint8Array(width * height);
        for (let y = 0; y < height - 1; y++) {
          for (let x = 0; x < width - 1; x++) {
            const curr = grayscale[y * width + x];
            const right = grayscale[y * width + x + 1];
            const bottom = grayscale[(y + 1) * width + x];
            const diff = Math.abs(curr - right) + Math.abs(curr - bottom);
            if (diff > 20) { // Lowered threshold for more detailed edges
              edges[y * width + x] = 1;
            }
          }
        }

        const visitedEdges = new Uint8Array(width * height);
        const clusters: Array<{ pixels: number[], minX: number, minY: number, maxX: number, maxY: number }> = [];

        // 1. Group connected edges into "Objects" (Islands)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (edges[idx] && !visitedEdges[idx]) {
              const queue = [idx];
              visitedEdges[idx] = 1;
              const clusterPixels: number[] = [];
              let minX = width;
              let minY = height;
              let maxX = 0;
              let maxY = 0;

              let head = 0;
              while (head < queue.length) {
                const currIdx = queue[head++];
                clusterPixels.push(currIdx);
                const cy = Math.floor(currIdx / width);
                const cx = currIdx % width;

                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;

                // 5x5 search to jump small gaps in lines and group nearby elements
                for (let dy = -2; dy <= 2; dy++) {
                  for (let dx = -2; dx <= 2; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                      const nIdx = ny * width + nx;
                      if (edges[nIdx] && !visitedEdges[nIdx]) {
                        visitedEdges[nIdx] = 1;
                        queue.push(nIdx);
                      }
                    }
                  }
                }
              }

              // Only keep significant objects (ignore tiny noise)
              if (clusterPixels.length > 15) {
                clusters.push({ pixels: clusterPixels, minX, minY, maxX, maxY });
              }
            }
          }
        }

        // 2. Sort objects spatially (Top-to-bottom, left-to-right) for a more "human" drawing order
        clusters.sort((a, b) => {
          const cyA = (a.minY + a.maxY) / 2;
          const cxA = (a.minX + a.maxX) / 2;
          const cyB = (b.minY + b.maxY) / 2;
          const cxB = (b.minX + b.maxX) / 2;
          // Weight Y heavily so it draws row by row, like a human scanning the page
          return (cyA * 1000 + cxA) - (cyB * 1000 + cxB);
        });

        const sketchSegments: Stroke[] = [];
        const visitedForTracing = new Uint8Array(width * height);

        // 3. Trace continuous lines WITHIN each object sequentially (Vectorization)
        for (const cluster of clusters) {
          for (const idx of cluster.pixels) {
            if (!visitedForTracing[idx]) {
              let cx = idx % width;
              let cy = Math.floor(idx / width);
              visitedForTracing[idx] = 1;

              const path: Array<{ x: number; y: number }> = [{ x: cx, y: cy }];

              // Trace path by searching for adjacent edge pixels
              let continueTracing = true;
              while (continueTracing) {
                // Search radius 1 first, then radius 2 to jump small gaps
                let found = false;
                for (let r = 1; r <= 2; r++) {
                  for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                      if (dx === 0 && dy === 0) continue;
                      const nx = cx + dx;
                      const ny = cy + dy;
                      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        if (edges[nIdx] && !visitedForTracing[nIdx]) {
                          visitedForTracing[nIdx] = 1;
                          cx = nx;
                          cy = ny;
                          path.push({ x: cx, y: cy });
                          found = true;
                          break;
                        }
                      }
                    }
                    if (found) break;
                  }
                  if (found) break;
                }
                continueTracing = found;
              }

              // Simplify path and apply Organic Curves (Bezier) + Pen Pressure
              if (path.length > 2) {
                const stepSize = 5;
                const smoothedPath: Array<{ x: number; y: number }> = [];
                for (let i = 0; i < path.length; i += stepSize) {
                  smoothedPath.push(path[i]);
                }
                if (smoothedPath[smoothedPath.length - 1] !== path[path.length - 1]) {
                  smoothedPath.push(path[path.length - 1]);
                }

                if (smoothedPath.length > 2) {
                  let prevPt = smoothedPath[0];
                  for (let i = 1; i < smoothedPath.length - 1; i++) {
                    const currPt = smoothedPath[i];
                    const nextPt = smoothedPath[i + 1];

                    // Midpoint smoothing for bezier curves
                    const midX = (currPt.x + nextPt.x) / 2;
                    const midY = (currPt.y + nextPt.y) / 2;

                    // Pen Pressure simulation: thicker in the middle of the stroke, thinner at ends
                    const progress = i / smoothedPath.length;
                    const pressure = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
                    const dynamicWidth = 0.8 + (pressure * 1.8); // Varies from 0.8 to 2.6

                    sketchSegments.push({
                      id: strokeId++,
                      layer: 0,
                      type: 'sketch',
                      points: [prevPt.x, prevPt.y, currPt.x, currPt.y, midX, midY],
                      lineWidth: dynamicWidth,
                      r: 40, g: 40, b: 40, alpha: 0.9,
                    });
                    prevPt = { x: midX, y: midY };
                  }
                  // Draw the very last segment as a straight line to finish the path
                  const lastPt = smoothedPath[smoothedPath.length - 1];
                  sketchSegments.push({
                    id: strokeId++,
                    layer: 0,
                    type: 'sketch',
                    points: [prevPt.x, prevPt.y, lastPt.x, lastPt.y],
                    lineWidth: 0.8, // Thin tail
                    r: 40, g: 40, b: 40, alpha: 0.9,
                  });
                }
              }
            }
          }
        }

        // Use a loop instead of spread operator to avoid "Maximum call stack size exceeded"
        for (const seg of sketchSegments) strokes.push(seg);

        const sketchCount = strokes.length;
        onProgress(0.5);

        // --- PHASE 2: REVEAL (Coloring) ---
        setTimeout(() => {
          const revealSegments: Stroke[] = [];
          const brushSize = 45;

          // Create a grid of paint "dabs" for a more organic, painterly fill
          const dabs: Array<{ x: number; y: number }> = [];
          for (let y = -brushSize; y < height + brushSize; y += brushSize * 0.6) {
            for (let x = -brushSize; x < width + brushSize; x += brushSize * 0.6) {
              // Add randomness to position so it doesn't look like a perfect grid
              const rx = x + (Math.random() - 0.5) * brushSize * 0.5;
              const ry = y + (Math.random() - 0.5) * brushSize * 0.5;
              dabs.push({ x: rx, y: ry });
            }
          }

          // Sort dabs generally top-to-bottom, but with noise for an organic, spreading feel
          dabs.sort((a, b) => {
            const scoreA = a.y * 10 + a.x + (Math.random() * 300);
            const scoreB = b.y * 10 + b.x + (Math.random() * 300);
            return scoreA - scoreB;
          });

          for (const dab of dabs) {
            // Randomize the brush stroke direction slightly
            const angle = (Math.random() - 0.5) * Math.PI / 3;
            const len = brushSize * (1 + Math.random() * 0.5);
            const dx = Math.cos(angle) * len;
            const dy = Math.sin(angle) * len;

            // Curve control point for a natural swish
            const cx = dab.x + dx / 2 + (Math.random() - 0.5) * 30;
            const cy = dab.y + dy / 2 + (Math.random() - 0.5) * 30;

            revealSegments.push({
              id: strokeId++,
              layer: 1,
              type: 'reveal',
              points: [dab.x, dab.y, cx, cy, dab.x + dx, dab.y + dy],
              lineWidth: brushSize * 1.8, // Thick brush
              r: 0, g: 0, b: 0, alpha: 1,
            });
          }

          for (const seg of revealSegments) strokes.push(seg);
          onProgress(1.0);

          const revealThreshold = sketchCount / strokes.length;

          resolve({
            id: Math.random().toString(36).substring(7),
            canvasWidth: width,
            canvasHeight: height,
            canvasColor: 'white',
            totalFrames: strokes.length,
            fps: 60,
            totalDurationMs: Math.max(1000, strokes.length * 8),
            revealThreshold,
            strokes,
            resizedImage,
          });
        }, 50);
      }, 50);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}
