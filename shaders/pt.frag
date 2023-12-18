precision highp float;

#define PI 3.14159265358979323846264
#define INF 2147483647
#define INF_F 2147483647.0

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

//varying vec2 texCoord;
in vec3 initRayDirection;

out vec4 fragColor;

const int MAX_OBJ_NUM = 30;

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

int getInverseNormal(int objID){
	vec2 coord = getObjAttributeTextureCoord(objID*objSectionsPerObj+2);
	return int(texture(objAttributesTexture, vec2(coord.x/objAttributesTextureWidth,coord.y/objAttributesTextureHeight)).w);
}

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

int getEmittance(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial+2);
	return int(texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).x);
}

int getSubsurfaceScatter(int materialID){
	vec2 coord = getMaterialAttributeTextureCoord(materialID*materialSectionsPerMaterial+2);
	return int(texture(materialAttributesTexture, vec2(coord.x/materialAttributesWidth,coord.y/materialAttributesHeight)).y);
}

//bool intersectObjs(const int start, const int end, Ray ray, inout Intersection intersect) {
//
//	float t;
//	float hitPointDistance = -1.0;
//	float closestIntersectionDistance = INF_F;
//	vec3 tempNormal = vec3(0);
//	vec3 tempIntersectionPoint = vec3(0);
//
////	for(int it = 0; it<MAX_OBJ_NUM; it++){ // for glsl es 2.0
////		int objID = start + it;
////		if(objID >= end) break;
//	for(int objID = start; objID<end; objID++){
//
//        Object temp;
//        float fix = float(objID);
//        float fiy = 0.0;
//
//		temp.objType = getObjType(objID);
//
//		mat4 modelMat = mat4(1.0);
//        translate(modelMat, getPos(objID));
//        vec3 rotv = getRotation(objID);
//        rotateX(modelMat,PI / 180.0 * rotv.x);
//        rotateY(modelMat,PI / 180.0 * rotv.y);
//        rotateZ(modelMat,PI / 180.0 * rotv.z);
//        scale(modelMat, getScale(objID));
//
//        temp.model = modelMat;
//		temp.invModel = inversemat(temp.model);
//        temp.transInvModel = transposemat(temp.invModel);
//
//		if(temp.objType == 0){
//
//			hitPointDistance = intersectSphere(temp, ray.origin, ray.direction, t, tempNormal, tempIntersectionPoint);
//
//		} else if(temp.objType == 1) {
//
//		    hitPointDistance = intersectPlane(temp, ray.origin, ray.direction, t, tempNormal, tempIntersectionPoint);
//
//        } else {
//
//		    hitPointDistance = intersectCube(temp, ray.origin, ray.direction, t, tempNormal, tempIntersectionPoint);
//
//        }
//
//		temp.inverseNormal = getInverseNormal(objID);
//
//		if(temp.inverseNormal > 0)
//			tempNormal = -tempNormal;
//
//		if(hitPointDistance > 0.0 && hitPointDistance < closestIntersectionDistance){
//			int materialID = getMaterialID(objID);
//
//			temp.color = getColor(materialID);
//
//			temp.reflective = getReflective(materialID);
//			temp.reflectivity = getReflectivity(materialID);
//			temp.refractive = getRefractive(materialID);
//			temp.IOR = getIOR(materialID);
//
//			temp.emittance = getEmittance(materialID);
//			temp.subsurfaceScatter = getSubsurfaceScatter(materialID);
//
//			closestIntersectionDistance = hitPointDistance;
//			intersect.intersectDistance = hitPointDistance;
//			intersect.intersectPos = tempIntersectionPoint;
//			intersect.intersectNormal = tempNormal;
//			intersect.intersectObj = temp;
//		}
//	}
//
//	if (closestIntersectionDistance > -1.0)
//		return true;
//	else
//		return false;
//}

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

bool intersectObjs(const int elementStart, const int elementEnd, Ray ray, inout Intersection intersect) {

	float t;
	float hitPointDistance = -1.0;
	float closestIntersectionDistance = INF_F;
	vec3 tempNormal = vec3(0);
	vec3 tempIntersectionPoint = vec3(0);

	//	for(int it = 0; it<MAX_OBJ_NUM; it++){ // for glsl es 2.0
	//		int objID = start + it;
	//		if(objID >= end) break;
	for(int element = elementStart; element<elementEnd; element++){

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

		} else {

			hitPointDistance = intersectCube(temp, ray.origin, ray.direction, t, tempNormal, tempIntersectionPoint);

		}

		temp.inverseNormal = getInverseNormal(objID);

		if(temp.inverseNormal > 0)
		tempNormal = -tempNormal;

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

	if (closestIntersectionDistance > -1.0)
		return true;
	else
		return false;
}

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

bool intersectRootBVH(int rootBVHNodeID, inout Ray ray, inout Intersection finalIntersect){

	float tmin, tmax;
    int stack[64];
    int stackTop = -1;
	float closestIntersectionDistance = INF_F;

    stack[++stackTop] = rootBVHNodeID;

//	Intersection intersect;
//	intersectObjs(0, 11, ray, intersect);
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

	if (closestIntersectionDistance > -1.0)
		return true;
	else
		return false;
}

const int depth = 5;
vec3 pathTrace(inout Ray ray, inout vec3 outColor){

	vec3 colorMask = vec3(1.0);
//	float incidentIOR = 1.0;
//	float transmittedIOR = 1.0;
//	bool internalReflection = false;
//	bool reflective = false;
//	bool refractive = false;

    float shift = 0.01;
	for (int i = 0; i < depth; ++i) {

		Intersection intersect;
        float seed = time + float(i);

//		if (intersectObjs(0, 0+objNums, ray, intersect)) {
		if (intersectRootBVH(rootBVH, ray, intersect)) {

			// 光源物体
			if(intersect.intersectObj.emittance > 0){
				colorMask = colorMask * intersect.intersectObj.color * float(intersect.intersectObj.emittance);
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

                    vec3 randomvec3 = vec3(randOnVec2(intersect.intersectPos.xy),randOnVec2(intersect.intersectPos.xz),randOnVec2(intersect.intersectPos.yz)) ;
                    float randomnum = randOnVec3WithNoiseAndSeed(initRayDirection, randomvec3, seed);

                    if(randomnum < reflectRange){
                        newRay.direction = reflectDirection;
                        newRay.origin = intersect.intersectPos + shift * newRay.direction;

						if(intersect.intersectObj.subsurfaceScatter > 0){
							float random = randOnVec2(intersect.intersectPos.xy);
							colorMask *= subScatterFS(intersect, random);
						}

                    } else {
                        newRay.direction = refractDirection;
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
                    //outColor = colorMask;

                } else if(intersect.intersectObj.reflective > 0) { // 反射

                    if(intersect.intersectObj.subsurfaceScatter > 0)
                    {
                        float random = randOnVec2(intersect.intersectPos.xy);
                        colorMask *= subScatterFS(intersect,random);
                    }
                    colorMask *= intersect.intersectObj.color;
                    //outColor = colorMask;
                    newRay.IOR = 1.0;

                    newRay.direction = reflect(ray.direction, intersect.intersectNormal);
                    newRay.origin = intersect.intersectPos + shift * newRay.direction;
                }
            }

			ray = newRay;

		} else { // 未与任何物体相交(与环境相交）

			outColor = vec3(0.0,0.0,0.0);
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
        float u = r1/displayBufferTextureWidth;
        float v = r2/displayBufferTextureHeight;
        initPixelVec += vec3(u,v,0.0);
        ray.direction = normalize( initPixelVec - cameraPos);
	}

	vec3 finalColor = vec3(0.0);

	pathTrace(ray, finalColor); // path tracing

	vec3 previousColor = texture(displayBufferTexture, vec2(gl_FragCoord.x / displayBufferTextureWidth,gl_FragCoord.y / displayBufferTextureHeight) ).rgb;
	fragColor = vec4(mix( finalColor/5.0, previousColor, iterations / ( iterations + 1.0 )), 1.0);

	//fragColor = texture(bvhsAttributesTexture, vec2(gl_FragCoord.x / displayBufferTextureSize.x,gl_FragCoord.y / displayBufferTextureSize.y) ).rgba;
}