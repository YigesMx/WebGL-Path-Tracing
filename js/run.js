window.onload = runGL;

var canvas;
var message;

var eye = { x: 0.0, y: 0.0, z: 0.0 };
var center = { x: 0.0, y: 0.0, z: 0.0 };
var up = { x: 0.0, y: 1.0, z: 0.0 };
var FOVY = 45.0;

eye.x = zoomZ * Math.sin(angleY) * Math.cos(angleX);
eye.y = zoomZ * Math.sin(angleX);
eye.z = zoomZ * Math.cos(angleY) * Math.cos(angleX);


//Added for attrtexture
//width and height must be pow(2,n)
var attw = 1024;  //width
var atth = 2; //height
var attributes = new Uint8Array(attw * atth * 4);
//bool for SSAA
var SSAA = 0;

var iterations = 0;

var Datas = [];

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
	init_interaction();
}

