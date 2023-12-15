///////////////////////////////////////////////////////////////////////////
var gl;

//pt shader
var shaderProgram;

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

//render shader
var renderProgram;
var renderVertexAttribute;
var vertexPositionBuffer;
var frameBuffer;
var u_textureLocationc;

var time = 0;

function initGL(){
	message = document.getElementById("message");
	canvas = document.getElementById("canvas");
	gl = createWebGLContext(canvas, message);
	
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
		return;
	}
	gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
}

function initBuffers() {
	vertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
	var vertices = [
	 1.0, 1.0,
	-1.0, 1.0,
	 1.0, -1.0,
	-1.0, -1.0,
	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	gl.vertexAttribPointer(VertexLocation, 2, gl.FLOAT, false, 0, 0);


	frameBuffer = gl.createFramebuffer();
	var type = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;

	textures = [];
	for (var i = 0; i < 2; i++) {
		textures.push(gl.createTexture());
		gl.bindTexture(gl.TEXTURE_2D, textures[i]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, canvas.width, canvas.height, 0, gl.RGB, type, null);
	}
	gl.bindTexture(gl.TEXTURE_2D, null);

	objattrtex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, objattrtex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

var shaders_file = [
    './shaders/render.vert',
    './shaders/render.frag',
    './shaders/pt.vert',
    './shaders/pt.frag',
];

function initializeShader() {

    fetch_urls(shaders_file, function(renderVs, renderFs, vs, fs) {
        // render shader
        renderProgram = createProgram(gl, renderVs, renderFs, message);
        
        renderVertexAttribute = gl.getAttribLocation(renderProgram, 'aVertex');
        gl.enableVertexAttribArray(renderVertexAttribute);
        
        u_textureLocationc = gl.getUniformLocation(renderProgram, "texture");
        
        // path tracing shader
        shaderProgram = createProgram(gl, vs, fs, message);
        //Vertex Shader
        VertexLocation = gl.getAttribLocation(shaderProgram, "aVertex");
        gl.enableVertexAttribArray(VertexLocation);
    
        u_veyeLocation = gl.getUniformLocation(shaderProgram, "vcameraPos");
        u_vInvMPLocation = gl.getUniformLocation(shaderProgram, "u_vInvMP");
    
        //Fragment Shader        
        u_timeLocation = gl.getUniformLocation(shaderProgram, "time");
        u_itrLocation = gl.getUniformLocation(shaderProgram, "u_iterations");
        //Don't k why this line doesn't work
        u_numsLocation = gl.getUniformLocation(shaderProgram, "objnums");
        u_eyeLocation = gl.getUniformLocation(shaderProgram, "cameraPos");
    
    
        u_textureLocation = gl.getUniformLocation(shaderProgram, "texture");
        u_attrtextureLocation = gl.getUniformLocation(shaderProgram, "attrtexture");
        u_texsizeLocation = gl.getUniformLocation(shaderProgram, "texsize");
        u_attrtexsizeLocation = gl.getUniformLocation(shaderProgram, "attrtexsize");
        u_SSAALocation = gl.getUniformLocation(shaderProgram, "SSAA");
    });
}

function render_loop() {

	if (stats)
		stats.update();
	
	message.innerHTML = "Iterations: " + (iterations).toString();

	if (!pause || iterations == 0)
	{
		///////////////////////////////////////////////////////////////////////////
		// Render
		gl.useProgram(shaderProgram);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		var modelview = mat4.create();
		mat4.lookAt([eye.x, eye.y, eye.z], [center.x, center.y, center.z], [up.x, up.y, up.z], modelview);

		var projection = mat4.create();
		mat4.perspective(FOVY, canvas.width / canvas.height, 0.1, 100.0, projection);

		var modelviewprojection = mat4.create();
		mat4.multiply(projection, modelview, modelviewprojection);

		var inversemp = mat4.create();
		mat4.inverse(modelviewprojection, inversemp);
		
		gl.uniformMatrix4fv(u_vInvMPLocation, false, inversemp);
		gl.uniform3f(u_veyeLocation, eye.x, eye.y, eye.z);
		gl.uniform3f(u_eyeLocation, eye.x, eye.y, eye.z);
		gl.uniform1f(u_timeLocation, time);
		gl.uniform1f(u_itrLocation, iterations);
		gl.uniform1i(u_numsLocation, Datas.length);
		gl.uniform1i(u_SSAALocation, SSAA);
		//Added for texture size
		gl.uniform2f(u_texsizeLocation, canvas.width,canvas.height);
		gl.uniform2f(u_attrtexsizeLocation, attw, atth);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textures[0]);
		gl.uniform1i(u_textureLocation, 0);


		gl.activeTexture(gl.TEXTURE1);  //attributes for objects
		gl.bindTexture(gl.TEXTURE_2D, objattrtex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, attw, atth, 0, gl.RGBA, gl.UNSIGNED_BYTE, attributes);
		gl.uniform1i(u_attrtextureLocation, 1);


		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[1], 0);
		gl.vertexAttribPointer(VertexLocation, 2, gl.FLOAT, false, 0, 0);
		

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		textures.reverse();

		gl.useProgram(renderProgram);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textures[0]);
		gl.uniform1i(u_textureLocationc, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		gl.vertexAttribPointer(renderVertexAttribute, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		iterations++;
		time += 1.0;
	
	}

	window.requestAnimFrame(render_loop);
}

function resize() {
	canvas.width = width;
	canvas.height = height;
	
	gl.viewport(0, 0, canvas.width, canvas.height);
	
	var type = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textures[0]);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, canvas.width, canvas.height, 0, gl.RGB, type, null);
	
	gl.bindTexture(gl.TEXTURE_2D, textures[1]);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, canvas.width, canvas.height, 0, gl.RGB, type, null);
	
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	iterations = 0;
}