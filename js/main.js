import {Renderer} from "./render.js";
import {Material, Obj} from "./scene.js";

import OBJFile from 'obj-file-parser';
import {wait_fetch_urls} from "./utils/utils.js";

window.onload = runGL;

async function runGL() {

	let meshFiles = await wait_fetch_urls([
		{
			name: 'icosahedron',
			url: './models/icosahedron.obj'
		},
		{
			name: 'suzanne',
			url: './models/suzanne.obj'
		}
	]);

	let parsedMeshes = [
		...new OBJFile(meshFiles['suzanne']).parse().models,
		...new OBJFile(meshFiles['icosahedron']).parse().models,
	];

	let shaderFiles = await wait_fetch_urls([
		{
			name: 'displayVert',
			url: './shaders/render.vert'
		},
		{
			name: 'displayFrag',
			url: './shaders/render.frag'
		},
		{
			name: 'ptVert',
			url: './shaders/pt.vert'
		},
		{
			name: 'ptFrag',
			url: './shaders/pt.frag'
		},
		{
			name: 'utils',
			url: './shaders/utils.glsl'
		}
	]);

	let render = new Renderer(shaderFiles, parsedMeshes, initDefaultScene);
	window.render = render;

	render.render_loop();
}

function initDefaultScene(scene, parsedMeshes) {

	// ===== meshes =====
	scene.addMeshes(parsedMeshes);

	// ===== materials =====
	scene.addMaterial(new Material(
		0,
		'light',
		[1.0, 1.0, 1.0],
		false,
		1.0,
		false,
		1.0,
		10.0,
		false
	));

	scene.addMaterial(new Material(
		1,
		'white diffuse',
		[1.0, 1.0, 1.0],
		false,
		1.0,
		false,
		1.0,
		0.0,
		false
	));

	scene.addMaterial(new Material(
		2,
		'red diffuse',
		[0.75, 0.25, 0.25],
		false,
		1.0,
		false,
		1.0,
		0.0,
		false
	));

	scene.addMaterial(new Material(
		3,
		'blue diffuse',
		[0.25, 0.25, 0.75],
		false,
		1.0,
		false,
		1.0,
		0.0,
		false
	));

	scene.addMaterial(new Material(
		4,
		'green diffuse',
		[0.25, 0.75, 0.25],
		false,
		1.0,
		false,
		1.0,
		0.0,
		false
	));

	scene.addMaterial(new Material(
		5,
		'metal',
		[0.9, 0.9, 0.9],
		true,
		1.0,
		false,
		1.0,
		0.0,
		false
	));

	scene.addMaterial(new Material(
		6,
		'metal diffuse',
		[0.9, 0.9, 0.9],
		true,
		0.9,
		false,
		1.0,
		0.0,
		false
	));

	scene.addMaterial(new Material(
		7,
		'glass',
		[1.0, 1.0, 1.0],
		true,
		1.0,
		true,
		1.7,
		0.0,
		true
	));

	scene.addMaterial(new Material(
		8,
		'glass diffuse',
		[1.0, 1.0, 1.0],
		true,
		0.95,
		true,
		1.7,
		0.0,
		true
	))

	scene.addMaterial(new Material(
		9,
		'desk diffuse',
		[0.5, 0.5, 0.1],
		false,
		1.0,
		false,
		1.0,
		0.0,
		false
	))

	// ===== objs =====

	// light
	// scene.addObj(new Obj(
	// 	0,
	// 	'light 1',
	// 	'cube',
	// 	[0.0, 4.95, 0.0],
	// 	[3.8, 0.1, 3.8],
	// 	[0.0, 0.0, 0.0],
	// 	1
	// ));

	scene.addObj(new Obj(
		1,
		'light 2',
		'plane',
		[-3.5, 4.0, 5.0],
		[2, 1, 2],
		[-120.0, 30.0, -20.0],
		0
	));

	// walls
	let WallScale = 10.0;
	let WallTrans = 5.0;

	scene.addObj(new Obj(
		2,
		'wall 3',
		'plane',
		[-WallTrans, 0.0, 0.0],
		[WallScale, 1.0, WallScale],
		[0.0, 0.0, -90.0],
		2
	));

	scene.addObj(new Obj(
		3,
		'wall 4',
		'plane',
		[WallTrans, 0.0, 0.0],
		[WallScale, 1.0, WallScale],
		[0.0, 0.0, 90.0],
		3
	));

	scene.addObj(new Obj(
		4,
		'wall 6',
		'plane',
		[0.0, -WallTrans, 0.0],
		[WallScale, 1.0, WallScale],
		[0.0, 0.0, 0.0],
		1
	));

	// sphere white diffuse
	scene.addObj(new Obj(
		5,
		'sphere green diffuse',
		'sphere',
		[-2.0, 0.0, 0.0],
		[1.5, 1.5, 1.5],
		[0.0, 0.0, 0.0],
		4
	));

	// sphere metal
	scene.addObj(new Obj(
		6,
		'sphere metal',
		'sphere',
		[0.0, 0.0, 0.0],
		[1.5, 1.5, 1.5],
		[0.0, 0.0, 0.0],
		5
	));

	scene.addObj(new Obj(
		7,
		'sphere metal diffuse',
		'sphere',
		[1.0, 0.0, 2.0],
		[1.5, 1.5, 1.5],
		[0.0, 0.0, 0.0],
		6
	));

	// sphere glass
	scene.addObj(new Obj(
		8,
		'sphere glass',
		'sphere',
		[2.0, 0.0, 0.0],
		[1.5, 1.5, 1.5],
		[0.0, 0.0, 0.0],
		7
	));

	scene.addObj(new Obj(
		9,
		'sphere glass',
		'sphere',
		[-1.0, 0.0, 2.0],
		[1.5, 1.5, 1.5],
		[0.0, 0.0, 0.0],
		8
	));

	// suzanne
	scene.addObj(new Obj(
		10,
		'suzanne',
		'mesh',
		[-1.5, 1.0, -2.5],
		[1.2, 1.2, 1.2],
		[0.0, 0.0, 0.0],
		6,
		0,
		scene.meshModelsManager.getMeshAABB(0)
	));

	// //icosahedron
	scene.addObj(new Obj(
		11,
		'icosahedron',
		'mesh',
		[1.5, 1.0, -2.5],
		[1.2, 1.2, 1.2],
		[0.0, 0.0, 0.0],
		7,
		1,
		scene.meshModelsManager.getMeshAABB(1)
	));

	// desk
	scene.addObj(new Obj(
		12,
		'desk',
		'cube',
		[0.0, -1.0, 0.0],
		[8, 0.2, 8],
		[0.0, 0.0, 0.0],
		9
	));
	// console.log(scene.objs);
	scene.flushRootBVH();

}