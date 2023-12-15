///////////////////////////////////////////////////////////////////////////
var gl;

//===== bridge between pt & display
var displayBufferTextures;
// 2 textures, when pt done rendering, swap them and display the new one
var displayVertexPositionBufferData = [
	1.0, 1.0,
	-1.0, 1.0,
	1.0, -1.0,
	-1.0, -1.0,
];
var displayVertexPositionBuffer;
// vertex buffer, store the screen vertex


//===== pt shader =====
var ptShaderProgram;
var frameBuffer; //Frame Buffer

// vars

//bool for SSAA
var enableSSAA = 0;

//objects attributes texture
//width and height must be pow(2,n)
var objAttributesWidth = 1024;  //width
var objAttributesHeight = 2; //height
var objAttributesTextureData = new Uint8Array(objAttributesWidth * objAttributesHeight * 4);
var objAttributesTexture;

// locations

var pt_cameraPos_uniformLocation;

//Vertex Shader
var pt_vertexPos_attributeLocation;
var pt_invVP_uniformLocation;

//Fragment Shader
var pt_objNums_uniformLocation;
var pt_time_uniformLocation;
var pt_iterations_uniformLocation;
var pt_displayBuffer_textureLocation;
var pt_objAttributes_textureLocation;
var pt_displayBufferTextureSize_uniformLocation;
var pt_objAttributesTextureSize_uniformLocation;
var pt_enableSSAA_uniformLocation;

//===== display shader =====
var displayShaderProgram;

// vars
var time = 0;

// locations
var display_vertexPos_attributeLocation;
var display_displayBuffer_textureLocation;

//===== functions =====
function resize() {
	canvas.width = width;
	canvas.height = height;

	gl.viewport(0, 0, canvas.width, canvas.height);

	var type = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, displayBufferTextures[0]);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, canvas.width, canvas.height, 0, gl.RGB, type, null);

	gl.bindTexture(gl.TEXTURE_2D, displayBufferTextures[1]);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, canvas.width, canvas.height, 0, gl.RGB, type, null);

	gl.bindTexture(gl.TEXTURE_2D, null);

	resetIterations();
}

function initGL(){
	message = document.getElementById("message");
	canvas = document.getElementById("canvas");
	gl = createWebGLContext(canvas, message);
	
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
		return;
	}
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
}

function initBuffers() {

	// 创建一个缓冲区存放屏幕顶点坐标，这里抽象成一个单位正方形
	displayVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, displayVertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(displayVertexPositionBufferData), gl.STATIC_DRAW);

	// 创建一个帧缓冲区，用于存放渲染结果
	frameBuffer = gl.createFramebuffer();

	// 创建两个纹理，绑定在上面的帧缓冲区，每次 pt 渲染完成后交换，并用 display 渲染至屏幕
	displayBufferTextures = [];
	for (let i = 0; i < 2; i++) {
		displayBufferTextures.push(gl.createTexture());
	}
	resize()//根据初始化的宽高创建纹理

	// 创建一个纹理，用于存放物体属性
	objAttributesTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, objAttributesTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

var shaders_file = [
    './shaders/render.vert',
    './shaders/render.frag',
    './shaders/pt.vert',
    './shaders/pt.frag',
	'./shaders/utils.glsl',
];

function initializeShader() {

    fetch_urls(shaders_file, function(displayVert, displayFrag, ptVert, ptFrag, utils) {

        //===== pt shader =====
        ptShaderProgram = createProgram(gl, ptVert, utils + ptFrag, message);
        //Vertex Shader
        pt_vertexPos_attributeLocation = gl.getAttribLocation(ptShaderProgram, "vertexPos");
        gl.enableVertexAttribArray(pt_vertexPos_attributeLocation);
        pt_cameraPos_uniformLocation = gl.getUniformLocation(ptShaderProgram, "cameraPos");
        pt_invVP_uniformLocation = gl.getUniformLocation(ptShaderProgram, "invVP");
        //Fragment Shader        
        pt_time_uniformLocation = gl.getUniformLocation(ptShaderProgram, "time");
        pt_iterations_uniformLocation = gl.getUniformLocation(ptShaderProgram, "iterations");
        pt_objNums_uniformLocation = gl.getUniformLocation(ptShaderProgram, "objNums");
        pt_displayBuffer_textureLocation = gl.getUniformLocation(ptShaderProgram, "displayBufferTexture");
        pt_objAttributes_textureLocation = gl.getUniformLocation(ptShaderProgram, "objAttributesTexture");
        pt_displayBufferTextureSize_uniformLocation = gl.getUniformLocation(ptShaderProgram, "displayBufferTextureSize");
        pt_objAttributesTextureSize_uniformLocation = gl.getUniformLocation(ptShaderProgram, "objAttributesTextureSize");
        pt_enableSSAA_uniformLocation = gl.getUniformLocation(ptShaderProgram, "enableSSAA");

		//===== display shader =====
		displayShaderProgram = createProgram(gl, displayVert, displayFrag, message);

		display_vertexPos_attributeLocation = gl.getAttribLocation(displayShaderProgram, 'vertexPos');
		gl.enableVertexAttribArray(display_vertexPos_attributeLocation);
		display_displayBuffer_textureLocation = gl.getUniformLocation(displayShaderProgram, "displayBufferTexture");
    });
}

function render_loop() {

	if (stats)
		stats.update();
	
	message.innerHTML = "Iterations: " + (iterations).toString();

	if (!pause || iterations == 0)
	{

		// render to texture
		gl.useProgram(ptShaderProgram);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		let V = mat4.create();
		mat4.lookAt([eye.x, eye.y, eye.z], [center.x, center.y, center.z], [up.x, up.y, up.z], V);

		let P = mat4.create();
		mat4.perspective(FOVY, canvas.width / canvas.height, 0.1, 100.0, P);

		let VP = mat4.create();
		mat4.multiply(P, V, VP);

		let invVP = mat4.create();
		mat4.inverse(VP, invVP);
		
		gl.uniformMatrix4fv(pt_invVP_uniformLocation, false, invVP);
		gl.uniform3f(pt_cameraPos_uniformLocation, eye.x, eye.y, eye.z);
		gl.uniform1f(pt_time_uniformLocation, time);
		gl.uniform1f(pt_iterations_uniformLocation, iterations);
		gl.uniform1i(pt_objNums_uniformLocation, objData.length);
		gl.uniform1i(pt_enableSSAA_uniformLocation, enableSSAA);
		//Added for texture size
		gl.uniform2f(pt_displayBufferTextureSize_uniformLocation, canvas.width,canvas.height);
		gl.uniform2f(pt_objAttributesTextureSize_uniformLocation, objAttributesWidth, objAttributesHeight);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, displayBufferTextures[0]);
		gl.uniform1i(pt_displayBuffer_textureLocation, 0);


		gl.activeTexture(gl.TEXTURE1);  //attributes for objects
		gl.bindTexture(gl.TEXTURE_2D, objAttributesTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, objAttributesWidth, objAttributesHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, objAttributesTextureData);
		gl.uniform1i(pt_objAttributes_textureLocation, 1);


		gl.bindBuffer(gl.ARRAY_BUFFER, displayVertexPositionBuffer);
		gl.vertexAttribPointer(pt_vertexPos_attributeLocation, 2, gl.FLOAT, false, 0, 0);

		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, displayBufferTextures[1], 0);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		displayBufferTextures.reverse();

		//render to screen
		gl.useProgram(displayShaderProgram);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, displayBufferTextures[0]);
		gl.uniform1i(display_displayBuffer_textureLocation, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, displayVertexPositionBuffer);
		gl.vertexAttribPointer(display_vertexPos_attributeLocation, 2, gl.FLOAT, false, 0, 0);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		iterations++;
		time++;
	
	}

	window.requestAnimFrame(render_loop);
}

function resetIterations() {
	iterations = 0;
	time = 0;
}