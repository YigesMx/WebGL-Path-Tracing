import {AABB} from "./bvhs.js";
import {vec3} from "gl-matrix";

import GUI from 'lil-gui';

export class Triangle {
    static size = 18;
    static sectionPerTriangle = 6;
    constructor(vs, vns) {
        this.vs = vs;
        this.vns = vns;
    }

    formatAttributesTexture() {
        let array = new Float32Array(Triangle.size);

        for(let i = 0; i < 3; i++) {
            array[i * 3] = this.vs[i][0];
            array[i * 3 + 1] = this.vs[i][1];
            array[i * 3 + 2] = this.vs[i][2];
        }

        for(let i = 0; i < 3; i++) {
            array[i * 3 + 9] = this.vns[i][0];
            array[i * 3 + 1 + 9] = this.vns[i][1];
            array[i * 3 + 2 + 9] = this.vns[i][2];
        }

        return array;
    }

    getAABB(){
        let min = vec3.fromValues(Infinity, Infinity, Infinity);
        let max = vec3.fromValues(-Infinity, -Infinity, -Infinity);

        for(let i = 0; i < 3; i++) {
            for(let j = 0; j < 3; j++){
                min[j] = Math.min(min[j], this.vs[i][j]);
                max[j] = Math.max(max[j], this.vs[i][j]);
            }
        }
        // return new AABB(min, max);
        return new AABB(
            vec3.fromValues(min[0]-0.01,min[1]-0.01,min[2]-0.01),
            vec3.fromValues(max[0]+0.01,max[1]+0.01,max[2]+0.01)
        );
    }
}

export class TriangleArray {
    constructor(parsedMesh) {
        this.triangles = [];

        parsedMesh.faces.forEach(face => {
            let vs = [];
            let vns = [];
            face.vertices.forEach(vertex => {
                let vs_list = parsedMesh.vertices[vertex.vertexIndex-1];
                vs.push([vs_list.x, vs_list.y, vs_list.z]);
                let vns_list = parsedMesh.vertexNormals[vertex.vertexNormalIndex-1];
                vns.push([vns_list.x, vns_list.y, vns_list.z]);
            });
            this.triangles.push(new Triangle(vs, vns));
        });
    }

    formatAttributesTexture() {
        let array = new Float32Array(this.triangles.length * Triangle.size);

        for(let i = 0; i < this.triangles.length; i++) {
            let triangleAttributesTexture = this.triangles[i].formatAttributesTexture();
            for(let j = 0; j < Triangle.size; j++) {
                array[i * Triangle.size + j] = triangleAttributesTexture[j];
            }
        }

        return array;
    }

}

export class Mesh {
    static size = 3;
    static sectionPerMesh = 1;
    constructor(meshID, name, meshBVH, triangleArray, triangleAttributesBase, AABB) {
        this.meshID = meshID;
        this.name = name;
        this.meshBVH = meshBVH;
        this.triangleArray = triangleArray;
        this.triangleAttributesStart = triangleAttributesBase;
        this.AABB = AABB;

        this.gui = undefined;
    }

    formatAttributesTexture() {
        let array = new Float32Array(Mesh.size);
        array[0] = this.meshBVH;
        array[1] = this.triangleAttributesStart;
        array[2] = 0.0; //reserved
        return array;
    }
}

export class MeshModels {
    static meshAttributesWidth = 512;
    static meshAttributesHeight = 512;

    static triangleAttributesWidth = 512;
    static triangleAttributesHeight = 512;

    constructor() {
        let container = document.getElementById('flex-container');

        this.meshesGUI = new GUI({title: 'Meshes', container: container});
        this.meshesGUI.domElement.style.maxHeight = '90%';
        this.meshes = [];

        this.meshAttributesTextureData = new Float32Array(MeshModels.meshAttributesWidth * MeshModels.meshAttributesHeight * 3); // only rgb
        this.triangleAttributesTextureData = new Float32Array(MeshModels.triangleAttributesWidth * MeshModels.triangleAttributesHeight * 3);
        this.triangleDataEnd = 0;
    }

    updateAttributesTexture(meshID) {
        // console.log(this.meshes[meshID]);
        let meshAttributesTexture = this.meshes[meshID].formatAttributesTexture();
        for(let i = 0; i < Mesh.size; i++) {
            this.meshAttributesTextureData[meshID * Mesh.size + i] = meshAttributesTexture[i];
        }

        let triangleAttributesTexture = this.meshes[meshID].triangleArray.formatAttributesTexture();
        for(let i = 0; i < triangleAttributesTexture.length; i++) {
            this.triangleAttributesTextureData[this.meshes[meshID].triangleAttributesStart + i] = triangleAttributesTexture[i];
        }
    }

    _newTriangleAttributesBase(length) {
        let start = this.triangleDataEnd;
        this.triangleDataEnd += length*18;
        return start;
    }

    addMesh(parsedMesh, bvhsManager) {
        let triangleArray = new TriangleArray(parsedMesh);
        let meshBVH = bvhsManager.createBVH(triangleArray.triangles);
        let meshID = this.meshes.length;
        let AABB = bvhsManager.getAABB(meshBVH);

        let mesh = new Mesh(meshID, parsedMesh.name, meshBVH, triangleArray, this._newTriangleAttributesBase(triangleArray.triangles.length), AABB);
        mesh.gui = this.meshesGUI.addFolder(`ID:${this.meshes.length} - ` +mesh.name);
        mesh.gui.add(mesh.triangleArray.triangles, 'length').name('Triangle Count').disable();
        this.meshes.push(mesh);
        this.updateAttributesTexture(meshID);
    }

    getMeshAABB(meshID) {
        return this.meshes[meshID].AABB;
    }

    addMeshes(parsedMeshes, bvhsManager){
        // console.log(parsedMeshes);
        parsedMeshes.forEach(parsedMesh => {
            this.addMesh(parsedMesh, bvhsManager);
        });
    }
}