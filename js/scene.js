import {AABB, BVHs} from "./bvhs.js";
import {mat4, vec3, vec4} from "gl-matrix";
import {MeshModels} from "./meshes.js";

export class Material {
    static size = 12;
    static sectionsPerMaterial = 3; // 3 sections per material
    constructor(id,
                name = 'new material',
                color= [0.9, 0.9, 0.9],
                reflective = false,
                reflectivity = 1.0,
                refractive = false,
                indexOfRefraction = 1.0,
                emittance = 100.0,
                subsurfaceScatter = false) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.reflective = reflective;
        this.reflectivity = reflectivity;
        this.refractive = refractive;
        this.indexOfRefraction = indexOfRefraction;
        this.emittance = emittance;
        this.subsurfaceScatter = subsurfaceScatter;
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
    constructor(id,
                name = 'new object',
                objType = 'sphere',
                pos = [0, 0, 0],
                scale = [1, 1, 1],
                rotation = [0, 0, 0],
                materialID = 0,
                meshID = 0,
                meshAABB = null) {
        this.id = id;
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
    constructor() {
        this.materials = [];
        this.materialAttributesTextureData = new Float32Array(Scene.materialAttributesWidth * Scene.materialAttributesHeight * 4);
        // each material occupy 3 pixels (3x4 floats) in texture
        // we call a pixel as a materialSection
        // materialID = [ materialSectionID / materialSectionsPerMaterial ]

        this.objs = [];
        this.objAttributesTextureData = new Float32Array(Scene.objAttributesWidth * Scene.objAttributesHeight * 4);
        // each obj occupy 3 pixels (3x4 floats) in texture
        // we call a pixel as a objectSection
        // objID = [ objSectionID / objSectionsPerObj ]

        this.bvhsManager = new BVHs();
        this.rootBVH = this.bvhsManager.newBVH(this.objs);

        this.meshModelsManager = new MeshModels();
    }


    addMaterial(material) {
        this.materials.push(material);
        this.updateMaterialToAttributesTexture(material, this.materials.length - 1);
    }

    updateMaterialToAttributesTexture(material, id) {
        let array = material.formatAttributesTexture();
        for(let i = 0; i < Material.size; i++) {
            this.materialAttributesTextureData[Material.size * id + i] = array[i];
        }
    }

    addObj(obj) {
        this.objs.push(obj);
        this.updateObjToAttributesTexture(obj, this.objs.length - 1);
    }

    updateObjToAttributesTexture(obj, id) {
        let array = obj.formatAttributesTexture();
        for(let i = 0; i < Obj.size; i++) {
            this.objAttributesTextureData[Obj.size * id + i] = array[i];
        }
    }

    addMeshes(parsedMeshes){
        this.meshModelsManager.addMeshes(parsedMeshes, this.bvhsManager);
    }

    flushRootBVH(){
        this.rootBVH = this.bvhsManager.newBVH(this.objs);
    }
}