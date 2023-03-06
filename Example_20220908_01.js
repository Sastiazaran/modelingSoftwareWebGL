/**
 * @Author: Sebastián Astiazarán
 * Name: Figure Modelator
 */

var VSHADER_SOURCE =`
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 u_FragColor;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  void main() {
   gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
   u_FragColor = a_Color;
  }`;

var FSHADER_SOURCE =`
  precision mediump float;
  varying vec4 u_FragColor;
  void main(){
    gl_FragColor = u_FragColor;
  }`;

  //------------------------------------------------------------------------

  /**
   * function changeAxis()
   * {
   *  This function works by changing the axis with the one that we need to work in the moment
   * }
   */

  function changeAxis() {
    var xAxis = document.getElementById("x-axis");
    var yAxis = document.getElementById("y-axis");
    var zAxis = document.getElementById("z-axis");
    if(xAxis.checked){
      kendoConsole.log("X");
      rotAxis = [1,0,0];
    }
    if(yAxis.checked){
      kendoConsole.log("Y");
      rotAxis = [0,1,0];
    }
    if(zAxis.checked){
      kendoConsole.log("Z");
      rotAxis = [0,0,1];
    }
  }

  //------------------------------------------------------------------------

  /**
   * function restart()
   * {
   *  This function restarts all the values to clear the canvas
   * }
   */

  function restart(){
    index = 0;
    g_points = [];
    g_colors = [];
    kendoConsole.log("Restart");
    main();
  }

  //----------------------------------------------------------------------

  function sliderOnSlide(e) {
    kendoConsole.log("Slide :: new slide value is: " + e.value);
    angle = e.value;
    main();
  }

  function sliderOnChange(e) {
    kendoConsole.log("Change :: new value is: " + e.value);
    angle = e.value;
    main();
  }

  function rangeSliderOnSlide(e) {
    kendoConsole.log("Slide :: new slide values are: " + e.value.toString().replace(",", " - "));
  }


  function rangeSliderOnChange(e) {
    kendoConsole.log("Change :: new values are: " + e.value.toString().replace(",", " - "));
    var slider = $("#slider").data("kendoSlider");
    slider.min(e.value[0]);
    slider.max(e.value[1]);

    if(slider.value() < e.value[0]){
      slider.value(e.value[0]);
    } else if(slider.value() > e.value[1]){
      slider.value(e.value[1]);
    }
    slider.resize();
    angle = slider.value();
    main();
  }

  //Slider values
  var min = -360;
  var max = 360;
  $(document).ready(function() {
    $("#slider").kendoSlider({
      change: sliderOnChange,
      slide: sliderOnSlide,
      min: min,
      max: max,
      smallStep: 10,
      largeStep: 60,
      value: 0
    });

    $("#rangeslider").kendoRangeSlider({
      change: rangeSliderOnChange,
      slide: rangeSliderOnSlide,
      min: min,
      max: max,
      smallStep: 10,
      largeStep: 60,
      tickPlacement: "both"
    });
  });

//--------------------------------------------------------------

  /**
   * Scaling
   * This function scales the figure to the value assigned by the slider
   * @param {*} e 
   */

  var size = 1;

  function sliderOnSlide1(e) {
    kendoConsole.log("Slide :: new slide value is: " + e.value);
    size = e.value;
    main();
  }

  function sliderOnChange1(e) {
    kendoConsole.log("Change :: new value is: " + e.value);
    size = e.value;
    main();
  }

  //Slider values
  var minScale = .1;
  var maxScale = 3;
  $(document).ready(function() {
    $("#scalingslider").kendoSlider({
      change: sliderOnChange1,
      slide: sliderOnSlide1,
      min: minScale,
      max: maxScale,
      smallStep: .1,
      largeStep: .5,
      value: 0
    });
  });

  //---------------------------------------------------------------

  //Variables for translation
  var sizeX = 0;
  var sizeY = 0;
  var sizeZ = 0;
  var minScaleT = -2;
  var maxScaleT = 2;


  /**
   * X
   * This functions use the slider to translate the figure throughout the X axis
   * @returns 
   */

   function sliderOnSlideX(e) {
    kendoConsole.log("Slide :: new slide value is: " + e.value);
    sizeX = e.value;
    main();
  }

  function sliderOnChangeX(e) {
    kendoConsole.log("Change :: new value is: " + e.value);
    sizeX = e.value;
    main();
  }

  $(document).ready(function() {
    $("#Xslider").kendoSlider({
      change: sliderOnChangeX,
      slide: sliderOnSlideX,
      min: minScaleT,
      max: maxScaleT,
      smallStep: .1,
      largeStep: .5,
      value: 0
    });
  });

  /**
   * Y
   * This functions use the slider to translate the figure throughout the Y axis
   * @returns 
   */

   function sliderOnSlideY(e) {
    kendoConsole.log("Slide :: new slide value is: " + e.value);
    sizeY = e.value;
    main();
  }

  function sliderOnChangeY(e) {
    kendoConsole.log("Change :: new value is: " + e.value);
    sizeY = e.value;
    main();
  }

  $(document).ready(function() {
    $("#Yslider").kendoSlider({
      change: sliderOnChangeY,
      slide: sliderOnSlideY,
      min: minScaleT,
      max: maxScaleT,
      smallStep: .1,
      largeStep: .5,
      value: 0
    });
  });

  /**
   * Z
   * This functions use the slider to translate the figure throughout the Z axis
   * @returns 
   */

   function sliderOnSlideZ(e) {
    kendoConsole.log("Slide :: new slide value is: " + e.value);
    sizeZ = e.value;
    main();
  }

  function sliderOnChangeZ(e) {
    kendoConsole.log("Change :: new value is: " + e.value);
    sizeZ = e.value;
    main();
  }

  
  $(document).ready(function() {
    $("#Zslider").kendoSlider({
      change: sliderOnChangeZ,
      slide: sliderOnSlideZ,
      min: minScaleT,
      max: maxScaleT,
      smallStep: .1,
      largeStep: .5,
      value: 0
    });
  });


  //----------------------------------------------------------

  /**
    *  function nextFigure()
    * {
    * In this function I navigate througouth the indexes so that I can select the figure that is next
    * to the one that im working whit
    * }
    */

  function nextFigure()
  {
    index = (index+1)%(g_points.length)
    kendoConsole.log(index);
  }

  /**
   * *  function nextFigure()
    * {
    * In this function I navigate througouth the indexes so that I can select the figure that is before
    * to the one that im working whit
    * }
   */

  function lastFigure()
  {
    index = (index-1)%(g_points.length)
    kendoConsole.log(index);
  }

  //------------------------------------------------------------

/**
 * function deleteFigures()
 * {
 *    Here I select the array and use de method splice
 *    Splice(where it starts, how many elements are being eliminates)
 * 
 * }
 */

  function deleteFigures()
  {

    g_points.splice(index, 1);
    g_colors.splice(index, 1);
    index = (index-1)%(g_points.length);
    main();

  }

  //-------------------------------------------------------------

  /**
   * Red
   * This functions uses the slider to change the R value of the color that the figure has
   * giving it a new red value on the rgb scale
   * @param {*} e 
   */

  //Slider values
  minColorR = 0;
  maxColorR = 255;

  function sliderOnSlideR(e) {
    kendoConsole.log("Slide :: new slide value is: " + e.value);
    // red starts at 0
    for(var i = 0; i < g_colors[index].length; i+=3){
      g_colors[index][i] = e.value/255;
  }
    main();
  }

  function sliderOnChangeR(e) {
    kendoConsole.log("Change :: new value is: " + e.value);
    // red starts at 0
    for(var i = 0; i < g_colors[index].length; i+=3){
      g_colors[index][i] = e.value/255;
  }
    main();
  }

  
  $(document).ready(function() {
    $("#Rslider").kendoSlider({
      change: sliderOnChangeR,
      slide: sliderOnSlideR,
      min: minColorR,
      max: maxColorR,
      smallStep: .1,
      largeStep: .5,
      value: 0
    });
  });

  /**
   * Green
   * This functions uses the slider to change the G value of the color that the figure has
   * giving it a new green value on the rgb scale
   * @param {*} e 
   */

  //Slider values
   minColorG = 0;
   maxColorG = 255;

   function sliderOnSlideG(e) {
    kendoConsole.log("Slide :: new slide value is: " + e.value);
    // green starts at 1
    for(var i = 1; i < g_colors[index].length; i+=3){
      g_colors[index][i] = e.value/255;
  }
    main();
  }

  function sliderOnChangeG(e) {
    kendoConsole.log("Change :: new value is: " + e.value);
    // green starts at 1
    for(var i = 1; i < g_colors[index].length; i+=3){
      g_colors[index][i] = e.value/255;
  }
    main();
  }

  
  $(document).ready(function() {
    $("#Gslider").kendoSlider({
      change: sliderOnChangeG,
      slide: sliderOnSlideG,
      min: minColorG,
      max: maxColorG,
      smallStep: .1,
      largeStep: .5,
      value: 0
    });
  });

  /**
   * Blue
   * This functions uses the slider to change the B value of the color that the figure has
   * giving it a new blue value on the rgb scale
   * @param {*} e 
   */

  //Slider values
   minColorB = 0;
   maxColorB = 255;

   function sliderOnSlideB(e) {
    kendoConsole.log("Slide :: new slide value is: " + e.value);
    // blue starts at 2
    for(var i = 2; i < g_colors[index].length; i+=3){
        g_colors[index][i] = e.value/255;
    }
    main();
  }

  function sliderOnChangeB(e) {
    kendoConsole.log("Change :: new value is: " + e.value);
    // blue starts at 2
    for(var i = 2; i < g_colors[index].length; i+=3){
      g_colors[index][i] = e.value/255;
  }
    main();
  }

  
  $(document).ready(function() {
    $("#Bslider").kendoSlider({
      change: sliderOnChangeB,
      slide: sliderOnSlideB,
      min: minColorB,
      max: maxColorB,
      smallStep: .1,
      largeStep: .5,
      value: 0
    });
  });

  //-------------------------------------------------------------

  /**
   * Main function
   * {
   *  Is used to detect clicks and do all the action on the canvas
   * }
   * @returns 
   */

function main()
{
  var canvas = document.getElementById('webgl');
  var gl = getWebGLContext(canvas);

  if(!gl){
    console.log('Failed to get the WebGL context');
    return;
  }

  if(!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)){
    console.log('Failed to initialize shaders');
    return;
  }

  canvas.onmousedown = function(ev){ click(ev, gl, canvas); };
  canvas.oncontextmenu = function(ev){ rightClick(ev, gl); return false;};

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  draw(gl);
}

//----------------------------------------------------------------------------

/**
 * function rightClick()
 * {
 * 
 *  this function is used to increase index and create another matrix so that
 *  it´s posible to push it and have an array of transformation matrix on wich
 *  I can select whatever figure I like and move one at a time, not all of them 
 * 
 * }
 * @param {*} ev 
 * @param {*} gl 
 */

function rightClick(ev, gl) 
{
  index++;
  var ModelMatrix = new Matrix4();
  g_transform.push(ModelMatrix);
  draw(gl);
}

//---------------------------------------------------------------

/**
 * function initVertexBuffers()
 * {
 *  This function is in charge of initiating all the things that are going to appear on screen
 * }
 * 
 * @param {*} gl 
 * @param {*} vertices 
 * @param {*} colors 
 * @param {*} modelMatrix 
 * @returns 
 */

function initVertexBuffers(gl, vertices, colors, modelMatrix)
{
  var n = vertices.length/3;
  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position<0){
    console.log('Failed to get program for a_Position');
    return;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if(!u_ModelMatrix){ console.log('Failed to get location of u_ModelMatrix'); return;  }
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if(!u_ViewMatrix){ console.log('Failed to get location of u_ViewMatrix'); return;  }
  var viewMatrix = new Matrix4();
  viewMatrix.setLookAt(0.0, 0.0, 1.5, 0.0,0.0,0.0, 0.0,1.0,0.0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if(!u_ProjMatrix){ console.log('Failed to get location of u_ProjMatrix'); return;  }
  var projMatrix = new Matrix4();
  //projMatrix.setOrtho(-1.0,1.0,-1.0,1.0,1.0,2.0);
  projMatrix.setPerspective(60.0, 1.0, 0.1, 5.0);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);


  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  var colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);

  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0){
    console.log('Failed to get location of a_Color');
    return;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Color);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  return n;
}

//----------------------------------------------------------------------

/**
 * function draw()
 * {
 *  This function is used to draw the figures
 * }
 * @param {*} gl 
 */

function draw(gl)
{
  gl.clear(gl.COLOR_BUFFER_BIT);
  for(var i = 0; i < g_points.length; i++)
  {
    /**
     * IMPORTANT
     * Here the matrix is drawn and obtains all of its values. This is crucial for the selection of the figure
     */

    g_transform[index].setRotate(angle, rotAxis[0], rotAxis[1], rotAxis[2]);
    g_transform[index].scale(size, size, size);
    g_transform[index].translate(sizeX, sizeY, sizeZ);

    var n = initVertexBuffers(gl, new Float32Array(g_points[i]), new Float32Array(g_colors[i]), g_transform[i]);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, n);
  }
}

//Global Variables

var index = 0;
var angle = 0.0;
var rotAxis = [1,0,0];
var g_points = [];
var g_colors = [];
var g_transform = [];

//-----------------------------------------------------------------------------

/**
 * This function puts the vertexes of the figure with a click
 * @param {*} ev 
 * @param {*} gl 
 * @param {*} canvas 
 */

function click(ev, gl, canvas) 
{
  if(event.buttons == 1){
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect() ;

    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    if(g_points.length <= index){
      var arrayPoints = [];
      g_points.push(arrayPoints);
      var arrayColors = [];
      g_colors.push(arrayColors);
      var arrayTransform = new Matrix4();
      g_transform.push(arrayTransform);
    }

    g_points[index].push(x);
    g_points[index].push(y);
    var z = 0.0;
    if(ev.ctrlKey){
      z = -0.5;
    } else if(ev.shiftKey) {
      z = -1.0;
    }
    g_points[index].push(z);

    g_colors[index].push(Math.random());
    g_colors[index].push(Math.random());
    g_colors[index].push(Math.random());

    draw(gl);
  }
}
