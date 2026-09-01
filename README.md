# Figure Modelator

Browser-based 3D polygon studio. Click in the viewport to drop vertices, close a shape, then rotate, scale, color, and stack multiple figures — all on the GPU with WebGL.

Originally written as a classroom WebGL exercise (`a.html` + Kendo UI sliders). This revision keeps that interaction model and rebuilds the app so it is usable, documented, and visually coherent.

## Run it

No build step. Serve the folder over HTTP (needed for some browsers to load local scripts cleanly):

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

`a.html` still works; it redirects to `index.html`.

## Controls

| Action | How |
| --- | --- |
| Add a vertex | Left-click the viewport |
| Start a new figure | Right-click, **New figure**, or `N` |
| Orbit camera | Alt-drag or middle-mouse drag |
| Zoom | Scroll wheel |
| Vertex depth | Depth slider, or hold **Ctrl** (`z = -0.5`) / **Shift** (`z = -1`) while clicking |
| Select figure | Figure chips, **Previous** / **Next**, or `[` `]` |
| Delete figure | **Delete** or `Backspace` / `Delete` |
| Rotation axis | X / Y / Z, or keys `1` `2` `3` |
| Reset | **Reset scene** |

A figure fills once it has three vertices (`TRIANGLE_FAN`). The selected figure shows an amber outline and vertex points.

Transforms (rotation, scale, translation, color) apply **only to the selected figure**. Switching figures reloads that figure’s sliders.

## Project layout

```
index.html                 UI shell
styles.css                 Workshop theme
app.js                     Modeling logic + WebGL draw loop
a.html                     Redirect to index.html
lib/cuon-utils.js          Shader helpers (Matsuda / Min)
lib/cuon-matrix.js         4×4 matrices
lib/webgl-utils.js         Animation / context helpers
lib/webgl-debug.js         Optional WebGL error wrapping
```

## What was wrong before

The first version could draw polygons, but several paths were unsafe or silently wrong:

- **Negative wrap.** `lastFigure()` used `(index - 1) % length`. In JavaScript that is `-1` at index 0, so going backwards selected a missing figure.
- **Empty scene.** Next / previous / delete used `% 0`, which is `NaN`.
- **Color sliders crashed** when no figure existed (`g_colors[index]` was `undefined`).
- **Double right-click then left-click crashed.** Right-click only incremented `index` and pushed a matrix; the next click pushed a single new array, then wrote `g_points[index]` past the end of the list.
- **Clicks used the global `event` object** instead of the handler argument (`ev.buttons`).
- **Scale slider defaulted to 0** while the runtime scale was 1, so the first nudge collapsed the shape.
- **Every slider tick called `main()`**, which recompiled shaders and rebound mouse handlers.
- **Restart left transforms behind** (`g_transform`, angle, scale, translation).
- **Depth buffer was never cleared** even though depth testing was enabled.
- **Clicks were treated as clip-space XY**, so vertices did not land under the cursor once the camera was perspective (and would have been worse with orbit).
- The UI depended on Kendo UI plus Telerik demo `console.js` / CSS CDNs.

## How drawing works now

1. WebGL is initialized **once**. Buffers and the shader program are reused.
2. Each figure stores its own vertices, colors, and transform parameters.
3. Clicks are **unprojected** onto a world-space depth plane (`z = vertex depth`) using the inverse of `projection * view`.
4. Each frame: clear color + depth, draw a construction grid and RGB axes, then draw every figure. The active figure gets fill + outline + points.
5. Camera is a simple orbit around the origin. Projection aspect follows the canvas (including `devicePixelRatio`).

Shaders live in `app.js`. Vertex color is tinted by view-space depth so overlapping shapes read more clearly.

## Browser support

Needs WebGL 1 and a reasonably current browser (Chrome, Firefox, Edge, Safari). The layout is usable down to ~980px; below that the dock stacks under the viewport.
