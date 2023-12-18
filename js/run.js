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
	initDefaultScene();
	end = Date.now();
	document.getElementById("time").innerHTML += "Load Scene: " + (end-begin).toString() + " ms";

	render_loop();

	init_interaction();
}

var DefaultDatas = [];
var defaultSize = 6;

var scene;

function initDefaultScene() {
	scene = new Scene();

	scene.addMaterial(new Material(
		'light',
		[1.0, 1.0, 1.0],
		false,
		1.0,
		false,
		1.0,
		30.0,
		false
	))

	scene.addMaterial(new Material(
		'red diffuse',
		[0.75, 0.25, 0.25],
		false,
		1.0,
		false,
		1.0,
		0.0,
		false
	))

	scene.addMaterial(new Material(
		'blue diffuse',
		[0.25, 0.25, 0.75],
		false,
		1.0,
		false,
		1.0,
		0.0,
		false
	))

	scene.addMaterial(new Material(
		'green diffuse',
		[0.25, 0.75, 0.25],
		false,
		1.0,
		false,
		1.0,
		0.0,
		false
	))

	scene.addMaterial(new Material(
		'red metal',
		[0.9, 0.9, 0.9],
		true,
		1.0,
		false,
		1.0,
		0.0,
		false
	))

	scene.addMaterial(new Material(
		'glass',
		[1.0, 1.0, 1.0],
		true,
		1.0,
		true,
		1.7,
		0.0,
		true
	))

	// light
	scene.addObj(new Obj(
		'light',
		'cube',
		[0.0, 4.95, 0.0],
		[3.8, 0.1, 3.8],
		[0.0, 0.0, 0.0],
		1
	))

	// walls
	var WallScale = 10.0;
	var WallTrans = 5.0;

	scene.addObj(new Obj(
		'wall 1',
		'plane',
		[0.0, 0.0, -WallTrans],
		[WallScale, 1.0, WallScale],
		[90.0, 0.0, 0.0],
		0,
	))

	scene.addObj(new Obj(
		'wall 2',
		'plane',
		[0.0, 0.0, WallTrans],
		[WallScale, 1.0, WallScale],
		[-90.0, 0.0, 0.0],
	))

	scene.addObj(new Obj(
		'wall 3',
		'plane',
		[-WallTrans, 0.0, 0.0],
		[WallScale, 1.0, WallScale],
		[0.0, 0.0, -90.0],
		2
	))

	scene.addObj(new Obj(
		'wall 4',
		'plane',
		[WallTrans, 0.0, 0.0],
		[WallScale, 1.0, WallScale],
		[0.0, 0.0, 90.0],
		3
	))

	scene.addObj(new Obj(
		'wall 5',
		'plane',
		[0.0, WallTrans, 0.0],
		[WallScale, 1.0, WallScale],
		[180.0, 0.0, 0.0],
	))

	scene.addObj(new Obj(
		'wall 6',
		'plane',
		[0.0, -WallTrans, 0.0],
		[WallScale, 1.0, WallScale],
		[0.0, 0.0, 0.0],
	))

	// sphere white diffuse
	scene.addObj(new Obj(
		'sphere white diffuse',
		'sphere',
		[-2.0, 0.0, 0.0],
		[1.8, 1.8, 1.8],
		[0.0, 0.0, 0.0],
		0
	))

	// sphere metal
	scene.addObj(new Obj(
		'sphere metal',
		'sphere',
		[0.0, 0.0, 0.0],
		[1.8, 1.8, 1.8],
		[0.0, 0.0, 0.0],
		5
	))

	// sphere glass
	scene.addObj(new Obj(
		'sphere glass',
		'sphere',
		[2.0, 0.0, 0.0],
		[1.8, 1.8, 1.8],
		[0.0, 0.0, 0.0],
		6
	))

	// desk
	scene.addObj(new Obj(
		'desk',
		'cube',
		[0.0, -1.5, 0.0],
		[8, 0.2, 5],
		[0.0, 0.0, 0.0],
		4
	))

	scene.flushRootBVH();

}

// function initDefaultScene() {
//
// 	//Light For Subsurface Scattering,only one light and always at first
// 	DefaultDatas.push({
// 		obj_pos: [0.0, 4.95, 0.0],
// 		obj_scale: [3.8, 0.1, 3.8],
// 		obj_rotation: [0.0, 0.0, 0.0],
// 		obj_color: [1.0, 1.0, 1.0],
// 		obj_type: 2,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 25,
// 		obj_subsurfaceScatter: 0
// 	});
//
// 	//Walls
// 	var WallScale = 10.0;
// 	var WallTrans = 5.0;
//
// 	DefaultDatas.push({
// 		obj_pos: [0.0, 0.0, -WallTrans+0.1],
// 		obj_scale: [WallScale, 1.0, WallScale],
// 		obj_rotation: [91.0, 0.0, 0.0],
// 		obj_color: [1.0, 1.0, 1.0],
// 		obj_type: 1,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
//
// 	DefaultDatas.push({
// 		obj_pos: [-WallTrans+0.1, 0.0, 0.0],
// 		obj_scale: [ WallScale,1.0, WallScale],
// 		obj_rotation: [0.0, 0.0, 271.0],
// 		obj_color: [0.75, 0.25, 0.25],
// 		obj_type: 1,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
//
// 	DefaultDatas.push({
// 		obj_pos: [WallTrans-0.1, 0.0, 0.0],
// 		obj_scale: [WallScale,1.0, WallScale],
// 		obj_rotation: [0.0, 0.0, 91.0],
// 		obj_color: [0.25, 0.25, 0.75],
// 		obj_type: 1,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
//
// 	DefaultDatas.push({
// 		obj_pos: [0.0, WallTrans, 0.0],
// 		obj_scale: [WallScale, 1.0, WallScale],
// 		obj_rotation: [180.0, 0.0, 0.0],
// 		obj_color: [0.75, 0.75, 0.75],
// 		obj_type: 1,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
//
// 	DefaultDatas.push({
// 		obj_pos: [0.0, -WallTrans, 0.0],
// 		obj_scale: [WallScale, 1.0, WallScale],
// 		obj_rotation: [0.0, 0.0, 0.0],
// 		obj_color: [0.75, 0.75, 0.75],
// 		obj_type: 1,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
//
//
// 	//Sphere1
// 	DefaultDatas.push({
// 		obj_pos: [-2.0, 0.0, 0.0],
// 		obj_scale: [1.8, 1.8, 1.8],
// 		obj_rotation: [30.0, 4.0, 0.0],
// 		obj_color: [1.0, 0.0, 0.0],
// 		obj_type: 0,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
//
// 	//Sphere2
// 	DefaultDatas.push({
// 		obj_pos: [0.0, 0.0, 0.0],
// 		obj_scale: [1.8, 1.8, 1.8],
// 		obj_rotation: [30.0, 4.0, 0.0],
// 		obj_color: [0.95, 0.5, 0.4],
// 		obj_type: 0,
// 		obj_textureType: 0,
// 		obj_reflective: 1,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 1
// 	});
//
//
// 	//Sphere3
// 	DefaultDatas.push({
// 		obj_pos: [2.0, 0.0, 0.0],
// 		obj_scale: [1.8, 1.8, 1.8],
// 		obj_rotation: [30.0, 4.0, 0.0],
// 		obj_color: [1.0, 1.0, 1.0],
// 		obj_type: 0,
// 		obj_textureType: 0,
// 		obj_reflective: 1,
// 		obj_refractive: 1,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 3.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 1
// 	});
//
// 	//Box
// 	DefaultDatas.push({
// 		obj_pos: [0.0, -1.5, 0.0],
// 		obj_scale: [6.8, 0.2, 4.8],
// 		obj_rotation: [0.0, 0.0, 0.0],
// 		obj_color: [0.8, 0.8, 0.8],
// 		obj_type: 2,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
//
// 	//Legs
// 	var legpos1 = 3.0, legpos2 = 1.8;
// 	DefaultDatas.push({
// 		obj_pos: [legpos1, -3.5, legpos2],
// 		obj_scale: [0.3, 4.0, 0.3],
// 		obj_rotation: [0.0, 0.0, 0.0],
// 		obj_color: [0.9, 0.4, 0.0],
// 		obj_type: 2,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
//
// 	DefaultDatas.push({
// 		obj_pos: [-legpos1, -3.5, legpos2],
// 		obj_scale: [0.3, 4.0, 0.3],
// 		obj_rotation: [0.0, 0.0, 0.0],
// 		obj_color: [0.9, 0.4, 0.0],
// 		obj_type: 2,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
//
// 	DefaultDatas.push({
// 		obj_pos: [legpos1, -3.5, -legpos2],
// 		obj_scale: [0.3, 4.0, 0.3],
// 		obj_rotation: [0.0, 0.0, 0.0],
// 		obj_color: [0.9, 0.4, 0.0],
// 		obj_type: 2,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
//
// 	DefaultDatas.push({
// 		obj_pos: [-legpos1, -3.5, -legpos2],
// 		obj_scale: [0.3, 4.0, 0.3],
// 		obj_rotation: [0.0, 0.0, 0.0],
// 		obj_color: [0.9, 0.4, 0.0],
// 		obj_type: 2,
// 		obj_textureType: 0,
// 		obj_reflective: 0,
// 		obj_refractive: 0,
// 		obj_reflectivity: 1.0,
// 		obj_indexOfRefraction: 1.0,
// 		obj_emittance: 0,
// 		obj_subsurfaceScatter: 0
// 	});
// 	defaultScene();
// }
//
// function defaultScene() {
// 	objData.length = 0;
//
// 	for (var i = 0; i < DefaultDatas.length; i++) {
// 		objData[i] = DefaultDatas[i];
// 		AddObjsAttr(i);
// 	}
//
// 	iterations = 0;
//
//
// 	var node = document.getElementById("gui2");
// 	if (node != null)
// 		node.parentNode.removeChild(node);
//
// 	// GUIDefaultScene();
// }