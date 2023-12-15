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

var width;
var height;

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
        SSAA = (guiConfig.antiAliasing == true) ? 1 : 0;
		iterations = 0;
    });
}

function GUIConfig() {
    this.width = width;
    this.height = height;
	
	this.antiAliasing = (SSAA == 1) ? true : false;
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
    this.translateX = Datas[id].obj_pos[0];
    this.translateY = Datas[id].obj_pos[1];
    this.translateZ = Datas[id].obj_pos[2];
    this.scaleX = Datas[id].obj_scale[0];
    this.scaleY = Datas[id].obj_scale[1];
    this.scaleZ = Datas[id].obj_scale[2];
    this.rotateX = Datas[id].obj_rotation[0];
    this.rotateY = Datas[id].obj_rotation[1];
    this.rotateZ = Datas[id].obj_rotation[2];
    this.color = [Datas[id].obj_color[0] * 255.0, Datas[id].obj_color[1] * 255.0, Datas[id].obj_color[2] * 255.0];
    this.reflect = (Datas[id].obj_reflective == 1) ? true : false ;
    this.refract = (Datas[id].obj_refractive == 1) ? true : false ;
    this.IOR = Datas[id].obj_indexOfRefraction;
    this.emittance = Datas[id].obj_emittance;
    this.subsurfaceScatter = (Datas[id].obj_subsurfaceScatter == 1) ? true : false ;
};

function GUIAddObj(name, id) {
    var i = guiObjs.length;
    if (Datas.length == 31)
        return;

    guiObjs.push( new GUIObj(id));

    var folder = gui2.addFolder(name);

    folder.add(guiObjs[i], 'translateX').min(-5).max(5).onChange(function () {
        Datas[id].obj_pos[0] = guiObjs[i].translateX;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'translateY').min(-5).max(5).onChange(function () {
        Datas[id].obj_pos[1] = guiObjs[i].translateY;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'translateZ').min(-5).max(5).onChange(function () {
        Datas[id].obj_pos[2] = guiObjs[i].translateZ;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'scaleX').onChange(function () {
        Datas[id].obj_scale[0] = guiObjs[i].scaleX;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'scaleY').onChange(function () {
        Datas[id].obj_scale[1] = guiObjs[i].scaleY;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'scaleZ').onChange(function () {
        Datas[id].obj_scale[2] = guiObjs[i].scaleZ;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'rotateX').onChange(function () {
        Datas[id].obj_rotation[0] = guiObjs[i].rotateX;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'rotateY').onChange(function () {
        Datas[id].obj_rotation[1] = guiObjs[i].rotateY;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'rotateZ').onChange(function () {
        Datas[id].obj_rotation[2] = guiObjs[i].rotateZ;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.addColor(guiObjs[i], 'color').onChange(function () {
        Datas[id].obj_color = [guiObjs[i].color[0] / 255.0, guiObjs[i].color[1] / 255.0, guiObjs[i].color[2] / 255.0];
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'reflect').onChange(function () {
        Datas[id].obj_reflective = guiObjs[i].reflect;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'refract').onChange(function () {
        Datas[id].obj_refractive = guiObjs[i].refract;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'IOR').min(1).onChange(function () {
        Datas[id].obj_indexOfRefraction = guiObjs[i].IOR;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'emittance').onChange(function () {
        Datas[id].obj_emittance = guiObjs[i].emittance;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'subsurfaceScatter').onChange(function () {
        Datas[id].obj_subsurfaceScatter = guiObjs[i].subsurfaceScatter;
        AddObjsAttr(id);
        iterations = 0;
    });
}