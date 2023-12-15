/////////////////////////////////////////////////////////////////////////
/*******************************GUI*************************************/

var toHide = true;
function toggleContorller(){
	if (toHide)
	{
		document.getElementById("icon").style.background = 'url("left-arrow.png")';
		document.getElementById("gui-left").style.display = "none";
		document.getElementById("gui-right").style.display = "none";
	}
	else 
	{
		document.getElementById("icon").style.background = 'url("right-arrow.png")';
		document.getElementById("gui-left").style.display = "block";
		document.getElementById("gui-right").style.display = "block";
	}
	toHide = !toHide;
}

//gui
var gui1;
var guiConfig;

var gui2;
var guiObjs = [];

var width=512;
var height=512;

function initGUI() {
	width = canvas.width;
	height = canvas.height;

    //gui  
    gui1 = new dat.GUI({ autoPlace: false });
    var container = document.getElementById('gui-right');
    container.appendChild(gui1.domElement);

    guiConfig = new GUIConfig();

    gui1.add(guiConfig, 'width').onChange(function () {
        width = guiConfig.width;
    });
    gui1.add(guiConfig, 'height').onChange(function () {
        height = guiConfig.height;
    });
	
	gui1.add(guiConfig, 'antiAliasing').onChange(function () {
        enableSSAA = (guiConfig.antiAliasing == true) ? 1 : 0;
		resetIterations();
    });
}

function GUIConfig() {
    this.width = width;
    this.height = height;
	
	this.antiAliasing = (enableSSAA == 1) ? true : false;
}

function GUIDefaultScene(){
	gui2 = new dat.GUI({ autoPlace: false });
	gui2.domElement.id = 'gui2';
    var container = document.getElementById('gui-left');
    container.appendChild(gui2.domElement);

    GUIAddObj("Light", 0);
    GUIAddObj("Sphere 1", defaultSize);
    GUIAddObj("Sphere 2", defaultSize+1);
    GUIAddObj("Sphere 3", defaultSize+2);
}

function GUIObj(id) {
    this.translateX = objData[id].obj_pos[0];
    this.translateY = objData[id].obj_pos[1];
    this.translateZ = objData[id].obj_pos[2];
    this.scaleX = objData[id].obj_scale[0];
    this.scaleY = objData[id].obj_scale[1];
    this.scaleZ = objData[id].obj_scale[2];
    this.rotateX = objData[id].obj_rotation[0];
    this.rotateY = objData[id].obj_rotation[1];
    this.rotateZ = objData[id].obj_rotation[2];
    this.color = [objData[id].obj_color[0] * 255.0, objData[id].obj_color[1] * 255.0, objData[id].obj_color[2] * 255.0];
    this.reflect = (objData[id].obj_reflective == 1) ? true : false ;
    this.refract = (objData[id].obj_refractive == 1) ? true : false ;
    this.IOR = objData[id].obj_indexOfRefraction;
    this.emittance = objData[id].obj_emittance;
    this.subsurfaceScatter = (objData[id].obj_subsurfaceScatter == 1) ? true : false ;
};

function GUIAddObj(name, id) {
    var i = guiObjs.length;
    if (objData.length == 31)
        return;

    guiObjs.push( new GUIObj(id));

    var folder = gui2.addFolder(name);

    folder.add(guiObjs[i], 'translateX').min(-5).max(5).onChange(function () {
        objData[id].obj_pos[0] = guiObjs[i].translateX;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'translateY').min(-5).max(5).onChange(function () {
        objData[id].obj_pos[1] = guiObjs[i].translateY;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'translateZ').min(-5).max(5).onChange(function () {
        objData[id].obj_pos[2] = guiObjs[i].translateZ;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'scaleX').onChange(function () {
        objData[id].obj_scale[0] = guiObjs[i].scaleX;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'scaleY').onChange(function () {
        objData[id].obj_scale[1] = guiObjs[i].scaleY;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'scaleZ').onChange(function () {
        objData[id].obj_scale[2] = guiObjs[i].scaleZ;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'rotateX').onChange(function () {
        objData[id].obj_rotation[0] = guiObjs[i].rotateX;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'rotateY').onChange(function () {
        objData[id].obj_rotation[1] = guiObjs[i].rotateY;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'rotateZ').onChange(function () {
        objData[id].obj_rotation[2] = guiObjs[i].rotateZ;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.addColor(guiObjs[i], 'color').onChange(function () {
        objData[id].obj_color = [guiObjs[i].color[0] / 255.0, guiObjs[i].color[1] / 255.0, guiObjs[i].color[2] / 255.0];
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'reflect').onChange(function () {
        objData[id].obj_reflective = guiObjs[i].reflect;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'refract').onChange(function () {
        objData[id].obj_refractive = guiObjs[i].refract;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'IOR').min(0.01).onChange(function () {
        objData[id].obj_indexOfRefraction = guiObjs[i].IOR;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'emittance').onChange(function () {
        objData[id].obj_emittance = guiObjs[i].emittance;
        AddObjsAttr(id);
        resetIterations();
    });
    folder.add(guiObjs[i], 'subsurfaceScatter').onChange(function () {
        objData[id].obj_subsurfaceScatter = guiObjs[i].subsurfaceScatter;
        AddObjsAttr(id);
        resetIterations();
    });
}