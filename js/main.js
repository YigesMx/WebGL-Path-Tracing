import {Renderer} from "./render.js";
import {Material, Obj} from "./scene.js";

import OBJFile from 'obj-file-parser';
import {wait_fetch_urls} from "./utils/utils.js";

window.onload = main;

async function main() {

	let meshFiles = await wait_fetch_urls([
		{
			name: 'icosahedron',
			url: './models/icosahedron.obj'
		},
		{
			name: 'suzanne',
			url: './models/suzanne.obj'
		},
		{
			name: 'sphere_triangles',
			url: './models/sphere_triangle.obj'
		},
		// {
		// 	name: 'dragon',
		// 	url: './models/dragon.obj'
		// }
	]);

	let parsedMeshes = [
		...new OBJFile(meshFiles['suzanne']).parse().models,
		...new OBJFile(meshFiles['icosahedron']).parse().models,
		...new OBJFile(meshFiles['sphere_triangles']).parse().models,
		// ...new OBJFile(meshFiles['dragon']).parse().models,
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

	let render = new Renderer(shaderFiles, parsedMeshes, (scene) => {
		// ===== materials =====
		scene.addMaterial(new Material(
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
			'yellow diffuse',
			[0.7, 0.7, 0.05],
			false,
			1.0,
			false,
			1.0,
			0.0,
			false
		));

		scene.addMaterial(new Material(
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
			'glass diffuse',
			[1.0, 1.0, 1.0],
			true,
			0.95,
			true,
			1.7,
			0.0,
			true
		))

		// ===== objs =====

		// light
		scene.addObj(new Obj(
			'light',
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
			'wall left',
			'plane',
			[-WallTrans, 0.0, 0.0],
			[WallScale, 1.0, WallScale],
			[0.0, 0.0, -90.0],
			2
		));

		scene.addObj(new Obj(
			'wall right',
			'plane',
			[WallTrans, 0.0, 0.0],
			[WallScale, 1.0, WallScale],
			[0.0, 0.0, 90.0],
			3
		));

		scene.addObj(new Obj(
			'wall bottom',
			'plane',
			[0.0, -WallTrans, 0.0],
			[WallScale, 1.0, WallScale],
			[0.0, 0.0, 0.0],
			1
		));

		// desk
		scene.addObj(new Obj(
			'desk',
			'cube',
			[0.0, -1.1, 0.0],
			[8.0, 0.2, 6.0],
			[0.0, 0.0, 0.0],
			5
		));

		// sphere white diffuse
		scene.addObj(new Obj(
			'sphere green diffuse',
			'sphere',
			[-2.0, 0.0, 0.0],
			[1.5, 1.5, 1.5],
			[0.0, 0.0, 0.0],
			4
		));

		// sphere metal
		scene.addObj(new Obj(
			'sphere metal',
			'sphere',
			[0.0, 0.0, 0.0],
			[1.5, 1.5, 1.5],
			[0.0, 0.0, 0.0],
			6
		));

		scene.addObj(new Obj(
			'sphere metal diffuse',
			'sphere',
			[1.0, 0.0, 2.0],
			[1.5, 1.5, 1.5],
			[0.0, 0.0, 0.0],
			7
		));

		// sphere glass
		scene.addObj(new Obj(
			'sphere glass',
			'sphere',
			[2.0, 0.0, 0.0],
			[1.5, 1.5, 1.5],
			[0.0, 0.0, 0.0],
			8
		));

		scene.addObj(new Obj(
			'sphere glass diffuse',
			'sphere',
			[-1.0, 0.0, 2.0],
			[1.5, 1.5, 1.5],
			[0.0, 0.0, 0.0],
			9
		));

		// suzanne
		scene.addObj(new Obj(
			'suzanne',
			'mesh',
			[-1.5, 1.0, -2.5],
			[1.2, 1.2, 1.2],
			[0.0, 0.0, 0.0],
			7,
			0,
			scene.meshModelsManager.getMeshAABB(0)
		));

		// icosahedron
		scene.addObj(new Obj(
			'icosahedron',
			'mesh',
			[1.5, 1.0, -2.5],
			[1.2, 1.2, 1.2],
			[0.0, 0.0, 0.0],
			8,
			1,
			scene.meshModelsManager.getMeshAABB(1)
		));

		scene.onChange(true);
	});

	window.render = render;
	render.render_loop();
}