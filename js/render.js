import {requestAnimFrame, createWebGLContext, createProgram} from "./utils/webgl.js";
import {mat4, vec3} from "gl-matrix";
import Stats from "stats.js";

import { Material, Obj, Scene } from "./scene.js";
import { BVHs } from "./bvhs.js";
import { MeshModels, Mesh, Triangle } from "./meshes.js";

import {loadTexture} from "./utils/utils.js";

import GUI from 'lil-gui';

export class Renderer{
	/************************* render properties *************************/

	target_canvas; // canvas
	target_message; // message
	gl; // webgl context

	scene;
	viewConfig;
	interactions;

	width;
	height;

	/************************* shader properties *************************/

	shaderReady = false;

	//===== bridge between pt & display =====

	displayBufferTextures;
	displayBufferTextureData = [];
	// 2 textures, when pt done rendering, swap them and display the new one
	vertexPositionBuffer; // vertex buffer, store the screen vertex
	vertexPositionBufferData = [
		1.0, 1.0,
		-1.0, 1.0,
		1.0, -1.0,
		-1.0, -1.0,
	];

	//===== pt shader =====

	ptShaderProgram;
	frameBuffer; //Frame Buffer

	// vars & locations

	pt_cameraPos_uniformLocation;

	//Vertex Shader
	pt_vertexPos_attributeLocation;
	pt_invVP_uniformLocation;

	//Fragment Shader
	pt_objNums_uniformLocation;
	pt_time_uniformLocation;
	pt_iterations_uniformLocation;
	maxBounces = 8;
	pt_maxBounces_uniformLocation;

	enableSSAA = 0;
	pt_enableSSAA_uniformLocation;
	SSAA_Scale = 1.0;
	pt_SSAA_Scale_uniformLocation;

	pt_displayBuffer_textureLocation;
	pt_displayBufferTextureSize_uniformLocation;

	objAttributesTexture;
	pt_objAttributes_textureLocation;
	pt_objAttributesTextureSize_uniformLocation;
	pt_objSectionsPerObj_uniformLocation;

	materialAttributesTexture;
	pt_materialAttributes_textureLocation;
	pt_materialAttributesTextureSize_uniformLocation;
	pt_materialSectionsPerMaterial_uniformLocation;

	pt_rootBVH_uniformLocation;

	bvhsAttributesTexture;
	pt_bvhsAttributes_textureLocation;
	pt_bvhsAttributesTextureSize_uniformLocation;
	pt_bvhsSectionsPerNode_uniformLocation;

	elementIDMapAttributesTexture;
	pt_elementIDMapAttributes_textureLocation;
	pt_elementIDMapAttributesTextureSize_uniformLocation;

	meshAttributesTexture;
	pt_meshAttributes_textureLocation;
	pt_meshAttributesTextureSize_uniformLocation;
	pt_meshSectionsPerMesh_uniformLocation;

	triangleAttributesTexture;
	pt_triangleAttributes_textureLocation;
	pt_triangleAttributesTextureSize_uniformLocation;
	pt_triangleSectionsPerTriangle_uniformLocation;

	envTexture;
	pt_envTexture_uniformLocation;
	enableEnvTexture = true;
	pt_enableEnvTexture_uniformLocation;


	//===== display shader =====

	displayShaderProgram;

	// vars
	time = 0;
	iterations = 0;

	// locations
	display_vertexPos_attributeLocation;
	display_displayBuffer_textureLocation;

	/************************* init *************************/

	constructor(shaderFiles, parsedMeshes, initDefaultScene, canvasID = 'canvas', messageID = 'message') {
		let begin, end;

		begin = Date.now();
		// init target & context
		this.target_canvas = document.getElementById(canvasID);
		this.target_message = document.getElementById(messageID);
		this.initGL(this.target_canvas, this.target_message);
		// gui
		this.viewGUI = new GUI({title: 'View', container: document.getElementById('flex-container')});
		this.viewGUI.domElement.style.maxHeight = '90%';
		this.viewGUI.add({enable: false}, 'enable').name('Enable SSAA').onChange((value) => {
			this.enableSSAA = value ? 1 : 0;
			this.resetIterations();
		});
		this.viewGUI.add({SSAA_Scale: 1.0}, 'SSAA_Scale').min(0.0).max(5.0).name('SSAA Scale').onChange((value) => {
			this.SSAA_Scale = value;
			this.resetIterations();
		});
		this.viewGUI.add({resolution: [512,512]}, 'resolution', [[256,256], [512,512], [720, 720]]).name('Resolution').onChange((value) => {
			this.target_canvas.width = value[0];
			this.target_canvas.height = value[1];
			this.resize();
		});
		this.viewGUI.add({fov: 60}, 'fov').min(15).max(165).name('FOV').onChange((value) => {
			this.viewConfig.viewFOVY = value/180*Math.PI;
			this.resetIterations();
		});
		this.viewGUI.add({enableEnvTexture: true}, 'enableEnvTexture').name('Enable Env Texture').onChange((value) => {
			this.enableEnvTexture = value ? 1 : 0;
			this.resetIterations();
		});
		this.viewGUI.add({maxBounces : 8}, 'maxBounces').min(1).max(12).step(1).name('Max Bounces').onChange((value) => {
			this.maxBounces = value;
			this.resetIterations();
		});
		end = Date.now();
		document.getElementById("time").innerHTML +=  "Initialize WebGL: " + (end-begin).toString() + " ms<br/>";


		// init stats
		this.stats = new Stats();
		this.stats.showPanel(0);
		this.stats.domElement.id = 'stats';
		document.body.appendChild(this.stats.domElement);


		begin = Date.now();
		// init shader
		this.initShaders(shaderFiles);
		// init buffer
		this.initBuffers();

		end = Date.now();
		document.getElementById("time").innerHTML +=  "Initialize Shader: " + (end-begin).toString() + " ms<br/>";


		begin = Date.now();
		// init scene
		this.scene = new Scene([this.resetIterations.bind(this)], parsedMeshes);
		// init view
		this.viewConfig = new ViewConfig(
			Math.PI /6, 0.0, 13.5,
			vec3.create(),
			vec3.fromValues(0.0, 1.0, 0.0),
			Math.PI /3
		);
		// init default scene
		initDefaultScene(this.scene);

		end = Date.now();
		document.getElementById("time").innerHTML += "Load Scene: " + (end-begin).toString() + " ms";


		// init interact
		this.interactions = new Interactions(this.viewConfig, this.resetIterations.bind(this));
		this.interactions.bind_interactions(this.target_canvas);
	}

	initGL(canvas, message){
		this.gl = createWebGLContext(canvas, message);

		if (!this.gl) {
			alert("Could not initialise WebGL, sorry :-(");
			return;
		}
		let ext = this.gl.getExtension('EXT_color_buffer_float');
		if (!ext) {
			console.log('EXT_color_buffer_float is not supported by your browser and/or hardware');
		}else{
			console.log("EXT_color_buffer_float enabled")
		}

		this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
		this.gl.enable(this.gl.DEPTH_TEST);
	}

	initShaders(shaders_file) {

		let ptVert = shaders_file['ptVert'];
		let ptFrag = shaders_file['ptFrag'];
		let displayVert = shaders_file['displayVert'];
		let displayFrag = shaders_file['displayFrag'];
		let utils = shaders_file['utils'];

		//===== pt shader =====
		this.ptShaderProgram = createProgram(this.gl, utils + ptVert, utils + ptFrag, this.target_message);
		//Vertex Shader
		this.pt_vertexPos_attributeLocation = this.gl.getAttribLocation(this.ptShaderProgram, "vertexPos");
		this.gl.enableVertexAttribArray(this.pt_vertexPos_attributeLocation);
		this.pt_cameraPos_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "cameraPos");
		this.pt_invVP_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "invVP");
		//Fragment Shader
		this.pt_time_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "time");
		this.pt_iterations_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "iterations");
		this.pt_objNums_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "objNums");

		this.pt_displayBuffer_textureLocation = this.gl.getUniformLocation(this.ptShaderProgram, "displayBufferTexture");
		this.pt_displayBufferTextureSize_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "displayBufferTextureSize");

		this.pt_objAttributes_textureLocation = this.gl.getUniformLocation(this.ptShaderProgram, "objAttributesTexture");
		this.pt_objAttributesTextureSize_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "objAttributesTextureSize");
		this.pt_objSectionsPerObj_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "objSectionsPerObj");

		this.pt_materialAttributes_textureLocation = this.gl.getUniformLocation(this.ptShaderProgram, "materialAttributesTexture");
		this.pt_materialAttributesTextureSize_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "materialAttributesTextureSize");
		this.pt_materialSectionsPerMaterial_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "materialSectionsPerMaterial");

		this.pt_rootBVH_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "rootBVH");

		this.pt_bvhsAttributes_textureLocation = this.gl.getUniformLocation(this.ptShaderProgram, "bvhsAttributesTexture");
		this.pt_bvhsAttributesTextureSize_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "bvhsAttributesTextureSize");
		this.pt_bvhsSectionsPerNode_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "bvhsSectionsPerNode");

		this.pt_elementIDMapAttributes_textureLocation = this.gl.getUniformLocation(this.ptShaderProgram, "elementIDMapAttributesTexture");
		this.pt_elementIDMapAttributesTextureSize_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "elementIDMapAttributesTextureSize");

		this.pt_meshAttributes_textureLocation = this.gl.getUniformLocation(this.ptShaderProgram, "meshAttributesTexture");
		this.pt_meshAttributesTextureSize_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "meshAttributesTextureSize");
		this.pt_meshSectionsPerMesh_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "meshSectionsPerMesh");

		this.pt_triangleAttributes_textureLocation = this.gl.getUniformLocation(this.ptShaderProgram, "triangleAttributesTexture");
		this.pt_triangleAttributesTextureSize_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "triangleAttributesTextureSize");
		this.pt_triangleSectionsPerTriangle_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "triangleSectionsPerTriangle");

		this.pt_envTexture_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "envTexture");
		this.pt_enableEnvTexture_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "enableEnvTexture");

		this.pt_maxBounces_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "maxBounces");

		this.pt_enableSSAA_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "enableSSAA");
		this.pt_SSAA_Scale_uniformLocation = this.gl.getUniformLocation(this.ptShaderProgram, "SSAA_Scale");
		//===== display shader =====
		this.displayShaderProgram = createProgram(this.gl, displayVert, displayFrag, this.target_message);

		this.display_vertexPos_attributeLocation = this.gl.getAttribLocation(this.displayShaderProgram, 'vertexPos');
		this.gl.enableVertexAttribArray(this.display_vertexPos_attributeLocation);
		this.display_displayBuffer_textureLocation = this.gl.getUniformLocation(this.displayShaderProgram, "displayBufferTexture");

		this.shaderReady = true;
	}

	initBuffers() {

		// 创建一个缓冲区存放屏幕顶点坐标，这里抽象成一个单位正方形
		this.vertexPositionBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.vertexPositionBufferData), this.gl.STATIC_DRAW);

		// 创建一个帧缓冲区，用于存放渲染结果
		this.frameBuffer = this.gl.createFramebuffer();

		// 创建两个纹理，绑定在上面的帧缓冲区，每次 pt 渲染完成后交换，并用 display 渲染至屏幕
		this.displayBufferTextures = [];
		for (let i = 0; i < 2; i++) {
			this.displayBufferTextures.push(this.gl.createTexture());
		}
		this.resize()//根据初始化的宽高创建纹理

		// 创建一个纹理，用于存放物体属性
		this.objAttributesTexture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.objAttributesTexture);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);

		// 创建一个纹理，用于存放材质属性
		this.materialAttributesTexture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.materialAttributesTexture);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);

		// 创建一个纹理，用于存放 BVHs 属性
		this.bvhsAttributesTexture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.bvhsAttributesTexture);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);

		// 创建一个纹理，用于存放 elementIDMap 属性
		this.elementIDMapAttributesTexture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.elementIDMapAttributesTexture);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);

		// 创建一个纹理，用于存放 mesh 属性
		this.meshAttributesTexture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.meshAttributesTexture);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);

		// 创建一个纹理，用于存放 triangle 属性
		this.triangleAttributesTexture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.triangleAttributesTexture);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);

		// 创建一个纹理，用于存放 env
		this.envTexture = loadTexture(this.gl, './textures/env.jpg')
		// this.envTexture = this.gl.createTexture();
		// this.gl.bindTexture(this.gl.TEXTURE_2D, this.envTexture);
		// this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		// this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
		// this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
		// this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
		// this.gl.bindTexture(this.gl.TEXTURE_2D, null);
	}

	/************************* render *************************/

	resize() {
		// this.target_canvas.width = 512;
		// this.target_canvas.height = 512;

		this.gl.viewport(0, 0, this.target_canvas.width, this.target_canvas.height);

		this.displayBufferTextureData[0] = new Float32Array(this.target_canvas.width * this.target_canvas.height * 4).fill(0);
		this.displayBufferTextureData[1] = new Float32Array(this.target_canvas.width * this.target_canvas.height * 4).fill(0);
		let type1 = this.gl.RGBA32F;
		let type2 = this.gl.FLOAT;

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.displayBufferTextures[0]);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, type1, this.target_canvas.width, this.target_canvas.height, 0, this.gl.RGBA, type2, this.displayBufferTextureData[0]);

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.displayBufferTextures[1]);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, type1, this.target_canvas.width, this.target_canvas.height, 0, this.gl.RGBA, type2, this.displayBufferTextureData[1]);

		this.gl.bindTexture(this.gl.TEXTURE_2D, null);

		this.resetIterations();
	}


	resetIterations() {
		this.iterations = 0;
		this.time = 0;
	}

	render_loop() {

		requestAnimFrame(this.render_loop.bind(this));

		if(!this.shaderReady)
			return;

		if (this.stats)
			this.stats.update();

		this.target_message.innerHTML = "Iterations: " + (this.iterations).toString();

		if (!this.interactions.pause || this.iterations === 0) {

			// render to texture
			this.gl.useProgram(this.ptShaderProgram);

			this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

			let eye = this.viewConfig.calcEyeCoord();

			let V = mat4.create();
			mat4.lookAt(V, eye, this.viewConfig.viewCenter, this.viewConfig.viewUp);

			let P = mat4.create();
			mat4.perspective(P, this.viewConfig.viewFOVY, this.target_canvas.width / this.target_canvas.height, 0.1, 100.0);

			let VP = mat4.create();
			mat4.multiply(VP, P, V);

			let invVP = mat4.create();
			mat4.invert(invVP, VP);

			this.gl.uniformMatrix4fv(this.pt_invVP_uniformLocation, false, invVP);
			this.gl.uniform3f(this.pt_cameraPos_uniformLocation, eye[0], eye[1], eye[2]);
			this.gl.uniform1f(this.pt_time_uniformLocation, this.time);
			this.gl.uniform1f(this.pt_iterations_uniformLocation, this.iterations);
			this.gl.uniform1i(this.pt_objNums_uniformLocation, this.scene.objs.length);
			this.gl.uniform1i(this.pt_enableSSAA_uniformLocation, this.enableSSAA);
			this.gl.uniform1f(this.pt_SSAA_Scale_uniformLocation, this.SSAA_Scale)

			this.gl.uniform1i(this.pt_maxBounces_uniformLocation, this.maxBounces)

			this.gl.uniform2f(this.pt_displayBufferTextureSize_uniformLocation, this.target_canvas.width, this.target_canvas.height);
			this.gl.activeTexture(this.gl.TEXTURE0);
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.displayBufferTextures[0]);
			this.gl.uniform1i(this.pt_displayBuffer_textureLocation, 0);

			// obj
			this.gl.uniform2f(this.pt_objAttributesTextureSize_uniformLocation, Scene.objAttributesWidth, Scene.objAttributesHeight);
			this.gl.activeTexture(this.gl.TEXTURE1);  //attributes for objs
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.objAttributesTexture);
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, Scene.objAttributesWidth, Scene.objAttributesHeight, 0, this.gl.RGBA, this.gl.FLOAT, this.scene.objAttributesTextureData);
			this.gl.uniform1i(this.pt_objAttributes_textureLocation, 1);

			this.gl.uniform1i(this.pt_objSectionsPerObj_uniformLocation, Obj.sectionsPerObj);
			// end obj

			// material
			this.gl.uniform2f(this.pt_materialAttributesTextureSize_uniformLocation, Scene.materialAttributesWidth, Scene.materialAttributesHeight);
			this.gl.activeTexture(this.gl.TEXTURE2);  //attributes for materials
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.materialAttributesTexture);
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, Scene.materialAttributesWidth, Scene.materialAttributesHeight, 0, this.gl.RGBA, this.gl.FLOAT, this.scene.materialAttributesTextureData);
			this.gl.uniform1i(this.pt_materialAttributes_textureLocation, 2);

			this.gl.uniform1i(this.pt_materialSectionsPerMaterial_uniformLocation, Material.sectionsPerMaterial);
			// end material

			// bvh
			this.gl.uniform1i(this.pt_rootBVH_uniformLocation, this.scene.rootBVH);

			this.gl.uniform2f(this.pt_bvhsAttributesTextureSize_uniformLocation, BVHs.bvhsAttributesWidth, BVHs.bvhsAttributesHeight);
			this.gl.activeTexture(this.gl.TEXTURE3);  //attributes for BVHs
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.bvhsAttributesTexture);
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, BVHs.bvhsAttributesWidth, BVHs.bvhsAttributesHeight, 0, this.gl.RGBA, this.gl.FLOAT, this.scene.bvhsManager.bvhsAttributesTextureData);
			this.gl.uniform1i(this.pt_bvhsAttributes_textureLocation, 3);

			this.gl.uniform1i(this.pt_bvhsSectionsPerNode_uniformLocation, BVHs.bvhsSectionsPerNode);

			this.gl.uniform2f(this.pt_elementIDMapAttributesTextureSize_uniformLocation, BVHs.elementIDMapAttributesWidth, BVHs.elementIDMapAttributesHeight);
			this.gl.activeTexture(this.gl.TEXTURE4);  //attributes for elementIDMap
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.elementIDMapAttributesTexture);
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, BVHs.elementIDMapAttributesWidth, BVHs.elementIDMapAttributesHeight, 0, this.gl.RGBA, this.gl.FLOAT, this.scene.bvhsManager.elementIDMapAttributesTextureData);
			this.gl.uniform1i(this.pt_elementIDMapAttributes_textureLocation, 4);
			// end bvh

			// mesh
			this.gl.uniform2f(this.pt_meshAttributesTextureSize_uniformLocation, MeshModels.meshAttributesWidth, MeshModels.meshAttributesHeight);
			this.gl.activeTexture(this.gl.TEXTURE5);  //attributes for meshes
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.meshAttributesTexture);
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB32F, MeshModels.meshAttributesWidth, MeshModels.meshAttributesHeight, 0, this.gl.RGB, this.gl.FLOAT, this.scene.meshModelsManager.meshAttributesTextureData);
			this.gl.uniform1i(this.pt_meshAttributes_textureLocation, 5);

			this.gl.uniform1i(this.pt_meshSectionsPerMesh_uniformLocation, Mesh.sectionPerMesh);

			this.gl.uniform2f(this.pt_triangleAttributesTextureSize_uniformLocation, MeshModels.triangleAttributesWidth, MeshModels.triangleAttributesHeight);
			this.gl.activeTexture(this.gl.TEXTURE6);  //attributes for triangles
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.triangleAttributesTexture);
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB32F, MeshModels.triangleAttributesWidth, MeshModels.triangleAttributesHeight, 0, this.gl.RGB, this.gl.FLOAT, this.scene.meshModelsManager.triangleAttributesTextureData);
			this.gl.uniform1i(this.pt_triangleAttributes_textureLocation, 6);

			this.gl.uniform1i(this.pt_triangleSectionsPerTriangle_uniformLocation, Triangle.sectionPerTriangle);
			// end mesh

			// env
			this.gl.activeTexture(this.gl.TEXTURE7);  //env
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.envTexture);
			this.gl.generateMipmap(this.gl.TEXTURE_2D);
			this.gl.uniform1i(this.pt_envTexture_uniformLocation, 7);

			this.gl.uniform1i(this.pt_enableEnvTexture_uniformLocation, this.enableEnvTexture);
			// end env

			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer);
			this.gl.vertexAttribPointer(this.pt_vertexPos_attributeLocation, 2, this.gl.FLOAT, false, 0, 0);

			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
			this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.displayBufferTextures[1], 0);

			if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) !== this.gl.FRAMEBUFFER_COMPLETE) {
				console.log('Framebuffer is not complete');
			}

			this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

			this.displayBufferTextures.reverse();

			//render to screen
			this.gl.useProgram(this.displayShaderProgram);
			this.gl.activeTexture(this.gl.TEXTURE0);
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.displayBufferTextures[0]);
			this.gl.uniform1i(this.display_displayBuffer_textureLocation, 0);

			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer);
			this.gl.vertexAttribPointer(this.display_vertexPos_attributeLocation, 2, this.gl.FLOAT, false, 0, 0);

			this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

			this.iterations++;
			this.time += 7e-6;

		}
	}
}

class ViewConfig{
	constructor(viewAngleX, viewAngleY, viewZoomZ, viewCenter, viewUp, viewFOVY) {
		this.viewAngleX = viewAngleX;
		this.viewAngleY = viewAngleY;
		this.viewZoomZ = viewZoomZ;

		this.viewCenter = viewCenter;
		this.viewUp = viewUp;
		this.viewFOVY = viewFOVY;
	}

	calcEyeFromCenter(){
		return vec3.fromValues(
			this.viewZoomZ * Math.sin(this.viewAngleY) * Math.cos(this.viewAngleX),
			this.viewZoomZ * Math.sin(this.viewAngleX),
			this.viewZoomZ * Math.cos(this.viewAngleY) * Math.cos(this.viewAngleX)
		)
	}

	calcEyeCoord(){
		let eyeFromCenter = this.calcEyeFromCenter();
		return vec3.add(eyeFromCenter, eyeFromCenter, this.viewCenter);
	}

	viewRotate(deltaAngleX, deltaAngleY){
		this.viewAngleX += deltaAngleX;
		this.viewAngleY += deltaAngleY;

		this.viewAngleX = Math.max(this.viewAngleX, -Math.PI / 2 + 0.01);
		this.viewAngleX = Math.min(this.viewAngleX, Math.PI / 2 - 0.01);
	}

	viewZoom(deltaZoom){
		this.viewZoomZ += deltaZoom;
		this.viewZoomZ = Math.min(Math.max(this.viewZoomZ, 4.0), 20.0);
	}

	viewTranslate(deltaX, deltaY){
		let lookDir = vec3.create();
		vec3.negate(lookDir, this.calcEyeFromCenter())
		vec3.normalize(lookDir, lookDir);

		let leftDir = vec3.create();
		vec3.cross(leftDir, lookDir, this.viewUp);
		vec3.normalize(leftDir, leftDir);

		let upDir = vec3.create();
		vec3.cross(upDir, leftDir, lookDir);
		vec3.normalize(upDir, upDir);

		let moveDir = vec3.create();
		vec3.scale(moveDir, leftDir, -deltaX);
		vec3.scaleAndAdd(moveDir, moveDir, upDir, deltaY);

		vec3.add(this.viewCenter, this.viewCenter, moveDir);
	}
}

class Interactions{
	viewConfig;
	callback;

	mouseLeftDown = false;
	mouseRightDown = false;
	mouseMidDown = false;
	lastMouseX = null;
	lastMouseY = null;

	pause = false;

	constructor(viewConfig, callback) {
		this.viewConfig = viewConfig;
		this.callback = callback;
	}

	handleMouseDown(event) {
		if (event.button === 2) {
			this.mouseLeftDown = false;
			this.mouseRightDown = true;
			this.mouseMidDown = false;
		}
		else if (event.button === 0) {
			this.mouseLeftDown = true;
			this.mouseRightDown = false;
			this.mouseMidDown = false;
		}
		else if (event.button === 1) {
			this.mouseLeftDown = false;
			this.mouseRightDown = false;
			this.mouseMidDown = true;
		}
		this.lastMouseX = event.clientX;
		this.lastMouseY = event.clientY;
	}

	handleMouseUp(event) {
		this.mouseLeftDown = false;
		this.mouseRightDown = false;
		this.mouseMidDown = false;
	}

	handleMouseMove(event) {
		if (!(this.mouseLeftDown || this.mouseRightDown || this.mouseMidDown)) {
			return;
		}
		let newX = event.clientX;
		let newY = event.clientY;

		let deltaX = newX - this.lastMouseX;
		let deltaY = newY - this.lastMouseY;

		if (this.mouseLeftDown) {
			this.viewConfig.viewRotate(deltaY * 0.01, -deltaX * 0.01);
		}
		else if (this.mouseRightDown) {
			this.viewConfig.viewZoom(deltaY * 0.01);
		}
		else if (this.mouseMidDown) {
			this.viewConfig.viewTranslate(deltaX * 0.01, deltaY * 0.01);
		}

		this.lastMouseX = newX;
		this.lastMouseY = newY;

		this.callback();
	}

	handleKeyDown(event){
		if (event.keyCode === 32)
			this.pause = !this.pause;
	}

	bind_interactions(canvas){
		canvas.onmousedown = this.handleMouseDown.bind(this);
		canvas.oncontextmenu = function (ev) { return false; };
		document.onmouseup = this.handleMouseUp.bind(this);
		document.onmousemove = this.handleMouseMove.bind(this);
		document.onkeydown = this.handleKeyDown.bind(this);
	}
}