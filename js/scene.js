import {AABB, BVHs} from "./bvhs.js";
import {mat4, vec3, vec4} from "gl-matrix";
import {MeshModels} from "./meshes.js";

import GUI from 'lil-gui';

export class Material {
    static size = 12;
    static sectionsPerMaterial = 3; // 3 sections per material
    constructor(name = 'new material',
                color= [0.9, 0.9, 0.9],
                reflective = false,
                reflectivity = 1.0,
                refractive = false,
                indexOfRefraction = 1.0,
                emittance = 100.0,
                subsurfaceScatter = false) {
        this.id = undefined;
        this.name = name;
        this.color = color;
        this.reflective = reflective;
        this.reflectivity = reflectivity;
        this.refractive = refractive;
        this.indexOfRefraction = indexOfRefraction;
        this.emittance = emittance;
        this.subsurfaceScatter = subsurfaceScatter;

        this.gui = undefined;
    }

    formatAttributesTexture(){
        let array = new Float32Array(Material.size);

        array[0] = this.color[0];
        array[1] = this.color[1];
        array[2] = this.color[2];
        array[3] = 0.0;

        array[4] = this.reflective ? 1.0 : 0;
        array[5] = this.reflectivity;
        array[6] = this.refractive ? 1.0 : 0;
        array[7] = this.indexOfRefraction;

        array[8] = this.emittance;
        array[9] = this.subsurfaceScatter ? 1.0 : 0;
        array[10] = 0.0;
        array[11] = 0.0;

        return array;
    }
}

export class Obj {
    static size = 12;
    static sectionsPerObj = 3; // 3 sections per obj
    constructor(name = 'new object',
                objType = 'sphere',
                pos = [0, 0, 0],
                scale = [1, 1, 1],
                rotation = [0, 0, 0],
                materialID = 0,
                meshID = 0,
                meshAABB = null) {
        this.id = undefined;

        this.name = name;
        if (objType === 'sphere' || objType === 'cube' || objType === 'plane' || objType === 'mesh') {
            this.objType = objType;
        } else {
            console.log("Error: Invalid object type");
        }
        this.pos = pos;
        this.scale = scale;
        this.rotation = rotation;
        this.materialID = materialID;
        this.meshID = meshID;
        this.meshAABB = meshAABB;

        this.gui = undefined;
    }

    getObjTypeID(){
        if (this.objType === 'sphere') {
            return 0.0;
        } else if (this.objType === 'plane') {
            return 1.0;
        } else if (this.objType === 'cube') {
            return 2.0;
        } else if (this.objType === 'mesh') {
            return 3.0;
        } else {
            throw Error("Invalid object type");
        }
    }

    formatAttributesTexture(){
        let array = new Float32Array(Obj.size);

        array[0] = this.pos[0];
        array[1] = this.pos[1];
        array[2] = this.pos[2];
        array[3] = this.getObjTypeID();

        array[4] = this.scale[0];
        array[5] = this.scale[1];
        array[6] = this.scale[2];
        array[7] = this.materialID;

        array[8] = this.rotation[0];
        array[9] = this.rotation[1];
        array[10] = this.rotation[2];
        array[11] = this.meshID;

        return array;
    }

    get8VertexesFromMinMax(min, max){
        let vertexes = [];
        vertexes.push(vec4.fromValues(min[0], min[1], min[2], 1.0));
        vertexes.push(vec4.fromValues(max[0], min[1], min[2], 1.0));
        vertexes.push(vec4.fromValues(min[0], max[1], min[2], 1.0));
        vertexes.push(vec4.fromValues(max[0], max[1], min[2], 1.0));
        vertexes.push(vec4.fromValues(min[0], min[1], max[2], 1.0));
        vertexes.push(vec4.fromValues(max[0], min[1], max[2], 1.0));
        vertexes.push(vec4.fromValues(min[0], max[1], max[2], 1.0));
        vertexes.push(vec4.fromValues(max[0], max[1], max[2], 1.0));
        return vertexes;
    }

    getAABB(){
        let vertexes = [];
        if (this.objType === 'sphere') {
            vertexes = this.get8VertexesFromMinMax(
                vec3.fromValues(-0.51, -0.51, -0.51),
                vec3.fromValues(0.51, 0.51, 0.51)
            );
        } else if (this.objType === 'plane') {
            vertexes = this.get8VertexesFromMinMax(
                vec3.fromValues(-0.51, -0.01, -0.51),
                vec3.fromValues(0.51, 0.01, 0.51)
            );
        } else if (this.objType === 'cube') {
            vertexes = this.get8VertexesFromMinMax(
                vec3.fromValues(-0.51, -0.51, -0.51),
                vec3.fromValues(0.51, 0.51, 0.51)
            );
        } else if (this.objType === 'mesh') {
            vertexes = this.get8VertexesFromMinMax(
                this.meshAABB.min,
                this.meshAABB.max
            );
        } else {
            throw Error("Invalid object type");
        }

        let modelMat = mat4.create();
        mat4.identity(modelMat);
        mat4.translate(modelMat, modelMat, vec3.fromValues(this.pos[0], this.pos[1], this.pos[2]));
        mat4.rotateX(modelMat, modelMat, Math.PI * this.rotation[0] / 180.0);
        mat4.rotateY(modelMat, modelMat, Math.PI * this.rotation[1] / 180.0);
        mat4.rotateZ(modelMat, modelMat, Math.PI * this.rotation[2] / 180.0);
        mat4.scale(modelMat, modelMat, vec3.fromValues(this.scale[0], this.scale[1], this.scale[2]));

        let min = vec3.fromValues(Infinity, Infinity, Infinity);
        let max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
        for (let i = 0; i < vertexes.length; i++){
            let vertex = vec4.create();
            vec4.transformMat4(vertex, vertexes[i], modelMat);
            for (let j = 0; j < 3; j++){
                min[j] = Math.min(min[j], vertex[j]);
                max[j] = Math.max(max[j], vertex[j]);
            }
        }

        return new AABB(min, max);
    }
}

export class Scene {
    static materialAttributesWidth = 512;
    static materialAttributesHeight = 512;
    static objAttributesWidth = 512;
    static objAttributesHeight = 512;

    // static objSectionsPerObj = 3; // 3 sections per obj
    // static materialSectionsPerMaterial = 3; // 3 sections per material
    constructor(onChangeCallbacks = [], parsedMeshes) {
        this.onChangeCallbacks = onChangeCallbacks;

        // ==== BVHs ====
        this.bvhsManager = new BVHs();
        this.rootBVH = undefined;

        // ===== Meshes =====
        this.meshModelsManager = new MeshModels();
        this.addMeshes(parsedMeshes);

        let container = document.getElementById('flex-container');

        // ===== Materials =====
        this.materialsGUI = new GUI({title: 'Materials', container: container});
        this.materialsGUI.add(this, 'addDefaultMaterial').name('Add Material');
        this.materialsGUI.domElement.style.maxHeight = '90%';
        this.materials = [];
        this.materialAttributesTextureData = new Float32Array(Scene.materialAttributesWidth * Scene.materialAttributesHeight * 4);
        // each material occupy 3 pixels (3x4 floats) in texture
        // we call a pixel as a materialSection
        // materialID = [ materialSectionID / materialSectionsPerMaterial ]

        // ===== Objs =====
        this.objsGUI = new GUI({title: 'Objects', container: container});
        this.objsGUI.add(this, 'addDefaultObj').name('Add Object');
        this.objsGUI.domElement.style.maxHeight = '90%';
        this.objs = [];
        this.objAttributesTextureData = new Float32Array(Scene.objAttributesWidth * Scene.objAttributesHeight * 4);
        // each obj occupy 3 pixels (3x4 floats) in texture
        // we call a pixel as a objectSection
        // objID = [ objSectionID / objSectionsPerObj ]
    }

    onChange(flushRootBVH = false){
        for(let i = 0; i < this.onChangeCallbacks.length; i++){
            this.onChangeCallbacks[i]();
        }
        if(flushRootBVH){
            this.flushRootBVH();
        }
    }

    addMaterial(material) {
        material.id = this.materials.length;
        this.materials.push(material);
        this.updateMaterialToAttributesTexture(material);


        material.gui = this.materialsGUI.addFolder(`ID:${material.id} - ` + material.name);

        material.gui.add(material, 'name').onChange(function () {
            material.gui.title(`ID:${material.id} - ` + material.name);
        });

        material.gui.addColor(material, 'color').onChange(function () {
            this.updateMaterialToAttributesTexture(material);
            this.onChange();
        }.bind(this));

        material.gui.add(material, 'reflective').onChange(function () {
            this.updateMaterialToAttributesTexture(material);
            this.onChange();
        }.bind(this));

        material.gui.add(material, 'reflectivity').min(0.0).max(1.0).onChange(function () {
            this.updateMaterialToAttributesTexture(material);
            this.onChange();
        }.bind(this));

        material.gui.add(material, 'refractive').onChange(function () {
            this.updateMaterialToAttributesTexture(material);
            this.onChange();
        }.bind(this));

        material.gui.add(material, 'indexOfRefraction').min(1.0).max(3.0).onChange(function () {
            this.updateMaterialToAttributesTexture(material);
            this.onChange();
        }.bind(this));

        material.gui.add(material, 'emittance').min(0.0).max(100.0).onChange(function () {
            this.updateMaterialToAttributesTexture(material);
            this.onChange();
        }.bind(this));
    }

    addDefaultMaterial(){
        this.addMaterial(new Material());
        this.onChange();
    }

    updateMaterialToAttributesTexture(material) {
        let array = material.formatAttributesTexture();
        for(let i = 0; i < Material.size; i++) {
            this.materialAttributesTextureData[Material.size * material.id + i] = array[i];
        }
    }

    addObj(obj) {
        obj.id = this.objs.length;
        this.objs.push(obj);
        this.updateObjToAttributesTexture(obj, this.objs.length - 1);

        obj.gui = this.objsGUI.addFolder(obj.name);

        obj.gui.add(obj, 'name').onChange(function () {
            obj.gui.title(obj.name);
        });

        obj.gui.add(obj, 'objType', ['sphere', 'plane', 'cube', 'mesh']).onChange(function (value) {
            if(value === 'mesh'){
                obj.meshAABB = this.meshModelsManager.getMeshAABB(obj.meshID);
            }
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj.pos, '0', -15, 15).name('pos - x').onChange(function () {
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj.pos, '1', -15, 15).name('pos - y').onChange(function () {
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj.pos, '2', -15, 15).name('pos - z').onChange(function () {
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj.scale, '0', 0.1, 20).name('scale - x').onChange(function () {
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj.scale, '1', 0.1, 20).name('scale - y').onChange(function () {
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj.scale, '2', 0.1, 20).name('scale - z').onChange(function () {
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj.rotation, '0', -180, 180).name('rotation - x').onChange(function () {
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj.rotation, '1', -180, 180).name('rotation - y').onChange(function () {
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj.rotation, '2', -180, 180).name('rotation - z').onChange(function () {
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj, 'materialID').name('materialID').onFinishChange(function () {
            if(obj.materialID < 0|| obj.materialID >= this.materials.length){
                obj.materialID = 0;
                obj.gui.controllers[11].updateDisplay();
            }
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add(obj, 'meshID').name('meshID').onFinishChange(function () {
            if(obj.meshID < 0|| obj.meshID >= this.meshModelsManager.meshes.length){
                obj.meshID = 0;
                obj.gui.controllers[12].updateDisplay();
            }
            obj.meshAABB = this.meshModelsManager.getMeshAABB(obj.meshID)
            this.updateObjToAttributesTexture(obj);
            this.onChange(true);
        }.bind(this));

        obj.gui.add({del(){}},'del').name('Delete').onChange(function () {
            obj.gui.destroy();
            this.deleteObj(obj.id);
            this.onChange(true);
            //update all objs gui controller
            for(let i = 0; i < this.objs.length; i++){
                this.objs[i].gui.title(`ID:${this.objs[i].id} - ` + this.objs[i].name);
            }
        }.bind(this));
    }

    addDefaultObj(){
        this.addObj(new Obj());
        this.onChange(true);
    }

    updateObjToAttributesTexture(obj) {
        let array = obj.formatAttributesTexture();
        for(let i = 0; i < Obj.size; i++) {
            this.objAttributesTextureData[Obj.size * obj.id + i] = array[i];
        }
    }

    deleteObj(id) {
        this.objs.splice(id, 1);
        for(let i = id; i < this.objs.length; i++){
            this.objs[i].id = i;
            this.updateObjToAttributesTexture(this.objs[i], i);
        }
    }

    addMeshes(parsedMeshes){
        this.meshModelsManager.addMeshes(parsedMeshes, this.bvhsManager);
    }

    flushRootBVH(){
        if(this.rootBVH === undefined){
            this.rootBVH = this.bvhsManager.createBVH(this.objs);
        }else{
            this.bvhsManager.createBVH(this.objs, this.rootBVH);
        }
    }
}