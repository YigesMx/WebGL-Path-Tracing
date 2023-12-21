precision highp float;

#ifndef PI
#define PI 3.1415926535
#endif
#ifndef INF
#define INF 2147483647
#endif
#ifndef INF_F
#define INF_F 2147483647.0
#endif
#ifndef EPS
#define EPS 0.00001
#endif

//const int MAX_OBJ_NUM = 30;

uniform float time;
uniform int objNums;
uniform vec3 cameraPos;
uniform int enableSSAA;

uniform float iterations;

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
//uniform vec2 envTextureSize;
//#define envTextureWidth envTextureSize.x
//#define envTextureHeight envTextureSize.y

in vec3 initRayDirection;

out vec4 fragColor;

// BVH

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

bool intersectAABB(Ray ray, vec3 minAABB, vec3 maxAABB, inout float tmin, inout float tmax){

	vec3 invDir = 1.0 / ray.direction;
	vec3 t0s = (minAABB - ray.origin) * invDir;
	vec3 t1s = (maxAABB - ray.origin) * invDir;
	vec3 tsmaller = min(t0s, t1s);
	vec3 tbigger = max(t0s, t1s);
	tmin = max(max(tsmaller.x, tsmaller.y), tsmaller.z);
	tmax = min(min(tbigger.x, tbigger.y), tbigger.z);
	return tmin <= tmax;
}

// elementIDMap

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

/*For Intersect Detection*/
vec3 getPointOnRay(Ray ray, float dis){
  return ray.origin + (dis - 0.0001) * normalize(ray.direction);
}

float intersectSphere(Object g, vec3 rStart, vec3 rDir, out float t,  out vec3 normal, out vec3 pos) {
    float radius = 0.5;
    vec3 ro = (g.invModel * vec4(rStart,1.0)).xyz;
    vec3 rd = (normalize(g.invModel * vec4(rDir,0.0))).xyz;

    float sign=1.0;
	if(sqrt(dot(ro,ro))<radius)
		sign=-1.0;

    Ray rt;
    rt.origin = ro;
    rt.direction = rd;

    float vDotDirection = dot(rt.origin, rt.direction);
	float radicand = vDotDirection * vDotDirection - (dot(rt.origin, rt.origin) - radius * radius);
	if (radicand < 0.0){
		return -1.0;
	}

    float squareRoot = sqrt(radicand);
	float firstTerm = -vDotDirection;
	float t1 = firstTerm + squareRoot;
	float t2 = firstTerm - squareRoot;

	if (t1 < 0.0 && t2 < 0.0) {
		return -1.0;
	} else if (t1 > 0.0 && t2 > 0.0) {
		t = min(t1, t2);
	} else {
		t = max(t1, t2);
	}

    vec3 realIntersectionPoint = (g.model *  vec4(getPointOnRay(rt, t), 1.0)).xyz;
	vec3 realOrigin = (g.model * vec4(0,0,0,1)).xyz;

    pos = realIntersectionPoint;
	// normal = sign * normalize(realIntersectionPoint - realOrigin);
	normal = vec3(sign) * vec3( normalize((g.transInvModel * vec4((realIntersectionPoint - realOrigin), 0.0)).xyz) ); // fix normal with scale

    return length(rStart - realIntersectionPoint);
}

float intersectCube(Object g, vec3 rStart, vec3 rDir, out float t, out vec3 normal, out vec3 pos){
    vec3 ro = (g.invModel * vec4(rStart,1.0)).xyz;
    vec3 rd = (normalize(g.invModel * vec4(rDir,0.0))).xyz;


    Ray rt;
    rt.origin = ro;
    rt.direction = rd;

    float sign=1.0;
	if(abs(rt.origin.x)-0.5<0.0&&abs(rt.origin.y)-0.5<0.0&&abs(rt.origin.z)-0.5<0.0)
		sign = -1.0;

	float tnear = -999999.0;
	float tfar = 999999.0;
	float t1,t2,temp;
	for (int i = 0; i < 3; i++) {
		if (rd[i] == 0.0 ) {
			if (ro[i] > 0.5 || ro[i] < -0.5) {
				return -1.0;
			}
		}
		t1 = (-0.5 - ro[i])/rd[i];
		t2 = (0.5 - ro[i])/rd[i];
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
			return -1.0;
		}
		if (tfar < 0.0) {
			return -1.0;
		}
	}

	if (tnear < -0.0001)
		t=tfar;
	else
		t=tnear;

    vec3 P = getPointOnRay(rt, t);
	if(abs(P[0]-0.5)<0.001)
		normal = vec3(1,0,0);
	else if(abs(P[0]+0.5)<0.001)
		normal = vec3(-1,0,0);
	else if(abs(P[1]-0.5)<0.001)
		normal = vec3(0,1,0);
	else if(abs(P[1]+0.5)<0.001)
		normal = vec3(0,-1,0);
	else if(abs(P[2]-0.5)<0.001)
		normal = vec3(0,0,1);
	else if(abs(P[2]+0.5)<0.001)
		normal = vec3(0,0,-1);


    vec3 realIntersectionPoint = (g.model *  vec4(P, 1.0)).xyz;

    pos = realIntersectionPoint;
    normal = sign * normalize((g.transInvModel * vec4(normal,0.0)).xyz);
    return length(rStart - realIntersectionPoint);
}

float intersectPlane(Object g, vec3 rStart, vec3 rDir, out float t,  out vec3 normal, out vec3 pos) {	//on xz plane, normal: +y
	normal = vec3(0.0, 1.0, 0.0);

    vec3 ro = (g.invModel * vec4(rStart,1.0)).xyz;
    vec3 rd = (normalize(g.invModel * vec4(rDir,0.0))).xyz;

	if(dot(rd, normal) >= 0.0 || rd.y == 0.0)
		return -1.0;

	Ray rt;
	rt.origin = ro;
	rt.direction = rd;

    t = -ro.y / rd.y;

	vec3 intersectPoint = getPointOnRay(rt, t);
	if (intersectPoint.x < -0.5 || intersectPoint.x > 0.5 ||
        intersectPoint.z < -0.5 || intersectPoint.z > 0.5)
        return -1.0;

	vec3 realIntersectionPoint = (g.model *  vec4(intersectPoint, 1.0)).xyz;
    pos = realIntersectionPoint;

	normal = normalize((g.transInvModel * vec4(normal,0.0)).xyz);

	return length(rStart - realIntersectionPoint);
}

/*For Mesh & Triangle Intersection*/

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

vec2 getTriangleAttributeTextureCoord(int sectionID){
	float fix = mod(float(sectionID), triangleAttributesTextureWidth);
	float fiy = floor(float(sectionID) / triangleAttributesTextureWidth);
	return vec2(fix, fiy);
}

mat3 getTriangleVertexes(int triangleID){
	vec2 coord = getTriangleAttributeTextureCoord(triangleID*triangleSectionsPerTriangle);
	vec3 v1 = texture(triangleAttributesTexture, vec2(coord.x/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	vec3 v2 = texture(triangleAttributesTexture, vec2((coord.x+1.0)/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	vec3 v3 = texture(triangleAttributesTexture, vec2((coord.x+2.0)/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	return mat3(v1,v2,v3);
}

mat3 getTriangleVertexesNormals(int triangleID){
	vec2 coord = getTriangleAttributeTextureCoord(triangleID*triangleSectionsPerTriangle+3);
	vec3 v1 = texture(triangleAttributesTexture, vec2(coord.x/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	vec3 v2 = texture(triangleAttributesTexture, vec2((coord.x+1.0)/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	vec3 v3 = texture(triangleAttributesTexture, vec2((coord.x+2.0)/triangleAttributesTextureWidth,coord.y/triangleAttributesTextureHeight)).xyz;
	return mat3(v1,v2,v3);
}

float intersectTriangle(int triangleID, vec3 rStart, vec3 rDir, out float t,  out vec3 normal, out vec3 pos){
	mat3 vertexes = getTriangleVertexes(triangleID);

//	return -1.0;
	// intersect?
	vec3 edge1 = vertexes[1] - vertexes[0];
	vec3 edge2 = vertexes[2] - vertexes[0];
	vec3 pvec = cross(rDir, edge2);
	float det = dot(edge1, pvec);
	if (det < EPS && det > -EPS) {
		return -1.0;
	}

	float invDet = 1.0 / det;
	vec3 tvec = rStart - vertexes[0];
	float u = dot(tvec, pvec) * invDet;
	if (u < 0.0 -EPS || u > 1.0 + EPS) {
		return -1.0;
	}

	vec3 qvec = cross(tvec, edge1);
	float v = dot(rDir, qvec) * invDet;
	if (v < 0.0 -EPS || u + v > 1.0 + EPS) {
		return -1.0;
	}

	t = dot(edge2, qvec) * invDet; // t 为 rStart 到交点的距离
	if (t < 0.0) {
		return -1.0;
	}

	// intersected
	mat3 vertexesNormals = getTriangleVertexesNormals(triangleID);

	// interpolate normal
	normal = normalize(vertexesNormals[0] * (1.0 - u - v) + vertexesNormals[1] * u + vertexesNormals[2] * v);
//	normal = normalize(cross(edge1, edge2));

	//背面剔除
	if(dot(normal, rDir) > 0.0)
		return -1.0;

	vec3 realIntersectionPoint = vertexes[0] * (1.0 - u - v) + vertexes[1] * u + vertexes[2] * v;
	pos = realIntersectionPoint;

	return length(rStart - realIntersectionPoint);
}

bool intersectTriangles(const int elementStart, const int elementEnd, Ray ray, inout Intersection intersect, int triangleStart) {

	float t;
	float hitPointDistance = -1.0;
	float closestIntersectionDistance = INF_F;
	vec3 tempNormal = vec3(0);
	vec3 tempIntersectionPoint = vec3(0);

	for(int element = elementStart; element < elementEnd; element++){

		int triangleID = triangleStart + getElementID(element);

		hitPointDistance = intersectTriangle(triangleID, ray.origin, ray.direction, t, tempNormal, tempIntersectionPoint);

		if(hitPointDistance > 0.0 && hitPointDistance < closestIntersectionDistance){
			closestIntersectionDistance = hitPointDistance;
			intersect.intersectDistance = hitPointDistance;
			intersect.intersectPos = tempIntersectionPoint;
			intersect.intersectNormal = tempNormal;
		}
	}

	if (closestIntersectionDistance > -1.0)
		return true;
	else
		return false;
}

bool intersectMeshBVH(int meshBVHNodeID, inout Ray ray, inout Intersection finalIntersect, int triangleStart){

	float tmin, tmax;
	int stack[64];
	int stackTop = -1;
	float closestIntersectionDistance = INF_F;

	stack[++stackTop] = meshBVHNodeID;

	while(stackTop >= 0) {
		int nodeID = stack[stackTop--];
		vec3 minAABB = getMin(nodeID);
		vec3 maxAABB = getMax(nodeID);

		if(intersectAABB(ray, minAABB, maxAABB, tmin, tmax)) {
			vec2 children = getChildren(nodeID);
			int leftChild = int(children.x);
			int rightChild = int(children.y);

			if(leftChild < 0 && rightChild < 0) {

				int start = int(getElementIDMap(nodeID).x);
				int end = start + int(getElementIDMap(nodeID).y);

				Intersection intersect;
				intersectTriangles(start, end, ray, intersect, triangleStart);//intersect triangles

				if(intersect.intersectDistance > 0.0 && intersect.intersectDistance < closestIntersectionDistance){
					closestIntersectionDistance = intersect.intersectDistance;
					finalIntersect = intersect;
				}

			} else {

				if(leftChild >= 0) {
					stack[++stackTop] = leftChild;
				}

				if(rightChild >= 0) {
					stack[++stackTop] = rightChild;
				}
			}

		}
	}

//	return false;

	if (closestIntersectionDistance < INF_F-0.1)
		return true;
	else
		return false;
}

float intersectMesh(Object g, vec3 rStart, vec3 rDir, out float t,  out vec3 normal, out vec3 pos) {	//on xz plane, normal: +y
	vec3 ro = (g.invModel * vec4(rStart,1.0)).xyz;
	vec3 rd = (normalize(g.invModel * vec4(rDir,0.0))).xyz;

	int meshBVH = getMeshBVH(g.meshID);
	int triangleStart = getTriangleAttributesStart(g.meshID);

	Ray rt;
	rt.origin = ro;
	rt.direction = rd;

	Intersection intersect;

	if(intersectMeshBVH(meshBVH, rt, intersect, triangleStart/18)){
		vec3 realIntersectionPoint = (g.model *  vec4(intersect.intersectPos, 1.0)).xyz;

		pos = realIntersectionPoint;

		normal = normalize((g.transInvModel * vec4(intersect.intersectNormal,0.0)).xyz);

		return length(rStart - realIntersectionPoint);
	}else{
		return -1.0;
	}
}

// Obj

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

// Material

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
	return max(texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).w, 1.0);
}

float getEmittance(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial+2);
	return texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).x;
}

int getSubsurfaceScatter(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial+2);
	return int(texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).y);
}

bool intersectObjs(const int elementStart, const int elementEnd, Ray ray, inout Intersection intersect) {

	float t;
	float hitPointDistance = -1.0;
	float closestIntersectionDistance = INF_F;
	vec3 tempNormal = vec3(0);
	vec3 tempIntersectionPoint = vec3(0);

	for(int element = elementStart; element < elementEnd; element++){

		Object temp;

		int objID = getElementID(element);

		temp.objType = getObjType(objID);

		mat4 modelMat = mat4(1.0);
		translate(modelMat, getPos(objID));
		vec3 rotv = getRotation(objID);
		rotateX(modelMat,PI / 180.0 * rotv.x);
		rotateY(modelMat,PI / 180.0 * rotv.y);
		rotateZ(modelMat,PI / 180.0 * rotv.z);
		scale(modelMat, getScale(objID));

		temp.model = modelMat;
		temp.invModel = inversemat(temp.model);
		temp.transInvModel = transposemat(temp.invModel);

		if(temp.objType == 0){

			hitPointDistance = intersectSphere(temp, ray.origin, ray.direction, t, tempNormal, tempIntersectionPoint);

		} else if(temp.objType == 1) {

			hitPointDistance = intersectPlane(temp, ray.origin, ray.direction, t, tempNormal, tempIntersectionPoint);

		} else if(temp.objType == 2) {

			hitPointDistance = intersectCube(temp, ray.origin, ray.direction, t, tempNormal, tempIntersectionPoint);

		} else if(temp.objType == 3) {
//			hitPointDistance = intersectCube(temp, ray.origin, ray.direction, t, tempNormal, tempIntersectionPoint);
			temp.meshID = getMeshID(objID);
			hitPointDistance = intersectMesh(temp, ray.origin, ray.direction, t, tempNormal, tempIntersectionPoint);

		}


		if(hitPointDistance > 0.0 && hitPointDistance < closestIntersectionDistance){
			int materialID = getMaterialID(objID);

			temp.color = getColor(materialID);

			temp.reflective = getReflective(materialID);
			temp.reflectivity = getReflectivity(materialID);
			temp.refractive = getRefractive(materialID);
			temp.IOR = getIOR(materialID);

			temp.emittance = getEmittance(materialID);
			temp.subsurfaceScatter = getSubsurfaceScatter(materialID);

			closestIntersectionDistance = hitPointDistance;
			intersect.intersectDistance = hitPointDistance;
			intersect.intersectPos = tempIntersectionPoint;
			intersect.intersectNormal = tempNormal;
			intersect.intersectObj = temp;
		}
	}

	if (closestIntersectionDistance < INF_F-0.1)
		return true;
	else
		return false;
}

bool intersectRootBVH(int rootBVHNodeID, inout Ray ray, inout Intersection finalIntersect){

	float tmin, tmax;
    int stack[64];
    int stackTop = -1;
	float closestIntersectionDistance = INF_F;

    stack[++stackTop] = rootBVHNodeID;

//	Intersection intersect;
//	intersectObjs(1, 7, ray, intersect);
//	finalIntersect = intersect;

    while(stackTop >= 0) {
        int nodeID = stack[stackTop--];
        vec3 minAABB = getMin(nodeID);
        vec3 maxAABB = getMax(nodeID);

        if(intersectAABB(ray, minAABB, maxAABB, tmin, tmax)) {
            vec2 children = getChildren(nodeID);
            int leftChild = int(children.x);
            int rightChild = int(children.y);

			if(leftChild < 0 && rightChild < 0) {

				int start = int(getElementIDMap(nodeID).x);
				int end = start + int(getElementIDMap(nodeID).y);

				Intersection intersect;
				intersectObjs(start, end, ray, intersect);

				if(intersect.intersectDistance > 0.0 && intersect.intersectDistance < closestIntersectionDistance){
					closestIntersectionDistance = intersect.intersectDistance;
					finalIntersect = intersect;
				}

			} else {

				if(leftChild >= 0) {
					stack[++stackTop] = leftChild;
				}

				if(rightChild >= 0) {
					stack[++stackTop] = rightChild;
				}
			}

        }
    }

	if (closestIntersectionDistance < INF_F - 0.01)
		return true;
	else
		return false;
}

const int depth = 10;
vec3 pathTrace(inout Ray ray, inout vec3 outColor){

	vec3 colorMask = vec3(1.0);

    float shift = 0.01;
	for (int i = 0; i < depth; ++i) {

		Intersection intersect;
        float seed = time + float(i);

//		if (intersectObjs(0, 0+objNums, ray, intersect)) {
		if (intersectRootBVH(rootBVH, ray, intersect)) {

			// 光源物体
			if(intersect.intersectObj.emittance > 0.0){
//				if(i<=1){//粗暴的隐藏光源方法
//					Ray newRay = ray;
//					newRay.origin = intersect.intersectPos + shift * newRay.direction;
//					ray = newRay;
//					continue;
//				}
				colorMask = colorMask * intersect.intersectObj.color * intersect.intersectObj.emittance;
				outColor = colorMask;
			    return outColor;
			}

			Ray newRay = ray;

			// 非光源物体
			if (intersect.intersectObj.refractive == 0 && intersect.intersectObj.reflective == 0){ // 仅漫反射

				colorMask *= intersect.intersectObj.color;
//				outColor = colorMask;

				newRay.direction = normalize(calculateRandomDirectionInHemisphere(intersect.intersectNormal, initRayDirection, seed + randOnVec2(intersect.intersectPos.xy)));
                newRay.origin = intersect.intersectPos + newRay.direction * shift;

			} else { // 有反射或折射

				vec3 noiseVec3 = vec3(randOnVec2(intersect.intersectPos.yz),randOnVec2(intersect.intersectNormal.xz),randOnVec2(intersect.intersectNormal.xy));
				float randomNum = randOnVec3WithNoiseAndSeed(ray.direction, noiseVec3, seed+0.5);

				if(intersect.intersectObj.refractive > 0) { // 折射，且有折射必有反射

					// 判断入射光线是否从物体内部射出
					bool isInsideOut = dot(ray.direction,intersect.intersectNormal) > 0.0; //out:> 0.0 true,in :<=0.0  false

					float oldIOR = ray.IOR;
					float newIOR = intersect.intersectObj.IOR;

					// float reflectRange = -1.0;
					float IORratio = oldIOR/newIOR;
					vec3 reflectDirection = reflect(ray.direction, intersect.intersectNormal);
					vec3 refractDirection = refract(ray.direction, intersect.intersectNormal, IORratio);

					Fresnel fresnel = calculateFresnel(intersect.intersectNormal, ray.direction, oldIOR, newIOR);

					float reflectRange = fresnel.reflectionCoefficient;

					vec3 noiseVec3 = vec3(randOnVec2(intersect.intersectPos.xy),randOnVec2(intersect.intersectPos.xz),randOnVec2(intersect.intersectPos.yz));
					float randomnum = randOnVec3WithNoiseAndSeed(initRayDirection, noiseVec3, seed);

					if(randomnum < reflectRange){
						newRay.direction = reflectDirection;
						if(intersect.intersectObj.reflectivity < 1.0){
							newRay.direction = reflectDiffuseRandom(newRay.direction, intersect.intersectObj.reflectivity, initRayDirection, seed + randOnVec2(intersect.intersectPos.yz));
						}
						newRay.origin = intersect.intersectPos + shift * newRay.direction;

						if(intersect.intersectObj.subsurfaceScatter > 0){
							float random = randOnVec2(intersect.intersectPos.xy);
							colorMask *= subScatterFS(intersect, random);
						}

					} else {
						newRay.direction = refractDirection;
						if(intersect.intersectObj.reflectivity < 1.0){
							newRay.direction = reflectDiffuseRandom(newRay.direction, intersect.intersectObj.reflectivity, initRayDirection, seed + randOnVec2(intersect.intersectPos.yz));
						}
						newRay.origin = intersect.intersectPos + shift * newRay.direction;
					}

//                    if(isInsideOut) //out object
//                        newRay.IOR = 1.0;
//                    else //into object
//                        newRay.IOR = newIOR;

					if(isInsideOut) //out object
						newRay.IOR /= newIOR;
					else //into object
						newRay.IOR *= newIOR;

					colorMask *= intersect.intersectObj.color;
					// outColor = colorMask;

				} else if(intersect.intersectObj.reflective > 0) { // 反射

					if(intersect.intersectObj.subsurfaceScatter > 0){
						float random = randOnVec2(intersect.intersectPos.xy);
						colorMask *= subScatterFS(intersect,random);
					}
					colorMask *= intersect.intersectObj.color;
					// outColor = colorMask;
					newRay.IOR = 1.0;

					newRay.direction = reflect(ray.direction, intersect.intersectNormal);
					if(intersect.intersectObj.reflectivity < 1.0){
						newRay.direction = reflectDiffuseRandom(newRay.direction, intersect.intersectObj.reflectivity, initRayDirection, seed + randOnVec2(intersect.intersectPos.yz));
					}
					newRay.origin = intersect.intersectPos + shift * newRay.direction;
				}


            }

			ray = newRay;

		} else {
			vec3 envColor = texture(envTexture, vec2(0.5 + atan(ray.direction.z, ray.direction.x) / (2.0 * PI), 0.5 - asin(ray.direction.y) / PI)).rgb;
			outColor = colorMask * envColor;
			return outColor;
		}
	}

  	outColor = vec3(0.0,0.0,0.0);
	return outColor;
}

void main(void){

	Ray ray;
	ray.origin = cameraPos.xyz;
	ray.direction = normalize(initRayDirection);
	ray.IOR = 1.0;

    float dis = (0.0 - cameraPos.z)/ ray.direction.z;
    vec3 initPixelVec = ray.origin + dis * ray.direction;

    if(enableSSAA>0){ //jitter
		float r1 = sin(randOnVec3WithNoiseAndSeed(initRayDirection, ray.direction*vec3(12.9898, 78.233, 151.7182), time));
		float r2 = cos(randOnVec3WithNoiseAndSeed(initRayDirection, ray.direction*vec3(63.7264, 10.873, 623.6736), time));
        float u = r1/2.0/displayBufferTextureWidth;
        float v = r2/2.0/displayBufferTextureHeight;
        initPixelVec += vec3(u,v,0.0);
        ray.direction = normalize( initPixelVec - cameraPos);
	}

	vec3 finalColor = vec3(0.0);

	pathTrace(ray, finalColor); // path tracing

	vec3 previousColor = texture(displayBufferTexture, vec2(gl_FragCoord.x / displayBufferTextureWidth,gl_FragCoord.y / displayBufferTextureHeight) ).rgb;
	fragColor = vec4(mix( finalColor, previousColor, iterations / ( iterations + 1.0 )), 1.0);

//	fragColor = texture(envTexture, vec2(gl_FragCoord.x / displayBufferTextureSize.x,gl_FragCoord.y / displayBufferTextureSize.y) ).rgba;
}