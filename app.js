/**
 * Figure Modelator — click-to-sculpt polygons in WebGL.
 */
(function () {
  'use strict';

  var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    'uniform mat4 u_ViewMatrix;\n' +
    'uniform mat4 u_ProjMatrix;\n' +
    'uniform float u_PointSize;\n' +
    'varying vec3 v_Color;\n' +
    'varying float v_ViewZ;\n' +
    'void main() {\n' +
    '  vec4 viewPos = u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
    '  gl_Position = u_ProjMatrix * viewPos;\n' +
    '  gl_PointSize = u_PointSize;\n' +
    '  v_Color = a_Color.rgb;\n' +
    '  v_ViewZ = -viewPos.z;\n' +
    '}';

  var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'varying vec3 v_Color;\n' +
    'varying float v_ViewZ;\n' +
    'uniform float u_Shade;\n' +
    'void main() {\n' +
    '  float depthCue = clamp(1.15 - v_ViewZ * 0.28, 0.45, 1.15);\n' +
    '  float shade = mix(1.0, depthCue, u_Shade);\n' +
    '  gl_FragColor = vec4(v_Color * shade, 1.0);\n' +
    '}';

  var AXIS = {
    x: [1, 0, 0],
    y: [0, 1, 0],
    z: [0, 0, 1]
  };

  var gl;
  var canvas;
  var locations;
  var vertexBuffer;
  var colorBuffer;
  var viewMatrix = new Matrix4();
  var projMatrix = new Matrix4();
  var identity = new Matrix4();
  var helpers = { vertices: [], colors: [] };

  var state = {
    figures: [],
    index: 0,
    vertexDepth: 0,
    camera: { yaw: 0.55, pitch: 0.38, distance: 2.6 },
    orbiting: false,
    lastPointer: null,
    defaultFill: [59 / 255, 184 / 255, 224 / 255]
  };

  function createFigure() {
    return {
      vertices: [],
      colors: [],
      angle: 0,
      axis: 'x',
      scale: 1,
      tx: 0,
      ty: 0,
      tz: 0,
      fill: state.defaultFill.slice()
    };
  }

  function currentFigure() {
    return state.figures[state.index] || null;
  }

  function wrapIndex(index, length) {
    if (length <= 0) {
      return 0;
    }
    return ((index % length) + length) % length;
  }

  function log(message) {
    var el = document.getElementById('log');
    if (!el) {
      return;
    }
    var row = document.createElement('div');
    var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    row.textContent = time + '  ' + message;
    el.prepend(row);
    while (el.childNodes.length > 40) {
      el.removeChild(el.lastChild);
    }
  }

  function $(id) {
    return document.getElementById(id);
  }

  function vertexCount(figure) {
    return figure ? figure.vertices.length / 3 : 0;
  }

  function updateStatus() {
    var fig = currentFigure();
    var total = state.figures.length;
    $('figure-pill').textContent = total
      ? ('Figure ' + (state.index + 1) + ' / ' + total)
      : 'No figures';
    $('vertex-pill').textContent = vertexCount(fig) + ' vertices';

    var list = $('figure-list');
    list.innerHTML = '';
    state.figures.forEach(function (figure, i) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'figure-chip' + (i === state.index ? ' active' : '');
      chip.textContent = 'F' + (i + 1) + ' · ' + vertexCount(figure) + 'v';
      chip.addEventListener('click', function () {
        selectFigure(i);
      });
      list.appendChild(chip);
    });
  }

  function hexFromFill(fill) {
    function toHex(channel) {
      var value = Math.max(0, Math.min(255, Math.round(channel * 255)));
      return ('0' + value.toString(16)).slice(-2);
    }
    return '#' + toHex(fill[0]) + toHex(fill[1]) + toHex(fill[2]);
  }

  function fillFromHex(hex) {
    var raw = hex.replace('#', '');
    return [
      parseInt(raw.slice(0, 2), 16) / 255,
      parseInt(raw.slice(2, 4), 16) / 255,
      parseInt(raw.slice(4, 6), 16) / 255
    ];
  }

  function syncSlidersFromFigure() {
    var fig = currentFigure();
    var fill = fig ? fig.fill : state.defaultFill;
    var r = Math.round(fill[0] * 255);
    var g = Math.round(fill[1] * 255);
    var b = Math.round(fill[2] * 255);

    $('rotation').value = fig ? fig.angle : 0;
    $('scale').value = fig ? fig.scale : 1;
    $('tx').value = fig ? fig.tx : 0;
    $('ty').value = fig ? fig.ty : 0;
    $('tz').value = fig ? fig.tz : 0;
    $('red').value = r;
    $('green').value = g;
    $('blue').value = b;
    $('color-picker').value = hexFromFill(fill);
    $('swatch').style.background = hexFromFill(fill);
    $('depth').value = state.vertexDepth;

    document.querySelectorAll('input[name="axis"]').forEach(function (input) {
      input.checked = fig ? input.value === fig.axis : input.value === 'x';
    });

    $('rotation-value').textContent = Math.round(fig ? fig.angle : 0) + '°';
    $('scale-value').textContent = Number(fig ? fig.scale : 1).toFixed(2);
    $('tx-value').textContent = Number(fig ? fig.tx : 0).toFixed(2);
    $('ty-value').textContent = Number(fig ? fig.ty : 0).toFixed(2);
    $('tz-value').textContent = Number(fig ? fig.tz : 0).toFixed(2);
    $('r-value').textContent = String(r);
    $('g-value').textContent = String(g);
    $('b-value').textContent = String(b);
    $('depth-value').textContent = Number(state.vertexDepth).toFixed(2);
    updateStatus();
  }

  function applyFillToFigure(figure, fill) {
    figure.fill = fill.slice();
    for (var i = 0; i < figure.colors.length; i += 3) {
      figure.colors[i] = fill[0];
      figure.colors[i + 1] = fill[1];
      figure.colors[i + 2] = fill[2];
    }
    $('swatch').style.background = hexFromFill(fill);
    $('color-picker').value = hexFromFill(fill);
  }

  function selectFigure(index) {
    if (!state.figures.length) {
      state.index = 0;
      syncSlidersFromFigure();
      render();
      return;
    }
    state.index = wrapIndex(index, state.figures.length);
    syncSlidersFromFigure();
    log('Selected figure ' + (state.index + 1));
    render();
  }

  function ensureCurrentFigure() {
    if (!state.figures.length) {
      state.figures.push(createFigure());
      state.index = 0;
    }
    return currentFigure();
  }

  function newFigure(forceEmpty) {
    var current = currentFigure();
    if (current && vertexCount(current) === 0 && !forceEmpty) {
      log('Current figure is still empty');
      return;
    }
    state.figures.push(createFigure());
    state.index = state.figures.length - 1;
    syncSlidersFromFigure();
    log('Started figure ' + state.figures.length);
    render();
  }

  function deleteFigure() {
    if (!state.figures.length) {
      log('Nothing to delete');
      return;
    }
    state.figures.splice(state.index, 1);
    if (!state.figures.length) {
      state.index = 0;
      log('Scene is empty');
    } else {
      state.index = wrapIndex(state.index - 1, state.figures.length);
      log('Deleted figure. Now on ' + (state.index + 1));
    }
    syncSlidersFromFigure();
    render();
  }

  function resetScene() {
    state.figures = [];
    state.index = 0;
    state.vertexDepth = 0;
    state.camera = { yaw: 0.55, pitch: 0.38, distance: 2.6 };
    $('rotation-min').value = -360;
    $('rotation-max').value = 360;
    $('rotation').min = -360;
    $('rotation').max = 360;
    syncSlidersFromFigure();
    log('Scene reset');
    render();
  }

  function modelMatrixFor(figure) {
    var matrix = new Matrix4();
    var axis = AXIS[figure.axis] || AXIS.x;
    matrix.setTranslate(figure.tx, figure.ty, figure.tz);
    matrix.rotate(figure.angle, axis[0], axis[1], axis[2]);
    matrix.scale(figure.scale, figure.scale, figure.scale);
    return matrix;
  }

  function updateCamera() {
    var yaw = state.camera.yaw;
    var pitch = state.camera.pitch;
    var distance = state.camera.distance;
    var cosPitch = Math.cos(pitch);
    var eyeX = distance * Math.sin(yaw) * cosPitch;
    var eyeY = distance * Math.sin(pitch);
    var eyeZ = distance * Math.cos(yaw) * cosPitch;
    viewMatrix.setLookAt(eyeX, eyeY, eyeZ, 0, 0, 0, 0, 1, 0);

    var aspect = canvas.width / Math.max(canvas.height, 1);
    projMatrix.setPerspective(55, aspect, 0.1, 30);
  }

  function transformPoint(matrix, point) {
    var e = matrix.elements;
    var x = point[0];
    var y = point[1];
    var z = point[2];
    var rx = e[0] * x + e[4] * y + e[8] * z + e[12];
    var ry = e[1] * x + e[5] * y + e[9] * z + e[13];
    var rz = e[2] * x + e[6] * y + e[10] * z + e[14];
    var rw = e[3] * x + e[7] * y + e[11] * z + e[15];
    if (Math.abs(rw) < 1e-8) {
      return [rx, ry, rz];
    }
    return [rx / rw, ry / rw, rz / rw];
  }

  function unprojectToDepthPlane(clientX, clientY, planeZ) {
    var rect = canvas.getBoundingClientRect();
    var ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    var ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    var vp = new Matrix4();
    vp.set(projMatrix);
    vp.multiply(viewMatrix);
    var inv = new Matrix4();
    inv.setInverseOf(vp);

    var near = transformPoint(inv, [ndcX, ndcY, -1]);
    var far = transformPoint(inv, [ndcX, ndcY, 1]);
    var dx = far[0] - near[0];
    var dy = far[1] - near[1];
    var dz = far[2] - near[2];
    if (Math.abs(dz) < 1e-8) {
      return [near[0], near[1], planeZ];
    }
    var t = (planeZ - near[2]) / dz;
    return [near[0] + t * dx, near[1] + t * dy, planeZ];
  }

  function buildHelpers() {
    var vertices = [];
    var colors = [];
    var grid = 1.4;
    var step = 0.2;
    var i;
    var muted = [0.18, 0.22, 0.28];
    var faint = [0.12, 0.15, 0.2];

    for (i = -grid; i <= grid + 0.001; i += step) {
      var color = Math.abs(i) < 0.001 ? muted : faint;
      vertices.push(-grid, i, 0, grid, i, 0);
      colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);
      vertices.push(i, -grid, 0, i, grid, 0);
      colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);
    }

    vertices.push(0, 0, 0, 0.7, 0, 0);
    colors.push(0.95, 0.35, 0.32, 0.95, 0.35, 0.32);
    vertices.push(0, 0, 0, 0, 0.7, 0);
    colors.push(0.38, 0.86, 0.52, 0.38, 0.86, 0.52);
    vertices.push(0, 0, 0, 0, 0, 0.7);
    colors.push(0.38, 0.62, 1.0, 0.38, 0.62, 1.0);

    helpers.vertices = new Float32Array(vertices);
    helpers.colors = new Float32Array(colors);
  }

  function bindGeometry(vertices, colors) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(locations.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(locations.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(locations.a_Color, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(locations.a_Color);
  }

  function drawArrays(mode, vertices, colors, model, shade, pointSize) {
    bindGeometry(vertices, colors);
    gl.uniformMatrix4fv(locations.u_ModelMatrix, false, model.elements);
    gl.uniformMatrix4fv(locations.u_ViewMatrix, false, viewMatrix.elements);
    gl.uniformMatrix4fv(locations.u_ProjMatrix, false, projMatrix.elements);
    gl.uniform1f(locations.u_Shade, shade);
    gl.uniform1f(locations.u_PointSize, pointSize);
    gl.drawArrays(mode, 0, vertices.length / 3);
  }

  function render() {
    if (!gl) {
      return;
    }
    resizeCanvas();
    updateCamera();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.027, 0.035, 0.047, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawArrays(gl.LINES, helpers.vertices, helpers.colors, identity, 0, 1);

    state.figures.forEach(function (figure, i) {
      var count = vertexCount(figure);
      if (count === 0) {
        return;
      }
      var model = modelMatrixFor(figure);
      var verts = new Float32Array(figure.vertices);
      var cols = new Float32Array(figure.colors);
      if (count >= 3) {
        drawArrays(gl.TRIANGLE_FAN, verts, cols, model, 1, 1);
      }
      if (i === state.index) {
        var outline = [];
        var oc = [];
        var p;
        for (p = 0; p < figure.colors.length; p += 3) {
          outline.push(Math.min(1, figure.colors[p] + 0.35));
          outline.push(Math.min(1, figure.colors[p + 1] + 0.35));
          outline.push(Math.min(1, figure.colors[p + 2] + 0.35));
          oc.push(1, 0.85, 0.4);
        }
        if (count >= 2) {
          drawArrays(gl.LINE_LOOP, verts, new Float32Array(oc), model, 0, 1);
        }
        drawArrays(gl.POINTS, verts, new Float32Array(outline), model, 0, 9);
      } else if (count >= 2) {
        drawArrays(gl.LINE_LOOP, verts, cols, model, 0, 1);
      } else {
        drawArrays(gl.POINTS, verts, cols, model, 0, 7);
      }
    });
  }

  function resizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var width = Math.max(1, Math.round(rect.width * dpr));
    var height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function depthForEvent(ev) {
    if (ev.ctrlKey) {
      return -0.5;
    }
    if (ev.shiftKey) {
      return -1;
    }
    return state.vertexDepth;
  }

  function addVertex(ev) {
    var depth = depthForEvent(ev);
    var world = unprojectToDepthPlane(ev.clientX, ev.clientY, depth);
    var figure = ensureCurrentFigure();
    figure.vertices.push(world[0], world[1], world[2]);
    figure.colors.push(figure.fill[0], figure.fill[1], figure.fill[2]);
    log(
      'Vertex ' + vertexCount(figure) +
      ' at (' + world[0].toFixed(2) + ', ' + world[1].toFixed(2) + ', ' + world[2].toFixed(2) + ')'
    );
    updateStatus();
    render();
  }

  function onPointerDown(ev) {
    if (ev.altKey || ev.button === 1) {
      state.orbiting = true;
      state.lastPointer = { x: ev.clientX, y: ev.clientY };
      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(ev.pointerId);
      }
      ev.preventDefault();
      return;
    }
    if (ev.button === 0) {
      addVertex(ev);
    }
  }

  function onPointerMove(ev) {
    if (!state.orbiting || !state.lastPointer) {
      return;
    }
    var dx = ev.clientX - state.lastPointer.x;
    var dy = ev.clientY - state.lastPointer.y;
    state.camera.yaw -= dx * 0.008;
    state.camera.pitch += dy * 0.008;
    state.camera.pitch = Math.max(-1.2, Math.min(1.2, state.camera.pitch));
    state.lastPointer = { x: ev.clientX, y: ev.clientY };
    render();
  }

  function onPointerUp(ev) {
    state.orbiting = false;
    state.lastPointer = null;
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(ev.pointerId)) {
      canvas.releasePointerCapture(ev.pointerId);
    }
  }

  function onContextMenu(ev) {
    ev.preventDefault();
    newFigure(false);
  }

  function onWheel(ev) {
    ev.preventDefault();
    state.camera.distance += ev.deltaY * 0.0025;
    state.camera.distance = Math.max(0.8, Math.min(8, state.camera.distance));
    render();
  }

  function readFillFromSliders() {
    return [
      Number($('red').value) / 255,
      Number($('green').value) / 255,
      Number($('blue').value) / 255
    ];
  }

  function bindControls() {
    document.querySelectorAll('input[name="axis"]').forEach(function (input) {
      input.addEventListener('change', function () {
        var fig = currentFigure();
        if (!fig) {
          return;
        }
        fig.axis = input.value;
        log('Axis ' + input.value.toUpperCase());
        render();
      });
    });

    function bindSlider(id, labelId, formatter, apply) {
      $(id).addEventListener('input', function (ev) {
        var value = Number(ev.target.value);
        $(labelId).textContent = formatter(value);
        apply(value);
        render();
      });
    }

    bindSlider('rotation', 'rotation-value', function (v) { return Math.round(v) + '°'; }, function (v) {
      var fig = currentFigure();
      if (fig) {
        fig.angle = v;
      }
    });
    bindSlider('scale', 'scale-value', function (v) { return v.toFixed(2); }, function (v) {
      var fig = currentFigure();
      if (fig) {
        fig.scale = v;
      }
    });
    bindSlider('tx', 'tx-value', function (v) { return v.toFixed(2); }, function (v) {
      var fig = currentFigure();
      if (fig) {
        fig.tx = v;
      }
    });
    bindSlider('ty', 'ty-value', function (v) { return v.toFixed(2); }, function (v) {
      var fig = currentFigure();
      if (fig) {
        fig.ty = v;
      }
    });
    bindSlider('tz', 'tz-value', function (v) { return v.toFixed(2); }, function (v) {
      var fig = currentFigure();
      if (fig) {
        fig.tz = v;
      }
    });
    bindSlider('depth', 'depth-value', function (v) { return v.toFixed(2); }, function (v) {
      state.vertexDepth = v;
    });

    ['red', 'green', 'blue'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        var fill = readFillFromSliders();
        $('r-value').textContent = $('red').value;
        $('g-value').textContent = $('green').value;
        $('b-value').textContent = $('blue').value;
        var fig = currentFigure();
        if (fig) {
          applyFillToFigure(fig, fill);
        } else {
          state.defaultFill = fill;
          $('swatch').style.background = hexFromFill(fill);
          $('color-picker').value = hexFromFill(fill);
        }
        render();
      });
    });

    $('color-picker').addEventListener('input', function (ev) {
      var fill = fillFromHex(ev.target.value);
      $('red').value = Math.round(fill[0] * 255);
      $('green').value = Math.round(fill[1] * 255);
      $('blue').value = Math.round(fill[2] * 255);
      $('r-value').textContent = $('red').value;
      $('g-value').textContent = $('green').value;
      $('b-value').textContent = $('blue').value;
      var fig = currentFigure();
      if (fig) {
        applyFillToFigure(fig, fill);
      } else {
        state.defaultFill = fill;
        $('swatch').style.background = hexFromFill(fill);
      }
      render();
    });

    function clampRotationRange() {
      var min = Number($('rotation-min').value);
      var max = Number($('rotation-max').value);
      if (!isFinite(min) || !isFinite(max) || min >= max) {
        log('Rotation range needs min < max');
        return;
      }
      $('rotation').min = min;
      $('rotation').max = max;
      var fig = currentFigure();
      if (fig) {
        fig.angle = Math.max(min, Math.min(max, fig.angle));
        $('rotation').value = fig.angle;
        $('rotation-value').textContent = Math.round(fig.angle) + '°';
      }
      render();
    }
    $('rotation-min').addEventListener('change', clampRotationRange);
    $('rotation-max').addEventListener('change', clampRotationRange);

    $('prev-figure').addEventListener('click', function () { selectFigure(state.index - 1); });
    $('next-figure').addEventListener('click', function () { selectFigure(state.index + 1); });
    $('new-figure').addEventListener('click', function () { newFigure(false); });
    $('delete-figure').addEventListener('click', deleteFigure);
    $('restart').addEventListener('click', resetScene);

    window.addEventListener('keydown', function (ev) {
      if (ev.target && ev.target.matches && ev.target.matches('input, textarea, button')) {
        if (ev.key !== 'Delete' && ev.key !== 'Backspace') {
          return;
        }
        if (ev.target.matches('input, textarea')) {
          return;
        }
      }
      if (ev.key === '[') {
        selectFigure(state.index - 1);
      } else if (ev.key === ']') {
        selectFigure(state.index + 1);
      } else if (ev.key === 'n' || ev.key === 'N') {
        newFigure(false);
      } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
        deleteFigure();
      } else if (ev.key === '1') {
        document.querySelector('input[name="axis"][value="x"]').click();
      } else if (ev.key === '2') {
        document.querySelector('input[name="axis"][value="y"]').click();
      } else if (ev.key === '3') {
        document.querySelector('input[name="axis"][value="z"]').click();
      }
    });
  }

  function main() {
    canvas = $('webgl');
    gl = getWebGLContext(canvas);
    if (!gl) {
      log('WebGL is not available in this browser');
      return;
    }
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
      log('Failed to initialize shaders');
      return;
    }

    locations = {
      a_Position: gl.getAttribLocation(gl.program, 'a_Position'),
      a_Color: gl.getAttribLocation(gl.program, 'a_Color'),
      u_ModelMatrix: gl.getUniformLocation(gl.program, 'u_ModelMatrix'),
      u_ViewMatrix: gl.getUniformLocation(gl.program, 'u_ViewMatrix'),
      u_ProjMatrix: gl.getUniformLocation(gl.program, 'u_ProjMatrix'),
      u_PointSize: gl.getUniformLocation(gl.program, 'u_PointSize'),
      u_Shade: gl.getUniformLocation(gl.program, 'u_Shade')
    };

    vertexBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    buildHelpers();
    bindControls();
    syncSlidersFromFigure();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', render);

    log('Ready — click the viewport to start a figure');
    render();
  }

  window.addEventListener('load', main);
})();
