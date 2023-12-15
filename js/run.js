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

var iterations = 0;

///////////////////////////////////////////////////////////////////////////

function runGL() {
	let begin, end;

	begin = Date.now();
	initGL();
	end = Date.now();
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

	init_interaction();
}

