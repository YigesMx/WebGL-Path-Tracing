import {vec3} from "gl-matrix";

export class AABB {
    constructor(min = vec3.fromValues(Infinity, Infinity, Infinity),
                max = vec3.fromValues(-Infinity, -Infinity, -Infinity)) {
        this.min = min;
        this.max = max;
    }

    surfaceArea(){
        let diff = vec3.fromValues(0,0,0);
        vec3.subtract(diff, this.max, this.min);
        return 2 * (diff[0] * diff[1] + diff[0] * diff[2] + diff[1] * diff[2]);
    }

    static merge(aabb1, aabb2){
        let min = vec3.fromValues(0,0,0);
        let max = vec3.fromValues(0,0,0);
        for (let i = 0; i<3; i++){
            min[i] = Math.min(aabb1.min[i], aabb2.min[i]);
            max[i] = Math.max(aabb1.max[i], aabb2.max[i]);
        }
        return new AABB(min, max);
    }

    center(axis){
        return (this.min[axis] + this.max[axis]) / 2;
    }
}

export class BVHs {
    static bvhsAttributesWidth = 512;
    static bvhsAttributesHeight = 512;
    static elementIDMapAttributesWidth = 512;
    static elementIDMapAttributesHeight = 512;
    static bvhsNodeSize = 12; // 3x4 floats
    // static bvhsSectionSize = 4; // 4 floats
    static bvhsSectionsPerNode = 3; // 3 sections per node

    //node[0-8]
    // 0 - 5 AABB
    // ...0,1,2 min
    // 3 reserved
    // ...4,5,6 max
    // 7 reserved
    // 8 leftChild
    // 9 rightChild
    // 10 elementIDMapLocation
    // 11 elementIDMapLength

    // each node occupy 3 pixels (3x4 floats) in texture
    // we call a pixel as a bvhsSection

    // nodeID = [ bvhsSectionID / bvhsSectionPerNode ]

    // directly store in array for faster speed
    // if for beauty, you can also build class
    constructor() {
        this.bvhsAttributesTextureData = new Float32Array(BVHs.bvhsAttributesWidth * BVHs.bvhsAttributesHeight * 4);
        this.bvhsDataEnd = 0;//BVHs.bvhsNodeSize;
        this.elementIDMapAttributesTextureData = new Float32Array(BVHs.elementIDMapAttributesWidth * BVHs.elementIDMapAttributesHeight * 4);
        this.elementIDMapDataEnd = 0;
    }

    // bvhsAttributesTextureData Utils

    setAABB(nodeID, aabb){
        
        for(let i = 0; i < 3; i++){
            this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + i] = aabb.min[i];
            this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + i + 4] = aabb.max[i];
        }
    }

    getAABB(nodeID){
        
        let min = vec3.fromValues(0,0,0);
        let max = vec3.fromValues(0,0,0);
        for(let i = 0; i < 3; i++){
            min[i] = this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + i];
            max[i] = this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + i + 4];
        }
        return new AABB(min, max);
    }

    setLeftChild(nodeID, leftChild){
        
        this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + 8] = leftChild;
    }

    getLeftChild(nodeID){
        
        return this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + 8];
    }

    setRightChild(nodeID, rightChild){
        
        this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + 9] = rightChild;
    }

    getRightChild(nodeID){
        
        return this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + 9];
    }

    setElementIDMapLocation(nodeID, location){
        
        this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + 10] = location;
    }

    getElementIDMapLocation(nodeID){
        
        return this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + 10];
    }

    setElementIDMapLength(nodeID, length){
        
        this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + 11] = length;
    }

    getElementIDMapLength(nodeID){
        
        return this.bvhsAttributesTextureData[nodeID * BVHs.bvhsNodeSize + 11];
    }

    // elementIDMapAttributesTextureData Utils

    mapElementIDs(elementLocation, elements){
        for (let i = 0; i < elements.length; i++){
            this.elementIDMapAttributesTextureData[elementLocation + i] = elements[i][0];
        }
    }

    getElementIDMap(elementLocation, length){
        let elements = [];
        for (let i = 0; i < length; i++){
            elements.push(this.elementIDMapAttributesTextureData[elementLocation + i]);
        }
        return elements;
    }

    // build BVH & modify elementIDMap

    _getCombinedAABB(elements){
        let aabb = elements[0][1];
        for (let i = 1; i < elements.length; i++){
            aabb = AABB.merge(aabb, elements[i][1]);
        }
        return aabb;
    }

    timeTri= 1.0;
    timeAABB = 1.0;

    _newNode(){
        let nodeID = this.bvhsDataEnd/BVHs.bvhsNodeSize;
        this.bvhsDataEnd += BVHs.bvhsNodeSize;
        return nodeID;
    }

    _build(elements, nodeID) {

        this.setAABB(nodeID, this._getCombinedAABB(elements));

        let bestCost = this.timeTri * elements.length;
        let bestAxis = -1;
        let bestSplit = -1;
        let nodeSurfaceArea = this.getAABB(nodeID).surfaceArea();

        for(let axis = 0; axis < 3; axis++) {
            elements.sort(function (a, b) {
                return a[1].center(axis) - b[1].center(axis);
            });

            let s1 = [];
            let s2 = elements.slice();
            let s1AABB = new AABB();
            let s1SurfaceArea = new Array(elements.length + 1).fill(Infinity);
            let s2SurfaceArea = new Array(elements.length + 1).fill(Infinity);

            for(let i = 0; i <= elements.length; i++) {
                s1SurfaceArea[i] = Math.abs(s1AABB.surfaceArea());
                if(s2.length > 0) {
                    let p = s2.shift();
                    s1.push(p);
                    s1AABB = AABB.merge(s1AABB, p[1]);
                }
            }

            let s2AABB = new AABB();
            for(let i = elements.length; i >= 0; i--) {
                s2SurfaceArea[i] = Math.abs(s2AABB.surfaceArea());

                if(s1.length > 0 && s2.length > 0) {
                    let cost = 2 * this.timeAABB + (s1SurfaceArea[i] * s1.length + s2SurfaceArea[i] * s2.length) * this.timeTri / nodeSurfaceArea;
                    if(cost < bestCost) {
                        bestCost = cost;
                        bestAxis = axis;
                        bestSplit = i;
                    }
                }

                if(s1.length > 0) {
                    let p = s1.pop();
                    s2.unshift(p);
                    s2AABB = AABB.merge(s2AABB, p[1]);
                }
            }
        }

        // console.log('nodeId: ' + nodeID + ' bestAxis: ' + bestAxis);

        if(bestAxis === -1) { // is leaf
            this.setLeftChild(nodeID, -1);
            this.setRightChild(nodeID, -1);

            this.setElementIDMapLocation(nodeID, this.elementIDMapDataEnd);
            this.setElementIDMapLength(nodeID, elements.length);

            this.mapElementIDs(this.elementIDMapDataEnd, elements);
            this.elementIDMapDataEnd += elements.length;

        } else { // further split
            elements.sort(function (a, b) {
                return a[1].center(bestAxis) - b[1].center(bestAxis);
            });


            let leftElements = elements.slice(0, bestSplit);
            let rightElements = elements.slice(bestSplit);

            this.setLeftChild(nodeID, this._newNode());
            this._build(leftElements, this.getLeftChild(nodeID));

            this.setRightChild(nodeID, this._newNode());
            this._build(rightElements, this.getRightChild(nodeID));
        }
    }

    BFS(rootID){
        let queue = [[rootID, 0]];
        while(queue.length > 0){
            let queFront = queue.shift();
            let nodeID = queFront[0];
            let depth = queFront[1];

            console.log('=====> nodeID: ' + nodeID)
            console.log('depth: ' + depth);
            console.log('leftChild: ' + this.getLeftChild(nodeID) + ' rightChild: ' + this.getRightChild(nodeID));
            console.log(this.getAABB(nodeID));
            console.log('location: ' + this.getElementIDMapLocation(nodeID) + ' length: ' + this.getElementIDMapLength(nodeID));
            console.log(this.getElementIDMap(this.getElementIDMapLocation(nodeID), this.getElementIDMapLength(nodeID)));


            if(this.getLeftChild(nodeID) > -0.5){
                queue.push([this.getLeftChild(nodeID), depth+1]);
            }
            if(this.getRightChild(nodeID) > -0.5){
                queue.push([this.getRightChild(nodeID), depth+1]);
            }
        }
    }

    newBVH(elementsWithAABB){

        if (elementsWithAABB.length === 0) {
            return -1;
        }

        let elements = [];
        for (let i = 0; i < elementsWithAABB.length; i++){
            elements.push([i, elementsWithAABB[i].getAABB()]);
        }

        let root = this._newNode();
        this._build(elements, root);

        return root;
    }
}