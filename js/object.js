///////////////////////////////////////////////////////////////////////////


function AddObjsAttr(i) {
    // gl.useProgram(shaderProgram);
    //color:No need for map
    attributes[28 * i + 0] = 255.0 * Datas[i].obj_color[0]; attributes[28 * i + 1] = 255.0 * Datas[i].obj_color[1]; attributes[28 * i + 2] = 255.0 * Datas[i].obj_color[2]; attributes[28 * i + 3] = 255.0;
    //objtype:[0.0,5.0] to [0,255]  texturetype:[0.0,5.0] to [0,255] 
    attributes[28 * i + 4] = 255.0 * Datas[i].obj_type / 5.0; attributes[28 * i + 5] = 255.0 * Datas[i].obj_textureType / 5.0; attributes[28 * i + 6] = 255.0; attributes[28 * i + 7] = 255.0;
    //mat1:No need for map
    attributes[28 * i + 8] = 255.0 * Datas[i].obj_reflective; attributes[28 * i + 9] = 255.0 * Datas[i].obj_refractive; attributes[28 * i + 10] = 255.0 * Datas[i].obj_reflectivity; attributes[28 * i + 11] = 255.0;
    //mat2:IOR[0,3] to [0,255]  emittance [0,25] to [0,255]
    attributes[28 * i + 12] = 255.0/3.0 * Datas[i].obj_indexOfRefraction; attributes[28 * i + 13] = 255.0 * Datas[i].obj_subsurfaceScatter; attributes[28 * i + 14] = 255.0 * Datas[i].obj_emittance/25.0; attributes[28 * i + 15] = 255.0;
    //pos:[-10.0,10.0] to [0,255]
    var mind = -10.0;
    var maxd = 10.0;
    attributes[28 * i + 16] = 255.0 * (Datas[i].obj_pos[0] - mind) / (maxd - mind); attributes[28 * i + 17] = 255.0 * (Datas[i].obj_pos[1] - mind) / (maxd - mind);
    attributes[28 * i + 18] = 255.0 * (Datas[i].obj_pos[2] - mind) / (maxd - mind); attributes[28 * i + 19] = 255.0;
    //rot:[0.0,360.0] to [0,255]
    attributes[28 * i + 20] = 255.0 * Datas[i].obj_rotation[0] / 360.0; attributes[28 * i + 21] = 255.0 * Datas[i].obj_rotation[1] / 360.0; attributes[28 * i + 22] = 255.0 * Datas[i].obj_rotation[2]/360.0; attributes[28 * i + 23] = 255.0;
    //scale:[0.0,10.0] to [0,255]
    attributes[28 * i + 24] = 255.0 * Datas[i].obj_scale[0] / 10.0; attributes[28 * i + 25] = 255.0 * Datas[i].obj_scale[1] / 10.0; attributes[28 * i + 26] = 255.0 * Datas[i].obj_scale[2] / 10.0; attributes[28 * i + 27] = 255.0;

}

var cubeNum = 0;
function addCube() {
    if (Datas.length == 31)
        return;
	Datas.push({
		obj_pos: [Math.random()*10-5, Math.random()*10-5, Math.random()*10-5],
		obj_scale: [1.0, 1.0, 1.0],
		obj_rotation: [Math.random()*360, Math.random()*360, Math.random()*360],
		obj_color: [Math.random(), Math.random(), Math.random()],
		obj_type: 2,
		obj_textureType: 0,
		obj_reflective: 0,
		obj_refractive: 0,
		obj_reflectivity: 1.0,
		obj_indexOfRefraction: 1.0,
		obj_emittance: 0,
		obj_subsurfaceScatter: 0
	});

    AddObjsAttr(Datas.length - 1);

    GUIAddObj("Cube " + ++cubeNum, Datas.length - 1);
		
	iterations = 0;
}

var sphereNum = 3;

function addSphere() {
    if (Datas.length == 31)
        return;
	Datas.push({
		obj_pos: [Math.random()*10-5, Math.random()*10-5, Math.random()*10-5],
		obj_scale: [1.0, 1.0, 1.0],
		obj_rotation: [Math.random()*360, Math.random()*360, Math.random()*360],
		obj_color: [Math.random(), Math.random(), Math.random()],
		obj_type: 0,
		obj_textureType: 0,
		obj_reflective: 0,
		obj_refractive: 0,
		obj_reflectivity: 1.0,
		obj_indexOfRefraction: 1.0,
		obj_emittance: 0,
		obj_subsurfaceScatter: 0
	});

    AddObjsAttr(Datas.length - 1);

    GUIAddObj("Sphere " + ++sphereNum, Datas.length - 1);	

	iterations = 0;
}

var DefaultDatas = [];
var defaultSize = 6;

function initDfaultScene() {
     
    //Light For Subsurface Scattering,only one light and always at first
    DefaultDatas.push({
        obj_pos: [0.0, 4.95, 0.0],
        obj_scale: [3.8, 0.1, 3.8],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [1.0, 1.0, 1.0],
        obj_type: 2,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 25,
        obj_subsurfaceScatter: 0
    });

    //Walls
    var WallScale = 10.0;
    var WallTrans = 5.0;

    DefaultDatas.push({
        obj_pos: [0.0, 0.0, -WallTrans+0.1],
        obj_scale: [WallScale, 1.0, WallScale],
        obj_rotation: [91.0, 0.0, 0.0],
        obj_color: [1.0, 1.0, 1.0],
        obj_type: 1,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    DefaultDatas.push({
        obj_pos: [-WallTrans+0.1, 0.0, 0.0],
        obj_scale: [ WallScale,1.0, WallScale],
        obj_rotation: [0.0, 0.0, 271.0],
        obj_color: [0.75, 0.25, 0.25],
        obj_type: 1,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    DefaultDatas.push({
        obj_pos: [WallTrans-0.1, 0.0, 0.0],
        obj_scale: [WallScale,1.0, WallScale],
        obj_rotation: [0.0, 0.0, 91.0],
        obj_color: [0.25, 0.25, 0.75],
        obj_type: 1,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });
    	
    DefaultDatas.push({
        obj_pos: [0.0, WallTrans, 0.0],
        obj_scale: [WallScale, 1.0, WallScale],
        obj_rotation: [180.0, 0.0, 0.0],
        obj_color: [0.75, 0.75, 0.75],
        obj_type: 1,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });
    	
    DefaultDatas.push({
        obj_pos: [0.0, -WallTrans, 0.0],
        obj_scale: [WallScale, 1.0, WallScale],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [0.75, 0.75, 0.75],
        obj_type: 1,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });


    //Sphere1
    DefaultDatas.push({
        obj_pos: [-2.0, 0.0, 0.0],
        obj_scale: [1.8, 1.8, 1.8],
        obj_rotation: [30.0, 4.0, 0.0],
        obj_color: [1.0, 0.0, 0.0],
        obj_type: 0,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    //Sphere2
    DefaultDatas.push({
        obj_pos: [0.0, 0.0, 0.0],
        obj_scale: [1.8, 1.8, 1.8],
        obj_rotation: [30.0, 4.0, 0.0],
        obj_color: [0.95, 0.5, 0.4],
        obj_type: 0,
        obj_textureType: 0,
        obj_reflective: 1,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 1
    });


    //Sphere3
    DefaultDatas.push({
        obj_pos: [2.0, 0.0, 0.0],
        obj_scale: [1.8, 1.8, 1.8],
        obj_rotation: [30.0, 4.0, 0.0],
        obj_color: [1.0, 1.0, 1.0],
        obj_type: 0,
        obj_textureType: 0,
        obj_reflective: 1,
        obj_refractive: 1,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 3.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 1
    });

	//Box
	 DefaultDatas.push({
		 obj_pos: [0.0, -1.5, 0.0],
		 obj_scale: [6.8, 0.2, 4.8],
		 obj_rotation: [0.0, 0.0, 0.0],
		 obj_color: [0.8, 0.8, 0.8],
		 obj_type: 2,
		 obj_textureType: 0,
		 obj_reflective: 0,
		 obj_refractive: 0,
		 obj_reflectivity: 1.0,
		 obj_indexOfRefraction: 1.0,
		 obj_emittance: 0,
		 obj_subsurfaceScatter: 0
     });

    //Legs
    var legpos1 = 3.0, legpos2 = 1.8;
    DefaultDatas.push({
        obj_pos: [legpos1, -3.5, legpos2],
        obj_scale: [0.3, 4.0, 0.3],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [0.9, 0.4, 0.0],
        obj_type: 2,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    DefaultDatas.push({
        obj_pos: [-legpos1, -3.5, legpos2],
        obj_scale: [0.3, 4.0, 0.3],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [0.9, 0.4, 0.0],
        obj_type: 2,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    DefaultDatas.push({
        obj_pos: [legpos1, -3.5, -legpos2],
        obj_scale: [0.3, 4.0, 0.3],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [0.9, 0.4, 0.0],
        obj_type: 2,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    DefaultDatas.push({
        obj_pos: [-legpos1, -3.5, -legpos2],
        obj_scale: [0.3, 4.0, 0.3],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [0.9, 0.4, 0.0],
        obj_type: 2,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });
    defaultScene();
}

function defaultScene() {
	Datas.length = 0;
	
	for (var i = 0; i < DefaultDatas.length; i++) {
			Datas[i] = DefaultDatas[i];
			AddObjsAttr(i);
	}
	
	iterations = 0;


	var node = document.getElementById("gui2");
	if (node != null)
		node.parentNode.removeChild(node);
	
	GUIDefaultScene();
}