precision highp float;

#ifndef PI
#define PI (3.1415926535)
#endif

#ifndef INF
#define INF (2147483647)
#endif

#ifndef INF_F
#define INF_F (1e7)
#endif
// const float INF_F = 1e6;

#ifndef EPS
#define EPS (0.00001)
#endif

uniform float time;
uniform int objNums;
uniform vec3 cameraPos;

uniform float iterations;
uniform int maxBounces;

uniform sampler2D displayBufferTexture;
uniform vec2 displayBufferTextureSize;
#define displayBufferTextureWidth displayBufferTextureSize.x
#define displayBufferTextureHeight displayBufferTextureSize.y

uniform sampler2D objAttributesTexture;
uniform vec2 objAttributesTextureSize;
#define objAttributesTextureWidth objAttributesTextureSize.x
#define objAttributesTextureHeight objAttributesTextureSize.y
uniform int objSectionsPerObj;

uniform sampler2D materialAttributesTexture;
uniform vec2 materialAttributesTextureSize;
#define materialAttributesWidth materialAttributesTextureSize.x
#define materialAttributesHeight materialAttributesTextureSize.y
uniform int materialSectionsPerMaterial;

uniform int rootBVH;

uniform sampler2D bvhsAttributesTexture;
uniform vec2 bvhsAttributesTextureSize;
#define bvhsAttributesTextureWidth bvhsAttributesTextureSize.x
#define bvhsAttributesTextureHeight bvhsAttributesTextureSize.y
uniform int bvhsSectionsPerNode;

uniform sampler2D elementIDMapAttributesTexture;
uniform vec2 elementIDMapAttributesTextureSize;
#define elementIDMapAttributesTextureWidth elementIDMapAttributesTextureSize.x
#define elementIDMapAttributesTextureHeight elementIDMapAttributesTextureSize.y

uniform sampler2D meshAttributesTexture;
uniform vec2 meshAttributesTextureSize;
#define meshAttributesTextureWidth meshAttributesTextureSize.x
#define meshAttributesTextureHeight meshAttributesTextureSize.y
uniform int meshSectionsPerMesh;

uniform sampler2D triangleAttributesTexture;
uniform vec2 triangleAttributesTextureSize;
#define triangleAttributesTextureWidth triangleAttributesTextureSize.x
#define triangleAttributesTextureHeight triangleAttributesTextureSize.y
uniform int triangleSectionsPerTriangle;

uniform sampler2D envTexture;
uniform int enableEnvTexture;

in vec3 initRayDirection;

out vec4 fragColor;

/* For BVH Query */

vec2 getBVHAttributeTextureCoord(int bvhSectionID){
	float fix = mod(float(bvhSectionID), bvhsAttributesTextureWidth);
	float fiy = floor(float(bvhSectionID) / bvhsAttributesTextureWidth);
	return vec2(fix, fiy);
}

vec3 getMin(int bvhNodeID){
	vec2 coord = getBVHAttributeTextureCoord(bvhNodeID*bvhsSectionsPerNode);
	return texture(bvhsAttributesTexture, vec2(coord.x/bvhsAttributesTextureWidth,coord.y/bvhsAttributesTextureHeight)).xyz;
}

vec3 getMax(int bvhNodeID){
	vec2 coord = getBVHAttributeTextureCoord(bvhNodeID*bvhsSectionsPerNode+1);
	return texture(bvhsAttributesTexture, vec2(coord.x/bvhsAttributesTextureWidth,coord.y/bvhsAttributesTextureHeight)).xyz;
}

vec2 getChildren(int bvhNodeID){
	vec2 coord = getBVHAttributeTextureCoord(bvhNodeID*bvhsSectionsPerNode+2);
	return texture(bvhsAttributesTexture, vec2(coord.x/bvhsAttributesTextureWidth,coord.y/bvhsAttributesTextureHeight)).xy;
}

vec2 getElementIDMap(int bvhNodeID){
	vec2 coord = getBVHAttributeTextureCoord(bvhNodeID*bvhsSectionsPerNode+2);
	return texture(bvhsAttributesTexture, vec2(coord.x/bvhsAttributesTextureWidth,coord.y/bvhsAttributesTextureHeight)).zw;
}

bool intersectAABB(in Ray ray, vec3 minAABB, vec3 maxAABB, inout float tmin, inout float tmax){

	vec3 invDir = 1.0 / ray.direction;
	vec3 t0s = (minAABB - ray.origin) * invDir; // t0s 是指从 ray.origin 到 minAABB 的各个分量各自的参数t
	vec3 t1s = (maxAABB - ray.origin) * invDir; // t1s 同理
	vec3 tsmaller = min(t0s, t1s);
	vec3 tbigger = max(t0s, t1s);
	tmin = max(max(tsmaller.x, tsmaller.y), tsmaller.z);
	tmax = min(min(tbigger.x, tbigger.y), tbigger.z);
	return tmin <= tmax;
}

/* For ElementIDMap Query */

vec2 getElementIDMapTextureCoord(int elementIDMapLocation){
	int elementIDMapSectionID = elementIDMapLocation / 4;
	float fix = mod(float(elementIDMapSectionID), elementIDMapAttributesTextureWidth);
	float fiy = floor(float(elementIDMapSectionID) / elementIDMapAttributesTextureWidth);
	return vec2(fix, fiy);
}

int getElementID(int elementIDMapLocation){
	vec2 coord = getElementIDMapTextureCoord(elementIDMapLocation);
	int bit = elementIDMapLocation % 4;
	if(bit == 0)
	return int(texture(elementIDMapAttributesTexture, vec2(coord.x/elementIDMapAttributesTextureWidth,coord.y/elementIDMapAttributesTextureHeight)).x);
	else if(bit == 1)
	return int(texture(elementIDMapAttributesTexture, vec2(coord.x/elementIDMapAttributesTextureWidth,coord.y/elementIDMapAttributesTextureHeight)).y);
	else if(bit == 2)
	return int(texture(elementIDMapAttributesTexture, vec2(coord.x/elementIDMapAttributesTextureWidth,coord.y/elementIDMapAttributesTextureHeight)).z);
	else
	return int(texture(elementIDMapAttributesTexture, vec2(coord.x/elementIDMapAttributesTextureWidth,coord.y/elementIDMapAttributesTextureHeight)).w);
}

/* For Intersect Detection */
vec3 getPointOnRay(in Ray ray, float dis){
	return ray.origin + (dis - 0.0001) * normalize(ray.direction);
}

const float radius = 0.5;
bool intersectSphere(in Object obj, in Ray ray, inout Intersection intersect) {

	Ray rayInObjCoord;
	rayInObjCoord.origin = (obj.invModel * vec4(ray.origin,1.0)).xyz;
	rayInObjCoord.direction = (normalize(obj.invModel * vec4(ray.direction,0.0))).xyz;

	float sign=1.0;
	if(sqrt(dot(rayInObjCoord.origin, rayInObjCoord.origin)) < radius){
		sign=-1.0;
		intersect.isInsideOut = true;
//		return false;
	}else{
		intersect.isInsideOut = false;
	}

	float vDotDirection = dot(rayInObjCoord.origin, rayInObjCoord.direction); //
	float radicand = vDotDirection * vDotDirection - (dot(rayInObjCoord.origin, rayInObjCoord.origin) - radius * radius);
	if (radicand < 0.0){
		return false;
	}

	float squareRoot = sqrt(radicand);
	float firstTerm = -vDotDirection;
	float t1 = firstTerm + squareRoot;
	float t2 = firstTerm - squareRoot;
	float t;

	if (t1 < 0.0 && t2 < 0.0) {
		return false;
	} else if (t1 > 0.0 && t2 > 0.0) {
		t = min(t1, t2);
	} else {
		t = max(t1, t2);
	}

	intersect.intersectPos = (obj.model *  vec4(getPointOnRay(rayInObjCoord, t), 1.0)).xyz;
	vec3 realOrigin = (obj.model * vec4(0,0,0,1)).xyz;
	intersect.intersectNormal  = sign * vec3( normalize((obj.transInvModel * vec4((intersect.intersectPos - realOrigin), 0.0)).xyz) ); // fix normal with model matrix

	intersect.intersectDistance = length(ray.origin - intersect.intersectPos);
	return true;
}

bool intersectCube(in Object obj, in Ray ray, inout Intersection intersect) {

	Ray rayInObjCoord;
	rayInObjCoord.origin = (obj.invModel * vec4(ray.origin,1.0)).xyz;
	rayInObjCoord.direction = (normalize(obj.invModel * vec4(ray.direction,0.0))).xyz;

	float sign=1.0;
	if(abs(rayInObjCoord.origin.x)-0.5<0.0&&abs(rayInObjCoord.origin.y)-0.5<0.0&&abs(rayInObjCoord.origin.z)-0.5<0.0){
		sign = -1.0;
		intersect.isInsideOut = true;
//		return false;
	}else{
		intersect.isInsideOut = false;
	}

	float tnear = -999999.0;
	float tfar = 999999.0;
	float t1,t2,temp;
	for (int i = 0; i < 3; i++) {
		if (rayInObjCoord.direction[i] == 0.0 ) {
			if (rayInObjCoord.origin[i] > 0.5 || rayInObjCoord.origin[i] < -0.5) {
				return false;
			}
		}
		t1 = (-0.5 - rayInObjCoord.origin[i])/rayInObjCoord.direction[i];
		t2 = (0.5 - rayInObjCoord.origin[i])/rayInObjCoord.direction[i];
		if (t1 > t2) {
			temp = t1;
			t1 = t2;
			t2 = temp;
		}
		if (t1 > tnear) {
			tnear = t1;
		}
		if (t2 < tfar) {
			tfar = t2;
		}
		if (tnear > tfar) {
			return false;
		}
		if (tfar < 0.0) {
			return false;
		}
	}

	float t;
	if (tnear < -0.0001)
	t=tfar;
	else
	t=tnear;

	vec3 P = getPointOnRay(rayInObjCoord, t);
	if(abs(P[0]-0.5)<0.001)
	intersect.intersectNormal = vec3(1,0,0);
	else if(abs(P[0]+0.5)<0.001)
	intersect.intersectNormal = vec3(-1,0,0);
	else if(abs(P[1]-0.5)<0.001)
	intersect.intersectNormal = vec3(0,1,0);
	else if(abs(P[1]+0.5)<0.001)
	intersect.intersectNormal = vec3(0,-1,0);
	else if(abs(P[2]-0.5)<0.001)
	intersect.intersectNormal = vec3(0,0,1);
	else if(abs(P[2]+0.5)<0.001)
	intersect.intersectNormal = vec3(0,0,-1);


	intersect.intersectPos = (obj.model *  vec4(P, 1.0)).xyz;
	intersect.intersectNormal = sign * normalize((obj.transInvModel * vec4(intersect.intersectNormal,0.0)).xyz);
	intersect.intersectDistance = length(ray.origin - intersect.intersectPos);
	return true;
}

bool intersectPlane(in Object obj, in Ray ray, inout Intersection intersect) {	//on xz plane, normal: +y
	intersect.intersectNormal = vec3(0.0, 1.0, 0.0);

	Ray rayInObjCoord;
	rayInObjCoord.origin = (obj.invModel * vec4(ray.origin,1.0)).xyz;
	rayInObjCoord.direction = (normalize(obj.invModel * vec4(ray.direction,0.0))).xyz;

	if(rayInObjCoord.direction.y >= 0.0 || rayInObjCoord.direction.y == 0.0)
	return false;

	float t = - rayInObjCoord.origin.y / rayInObjCoord.direction.y;

	vec3 intersectPoint = getPointOnRay(rayInObjCoord, t);
	if (intersectPoint.x < -0.5 || intersectPoint.x > 0.5 ||
	intersectPoint.z < -0.5 || intersectPoint.z > 0.5)
	return false;

	intersect.intersectPos = (obj.model *  vec4(intersectPoint, 1.0)).xyz;
	intersect.intersectNormal = normalize((obj.transInvModel * vec4(intersect.intersectNormal,0.0)).xyz);
	intersect.intersectDistance = length(ray.origin - intersect.intersectPos);
	return true;
}

/* For Triangle Query */

vec2 getTriangleAttributeTextureCoord(int sectionID){
	float fix = mod(float(sectionID), triangleAttributesTextureWidth);
	float fiy = floor(float(sectionID) / triangleAttributesTextureWidth);
	return vec2(fix, fiy);
}

mat3 getTriangleVertexes(int triangleID){
	vec2 coord = getTriangleAttributeTextureCoord(triangleID*triangleSectionsPerTriangle);
	vec3 v1 = texture(triangleAttributesTexture, vec2(coord.x/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	coord = getTriangleAttributeTextureCoord(triangleID*triangleSectionsPerTriangle+1);
	vec3 v2 = texture(triangleAttributesTexture, vec2(coord.x/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	coord = getTriangleAttributeTextureCoord(triangleID*triangleSectionsPerTriangle+2);
	vec3 v3 = texture(triangleAttributesTexture, vec2(coord.x/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	return mat3(v1,v2,v3);
}

mat3 getTriangleVertexesNormals(int triangleID){
	vec2 coord = getTriangleAttributeTextureCoord(triangleID*triangleSectionsPerTriangle+3);
	vec3 v1 = texture(triangleAttributesTexture, vec2(coord.x/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	coord = getTriangleAttributeTextureCoord(triangleID*triangleSectionsPerTriangle+4);
	vec3 v2 = texture(triangleAttributesTexture, vec2(coord.x/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	coord = getTriangleAttributeTextureCoord(triangleID*triangleSectionsPerTriangle+5);
	vec3 v3 = texture(triangleAttributesTexture, vec2(coord.x/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	return mat3(v1,v2,v3);
}

bool intersectTriangle(in int triangleID, in Ray ray, inout Intersection intersect){
	mat3 vertexes = getTriangleVertexes(triangleID);

	// intersect?
	vec3 edge1 = vertexes[1] - vertexes[0];
	vec3 edge2 = vertexes[2] - vertexes[0];
	vec3 pvec = cross(ray.direction, edge2);
	float det = dot(edge1, pvec);
	if (det < EPS && det > -EPS) {
		return false;
	}

	float invDet = 1.0 / det;
	vec3 tvec = ray.origin - vertexes[0];
	float u = dot(tvec, pvec) * invDet;
	if (u < 0.0 -EPS || u > 1.0 + EPS) {
		return false;
	}

	vec3 qvec = cross(tvec, edge1);
	float v = dot(ray.direction, qvec) * invDet;
	if (v < 0.0 -EPS || u + v > 1.0 + EPS) {
		return false;
	}

	if (dot(edge2, qvec) * invDet < 0.0) {// t=dot(edge2, qvec) 为 ray.origin 到交点的距离
		return false;
	}

	// intersected
	mat3 vertexesNormals = getTriangleVertexesNormals(triangleID);

	// interpolate normal
	intersect.intersectNormal = normalize(vertexesNormals[0] * (1.0 - u - v) + vertexesNormals[1] * u + vertexesNormals[2] * v);

	if(dot(intersect.intersectNormal, ray.direction) > 0.0){
		intersect.intersectNormal = -intersect.intersectNormal;
		intersect.isInsideOut = true;
//		return false;
	}else{
		intersect.isInsideOut = false;
	}

	intersect.intersectPos = vertexes[0] * (1.0 - u - v) + vertexes[1] * u + vertexes[2] * v;
	intersect.intersectDistance = length(ray.origin - intersect.intersectPos)+0.01;
	return true;
}

bool intersectTriangles(const int elementStart, const int elementEnd, in Ray ray, inout Intersection finalIntersect, in int triangleIDBase) {

	finalIntersect.intersectDistance = INF_F;
	
	for(int element = elementStart; element < elementEnd; element++){

		int triangleID = triangleIDBase + getElementID(element);

		bool intersected = false;
		Intersection tempIntersect;
		tempIntersect.intersectDistance = INF_F;

		intersected = intersectTriangle(triangleID, ray, tempIntersect);

		if(intersected && tempIntersect.intersectDistance > 0.0 && tempIntersect.intersectDistance < finalIntersect.intersectDistance){
			finalIntersect = tempIntersect;
		}
	}

	if (finalIntersect.intersectDistance < INF_F - 0.01){
		return true;
	} else {
		return false;
	}
}

/* For Mesh Query */

vec2 getMeshAttributeTextureCoord(int meshSectionID){
	float fix = mod(float(meshSectionID), meshAttributesTextureWidth);
	float fiy = floor(float(meshSectionID) / meshAttributesTextureWidth);
	return vec2(fix, fiy);
}

int getMeshBVH(int meshID){
	vec2 coord = getMeshAttributeTextureCoord(meshID*meshSectionsPerMesh);
	return int(texture(meshAttributesTexture, vec2(coord.x/meshAttributesTextureWidth,coord.y/meshAttributesTextureHeight)).x);
}

int getTriangleAttributesStart(int meshID){
	vec2 coord = getMeshAttributeTextureCoord(meshID*meshSectionsPerMesh);
	return int(texture(meshAttributesTexture, vec2(coord.x/meshAttributesTextureWidth,coord.y/meshAttributesTextureHeight)).y);
}

bool intersectMeshBVH(in int meshBVHNodeID, in Ray ray, inout Intersection finalIntersect, in int triangleIDBase){

	float tmin, tmax;
	int stack[64];
	int stackTop = -1;
	float closestIntersectionDistance = INF_F - 0.01;

	stack[++stackTop] = meshBVHNodeID;

	while(stackTop >= 0) {
		int nodeID = stack[stackTop--];
		vec3 minAABB = getMin(nodeID);
		vec3 maxAABB = getMax(nodeID);

		if(intersectAABB(ray, minAABB, maxAABB, tmin, tmax)) {
			vec2 children = getChildren(nodeID);
			int leftChild = int(children.x);
			int rightChild = int(children.y);

			if (tmin > closestIntersectionDistance) continue;

			if(leftChild <= 0 && rightChild <= 0) {

				int start = int(getElementIDMap(nodeID).x);
				int end = start + int(getElementIDMap(nodeID).y);

				Intersection tempIntersect;
				tempIntersect.intersectDistance = INF_F;

				bool intersected = intersectTriangles(start, end, ray, tempIntersect, triangleIDBase);//intersect triangles

				if(intersected && (tempIntersect.intersectDistance > 0.0) && (tempIntersect.intersectDistance < closestIntersectionDistance)){
					closestIntersectionDistance = tempIntersect.intersectDistance;
					finalIntersect = tempIntersect;
				}

			} else {

				if(leftChild > 0) {
					stack[++stackTop] = leftChild;
				}

				if(rightChild > 0) {
					stack[++stackTop] = rightChild;
				}
			}

		}
	}

	if (closestIntersectionDistance < INF_F - 0.01){
		return true;
	} else {
		return false;
	}
}

bool intersectMesh(in Object meshObj, in Ray ray, inout Intersection intersect) {

	int meshBVH = getMeshBVH(meshObj.meshID);
	int triangleAttributesStart = getTriangleAttributesStart(meshObj.meshID);

	Ray rayInMeshCoord;
	rayInMeshCoord.origin = (meshObj.invModel * vec4(ray.origin,1.0)).xyz;
	rayInMeshCoord.direction = (normalize(meshObj.invModel * vec4(ray.direction,0.0))).xyz;

	Intersection tempIntersect;
	tempIntersect.intersectDistance = INF_F;

	if(intersectMeshBVH(meshBVH, rayInMeshCoord, tempIntersect, triangleAttributesStart/18)){

		intersect.intersectPos = (meshObj.model *  vec4(tempIntersect.intersectPos, 1.0)).xyz;
		intersect.intersectNormal = normalize((meshObj.transInvModel * vec4(tempIntersect.intersectNormal, 0.0)).xyz);
		intersect.intersectDistance = length(ray.origin - intersect.intersectPos);
		intersect.isInsideOut = tempIntersect.isInsideOut;

		return true;
	}else{
		return false;
	}
}

/* For Obj Query */

vec2 getObjAttributeTextureCoord(int SectionID){
	float fix = mod(float(SectionID), objAttributesTextureWidth);
	float fiy = floor(float(SectionID) / objAttributesTextureWidth);
	return vec2(fix, fiy);
}

int getObjType(int objID){
	vec2 coord = getObjAttributeTextureCoord(objID*objSectionsPerObj);
	return int(texture(objAttributesTexture, vec2(coord.x/objAttributesTextureWidth,coord.y/objAttributesTextureHeight)).w);
}

vec3 getPos(int objID){
	vec2 coord = getObjAttributeTextureCoord(objID*objSectionsPerObj);
	return texture(objAttributesTexture, vec2(coord.x/objAttributesTextureWidth,coord.y/objAttributesTextureHeight)).xyz;
}

vec3 getScale(int objID){
	vec2 coord = getObjAttributeTextureCoord(objID*objSectionsPerObj+1);
	return texture(objAttributesTexture, vec2(coord.x/objAttributesTextureWidth,coord.y/objAttributesTextureHeight)).xyz;
}

vec3 getRotation(int objID){
	vec2 coord = getObjAttributeTextureCoord(objID*objSectionsPerObj+2);
	return texture(objAttributesTexture, vec2(coord.x/objAttributesTextureWidth,coord.y/objAttributesTextureHeight)).xyz;
}

int getMaterialID(int objID){
	vec2 coord = getObjAttributeTextureCoord(objID*objSectionsPerObj+1);
	return int(texture(objAttributesTexture, vec2(coord.x/objAttributesTextureWidth,coord.y/objAttributesTextureHeight)).w);
}

int getMeshID(int objID){
	vec2 coord = getObjAttributeTextureCoord(objID*objSectionsPerObj+2);
	return int(texture(objAttributesTexture, vec2(coord.x/objAttributesTextureWidth,coord.y/objAttributesTextureHeight)).w);
}

/* For Material Query */

vec2 getMaterialAttributeTextureCoord(int SectionID){
	float fix = mod(float(SectionID), materialAttributesWidth);
	float fiy = floor(float(SectionID) / materialAttributesWidth);
	return vec2(fix, fiy);
}
vec3 getColor(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial);
	return texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).rgb;
}

int getReflective(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial+1);
	return int(texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).x);
}

float getReflectivity(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial+1);
	return texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).y;
}

int getRefractive(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial+1);
	return int(texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).z);
}

float getIOR(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial+1);
	return texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).w;
}

float getEmittance(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial+2);
	return texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).x;
}

int getSubsurfaceScatter(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial+2);
	return int(texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).y);
}

bool intersectObjs(const int elementStart, const int elementEnd, in Ray ray, inout Intersection finalIntersect, inout int finalIntersectObjID) {

	finalIntersect.intersectDistance = INF_F - 0.01;

	for(int element = elementStart; element < elementEnd; element++){
		// intersect flag
		bool intersected = false;

		// temp intersect
		Intersection tempIntersect;
		tempIntersect.intersectDistance = INF_F;

		// temp intersect obj id
		int tempIntersectObjID = getElementID(element);

		// temp intersect obj
		Object tempIntersectObj;

		tempIntersectObj.objType = getObjType(tempIntersectObjID);

		mat4 modelMat = mat4(1.0);
		translate(modelMat, getPos(tempIntersectObjID));
		vec3 rotv = getRotation(tempIntersectObjID);
		rotateX(modelMat,PI / 180.0 * rotv.x);
		rotateY(modelMat,PI / 180.0 * rotv.y);
		rotateZ(modelMat,PI / 180.0 * rotv.z);
		scale(modelMat, getScale(tempIntersectObjID));

		tempIntersectObj.model = modelMat;
		tempIntersectObj.invModel = inversemat(tempIntersectObj.model);
		tempIntersectObj.transInvModel = transposeMat(tempIntersectObj.invModel);

		// intersect obj
		if(tempIntersectObj.objType == 0){

			intersected = intersectSphere(tempIntersectObj, ray, tempIntersect);

		} else if(tempIntersectObj.objType == 1) {

			intersected = intersectPlane(tempIntersectObj, ray, tempIntersect);

		} else if(tempIntersectObj.objType == 2) {

			intersected = intersectCube(tempIntersectObj, ray, tempIntersect);

		} else if(tempIntersectObj.objType == 3) {

			tempIntersectObj.meshID = getMeshID(tempIntersectObjID);
			intersected = intersectMesh(tempIntersectObj, ray, tempIntersect);

		}

		// update intersect result
		if(intersected && (tempIntersect.intersectDistance > 0.0) && (tempIntersect.intersectDistance < finalIntersect.intersectDistance)){
			finalIntersect = tempIntersect;
			finalIntersectObjID = tempIntersectObjID;
		}
	}

	if (finalIntersect.intersectDistance < INF_F - 0.01){
		return true;
	} else {
		return false;
	}
}

bool intersectRootBVH(in int rootBVHNodeID, in Ray ray, inout Intersection finalIntersect, inout int finalIntersectObjID){

	float tmin, tmax;
	int stack[64];
	int stackTop = -1;
	float closestIntersectionDistance = INF_F - 0.01;

	stack[++stackTop] = rootBVHNodeID;

	while(stackTop >= 0) {
		int nodeID = stack[stackTop--];
		vec3 minAABB = getMin(nodeID);
		vec3 maxAABB = getMax(nodeID);

		if(intersectAABB(ray, minAABB, maxAABB, tmin, tmax)) {
			vec2 children = getChildren(nodeID);
			int leftChild = int(children.x);
			int rightChild = int(children.y);

			if (tmin > closestIntersectionDistance) continue;

			if(leftChild <= 0 && rightChild <= 0) {

				int start = int(getElementIDMap(nodeID).x);
				int end = start + int(getElementIDMap(nodeID).y);

				Intersection tempIntersect;
				tempIntersect.intersectDistance = INF_F;

				int tempIntersectObjID;
				bool intersected = intersectObjs(start, end, ray, tempIntersect, tempIntersectObjID);

				if(intersected && (tempIntersect.intersectDistance > 0.0) && (tempIntersect.intersectDistance < closestIntersectionDistance)){
					closestIntersectionDistance = tempIntersect.intersectDistance;
					finalIntersect = tempIntersect;
					finalIntersectObjID = tempIntersectObjID;
				}

			} else {

				if(leftChild > 0) {
					stack[++stackTop] = leftChild;
				}

				if(rightChild > 0) {
					stack[++stackTop] = rightChild;
				}
			}

		}
	}

	if (closestIntersectionDistance < INF_F - 0.01){
		return true;
	} else {
		return false;
	}
}

const float shift = 0.01;
vec3 pathTrace(in Ray curRay, inout vec3 finalColor){

	vec3 tempColor = vec3(1.0, 1.0, 1.0);

	for (int i = 0; i < maxBounces; ++i) {

		Intersection intersect;
		intersect.intersectDistance = INF_F;
		int intersectObjID;

		float seed = time + float(i)/100.0; // random seed

		if (intersectRootBVH(rootBVH, curRay, intersect, intersectObjID)) { // 通过 BVH 求出相交物体并得到相交信息
			// 有相交，获取本次相交的材质信息
			int materialID = getMaterialID(intersectObjID);
			Material material;

			material.color = getColor(materialID);

			material.reflective = getReflective(materialID);
			material.reflectivity = getReflectivity(materialID);
			material.refractive = getRefractive(materialID);
			material.IOR = getIOR(materialID);

			material.emittance = getEmittance(materialID);
//			material.subsurfaceScatter = getSubsurfaceScatter(materialID); // TODO: 未来可以考虑实现次表面散射

			// 接下来，计算下一次迭代射线以及当前射线累积颜色

			// 光源物体 TODO: 未来可以考虑实现单独的光源类，以实现平行光、隐藏光源等功能
			if(material.emittance > 0.0){
				finalColor = tempColor * material.color * material.emittance;
				return finalColor;
			}

			Ray newRay = curRay;

			// 非光源物体 分材质讨论
			if (material.refractive == 0 && material.reflective == 0){ // 仅漫反射

				tempColor *= material.color;

				newRay.direction = normalize(calculateRandomDirectionInHemisphere(intersect.intersectNormal, initRayDirection, seed + randOnVec2(intersect.intersectPos.xy)));
				newRay.origin = intersect.intersectPos + shift * newRay.direction;

			} else { // 有反射或折射

				vec3 noiseVec3 = vec3(randOnVec2(intersect.intersectPos.yz),randOnVec2(intersect.intersectNormal.xz),randOnVec2(intersect.intersectNormal.xy));
				float randomNum = randOnVec3WithNoiseAndSeed(curRay.direction, noiseVec3, seed+0.5);

				if(material.refractive > 0) { // 折射，且有折射必有反射，通过 Fresnel 公式计算反射比例

					// 判断入射光线是否从物体内部射出
					bool isInsideOut = intersect.isInsideOut;

					float curIOR = curRay.curIOR;
					float objIOR = material.IOR;

					Fresnel fresnel = calculateFresnel(intersect.intersectNormal, curRay.direction, curIOR, objIOR);

					vec3 noiseVec3 = vec3(randOnVec2(intersect.intersectPos.xy),randOnVec2(intersect.intersectPos.xz),randOnVec2(intersect.intersectPos.yz));
					float randomnum = randOnVec3WithNoiseAndSeed(initRayDirection, noiseVec3, seed);

					if(randomnum < fresnel.reflectionCoefficient){ // 小于反射比例，反射

						vec3 reflectDirection = reflect(curRay.direction, intersect.intersectNormal);
						newRay.direction = reflectDirection;

						if(material.reflectivity < 1.0){ // 若有漫反射，则根据 reflectivity(=1-Roughness)加入随机扰动
							newRay.direction = reflectDiffuseRandom(newRay.direction, material.reflectivity, initRayDirection, seed + randOnVec2(intersect.intersectPos.yz));
						}

						newRay.origin = intersect.intersectPos + shift * newRay.direction;

//						if(material.subsurfaceScatter > 0){
//							float random = randOnVec2(intersect.intersectPos.xy);
//							tempColor *= subScatterFS(intersect, material, random);
//						}

					} else { // 折射

						if(isInsideOut){ //out object
							newRay.accIOR = curRay.accIOR / objIOR;
							newRay.curIOR = newRay.accIOR;
						} else { //into object
							newRay.accIOR = curRay.accIOR * objIOR;
							newRay.curIOR = objIOR;
						}
						float IORratio = curRay.curIOR / newRay.curIOR;

						vec3 refractDirection = refract(curRay.direction, intersect.intersectNormal, IORratio);
						newRay.direction = refractDirection;

						if(material.reflectivity < 1.0){ // 若有漫反射，则根据 reflectivity(=1-Roughness)加入随机扰动
							newRay.direction = reflectDiffuseRandom(newRay.direction, material.reflectivity, initRayDirection, seed + randOnVec2(intersect.intersectPos.yz));
						}

						newRay.origin = intersect.intersectPos + shift * newRay.direction;

					}

					tempColor *= material.color;

				} else if(material.reflective > 0) { // 仅反射

//					if(material.subsurfaceScatter > 0){
//						float random = randOnVec2(intersect.intersectPos.xy);
//						tempColor *= subScatterFS(intersect, material, random);
//					}
					tempColor *= material.color;

					newRay.direction = reflect(curRay.direction, intersect.intersectNormal);
					if(material.reflectivity < 1.0){
						newRay.direction = reflectDiffuseRandom(newRay.direction, material.reflectivity, initRayDirection, seed + randOnVec2(intersect.intersectPos.yz));
					}
					newRay.origin = intersect.intersectPos + shift * newRay.direction;
				}

			}

			curRay = newRay;

		} else { // 无交点 - 环境光
			vec3 envColor;
			if(enableEnvTexture > 0){
				envColor = texture(envTexture, vec2(0.5 + atan(curRay.direction.z, curRay.direction.x) / (2.0 * PI), 0.5 - asin(curRay.direction.y) / PI)).rgb;
			}else{
				envColor = vec3(0.0, 0.0, 0.0);
			}
			finalColor = tempColor * envColor;
			return finalColor;
		}

	}

	finalColor = vec3(0.0, 0.0, 0.0);
	return finalColor;
}

void main(void){

	Ray ray;
	ray.origin = cameraPos.xyz;
	ray.direction = normalize( initRayDirection );
	ray.curIOR = 1.0;
	ray.accIOR = 1.0;

	vec3 finalColor = vec3(0.0);

	pathTrace(ray, finalColor); // path tracing

	vec3 previousColor = texture(displayBufferTexture, vec2(gl_FragCoord.x / displayBufferTextureWidth,gl_FragCoord.y / displayBufferTextureHeight) ).rgb;
	fragColor = vec4(mix( finalColor, previousColor, iterations / ( iterations + 1.0 )), 1.0);
}