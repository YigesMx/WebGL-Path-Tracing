window.onload = runGL;

"use strict";

var gl;
var canvas;
var message;

var shaderProgram;
var angleX = 0;
var angleY = 0;
var zoomZ = 15.5;

var eye = { x: 0.0, y: 0.0, z: 0.0 };
var center = { x: 0.0, y: 0.0, z: 0.0 };
var up = { x: 0.0, y: 1.0, z: 0.0 };
var FOVY = 45.0;

eye.x = zoomZ * Math.sin(angleY) * Math.cos(angleX);
eye.y = zoomZ * Math.sin(angleX);
eye.z = zoomZ * Math.cos(angleY) * Math.cos(angleX);

//Texture
var textures;
var objattrtex;

//Vertex Shader
var VertexLocation;
var u_veyeLocation;
var u_vInvMPLocation;

//Fragment Shader
var u_numsLocation;
var u_eyeLocation;
var u_timeLocation;
var u_itrLocation;
var u_textureLocation;
var u_attrtextureLocation;
var u_texsizeLocation;
var u_attrtexsizeLocation;
var u_SSAALocation;
var u_texLocations = [];

//Added for attrtexture
//width and height must be pow(2,n)
var attw = 1024;  //width
var atth = 2; //height
var attributes = new Uint8Array(attw * atth * 4);
//bool for SSAA
var SSAA = 0;

//render shader
var renderProgram;
var renderVertexAttribute;
var vertexPositionBuffer;
var frameBuffer;
var u_textureLocationc;

var time = 0;
var iterations = 0;

var Datas = [];
var DefaultDatas = [];
var defaultSize = 6;

var shaders_file = [
    './shaders/render.vert',
    './shaders/render.frag',
    './shaders/pt.vert',
    './shaders/pt.frag',
];

///////////////////////////////////////////////////////////////////////////

function runGL() {
	var begin = Date.now();
	initGL();
	var end = Date.now();
	document.getElementById("time").innerHTML +=  "Initialize WebGL: " + (end-begin).toString() + " ms<br/>";
	
	begin = end;
	initializeShader();
	initBuffers();
	
	end = Date.now();
	document.getElementById("time").innerHTML +=  "Initialize Shader: " + (end-begin).toString() + " ms<br/>";
	
	initGUI();
	
	begin = end;
	initDfaultScene();
	end = Date.now();
	document.getElementById("time").innerHTML += "Load Scene: " + (end-begin).toString() + " ms";

	render_loop();
	
	//register
	canvas.onmousedown = handleMouseDown;
	canvas.oncontextmenu = function (ev) { return false; };
	document.onmouseup = handleMouseUp;
	document.onmousemove = handleMouseMove;
	document.onkeydown = handleKeyDown;
}

