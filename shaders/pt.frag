precision highp float;

#define PI 3.1415926585

uniform float time;
uniform int objNums;
uniform vec3 cameraPos;
uniform int enableSSAA;

uniform float iterations;
uniform sampler2D displayBufferTexture;
uniform sampler2D objAttributesTexture;

uniform vec2 displayBufferTextureSize;
uniform vec2 objAttributesTextureSize;

//varying vec2 texCoord;
varying vec3 initRayDirection;

const int MAX_OBJ_NUM = 30;

/*For Intersect Detection*/
vec3 getPointOnRay(Ray ray, float dis){
  return ray.origin + (dis - 0.0001) * normalize(ray.direction);
}

float intersectSphere(Object g, vec3 rStart, vec3 rDir, out float t,  out vec3 normal, out vec3 pos) {
    float radius = 0.5;
    vec3 ro = (g.invmodel * vec4(rStart,1.0)).xyz;
    vec3 rd = (normalize(g.invmodel * vec4(rDir,0.0))).xyz;

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
	normal = sign*normalize((realIntersectionPoint - realOrigin));

    return length(rStart - realIntersectionPoint);
}

float intersectCube(Object g, vec3 rStart, vec3 rDir, out float t, out vec3 normal, out vec3 pos){
    vec3 ro = (g.invmodel * vec4(rStart,1.0)).xyz;
    vec3 rd = (normalize(g.invmodel * vec4(rDir,0.0))).xyz;


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
    normal = sign * normalize((g.transinvmodel * vec4(normal,0.0)).xyz);
    return length(rStart - realIntersectionPoint);
}

float intersectPlane(Object g, vec3 rStart, vec3 rDir, out float t,  out vec3 normal, out vec3 pos) {	//on xz plane, normal: +y
	normal = vec3(0.0, 1.0, 0.0);

    vec3 ro = (g.invmodel * vec4(rStart,1.0)).xyz;
    vec3 rd = (normalize(g.invmodel * vec4(rDir,0.0))).xyz;

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

	normal = normalize((g.transinvmodel * vec4(normal,0.0)).xyz);

	return length(rStart - realIntersectionPoint);
}

bool intersectWorld(Ray r, inout Intersection intersect) {
    float objAttributesTextureWidth = objAttributesTextureSize.x;
    float objAttributesTextureHeight = objAttributesTextureSize.y;

	float t;
	float hitPointDistance = -1.0;
	float closestIntersectionDistance = 100000.0;
	vec3 tempNormal = vec3(0);
	vec3 tempIntersectionPoint = vec3(0);

	for(int i =0;i<MAX_OBJ_NUM;i++){
        if(i>=objNums)
           break;

        Object temp;
        float fix = float(i);
        float fiy = 0.0;

        temp.type = int(5.0 * texture2D(objAttributesTexture, vec2((7.0 * fix + 1.0)/objAttributesTextureWidth,fiy/objAttributesTextureHeight)).r);
        mat4 modelview = mat4(1.0);
        translate(modelview,20.0 * (texture2D(objAttributesTexture, vec2((7.0 * fix + 4.0)/objAttributesTextureWidth,fiy/objAttributesTextureHeight)).rgb-0.5));
        vec3 rotv =  texture2D(objAttributesTexture, vec2((7.0 * fix + 5.0)/objAttributesTextureWidth,fiy/objAttributesTextureHeight)).rgb;
        rotateX(modelview,360.0 * PI / 180.0 * rotv.x);
        rotateY(modelview,360.0 * PI / 180.0 * rotv.y);
        rotateZ(modelview,360.0 * PI / 180.0 * rotv.z);
        scale(modelview,10.0 * texture2D(objAttributesTexture, vec2((7.0 * fix + 6.0)/objAttributesTextureWidth,fiy/objAttributesTextureHeight)).rgb);
        temp.model = modelview;
        temp.invmodel = inversemat(temp.model);
        temp.transinvmodel = transposemat(temp.invmodel);


		if(temp.type == 0){

			hitPointDistance = intersectSphere(temp, r.origin, r.direction, t, tempNormal, tempIntersectionPoint);

		} else if(temp.type == 1) {

		    hitPointDistance = intersectPlane(temp, r.origin, r.direction, t, tempNormal, tempIntersectionPoint);

        } else {

		    hitPointDistance = intersectCube(temp, r.origin, r.direction, t, tempNormal, tempIntersectionPoint);

        }


		if(hitPointDistance > 0.0 && hitPointDistance < closestIntersectionDistance){
                temp.color = texture2D(objAttributesTexture, vec2((7.0 * fix)/objAttributesTextureWidth,0.0/objAttributesTextureHeight)).rgb;
                //temp.textureType = int(5.0 * texture2D(objAttributesTexture, vec2((7.0 * fix + 1.0)/attw,fiy/atth)).g);

                temp.reflective = int(1.0 * texture2D(objAttributesTexture, vec2((7.0 * fix + 2.0)/objAttributesTextureWidth,fiy/objAttributesTextureHeight)).r);
                temp.refractive = int(1.0 * texture2D(objAttributesTexture, vec2((7.0 * fix + 2.0)/objAttributesTextureWidth,fiy/objAttributesTextureHeight)).g);
                temp.reflectivity = texture2D(objAttributesTexture, vec2((7.0 * fix + 2.0)/objAttributesTextureWidth,fiy/objAttributesTextureHeight)).b;

                temp.IOR = max(3.0 * texture2D(objAttributesTexture, vec2((7.0 * fix + 3.0)/objAttributesTextureWidth,fiy/objAttributesTextureHeight)).r, 1.0);
                temp.subsurfaceScatter = int(texture2D(objAttributesTexture, vec2((7.0 * fix + 3.0)/objAttributesTextureWidth,fiy/objAttributesTextureHeight)).g);
                temp.emittance = int(25.0 * texture2D(objAttributesTexture, vec2((7.0 * fix + 3.0)/objAttributesTextureWidth,fiy/objAttributesTextureHeight)).b);

				closestIntersectionDistance = hitPointDistance;
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

		if (intersectWorld(ray, intersect)) {

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
		float r2 = cos(randOnVec3WithNoiseAndSeed(initRayDirection, ray.direction*vec3(63.7264, 10.873, 623.6736), time + 1.0));
        float u = r1/2.0/displayBufferTextureSize.r;
        float v = r2/2.0/displayBufferTextureSize.g;
        initPixelVec += vec3(u,v,0.0);
        ray.direction = normalize( initPixelVec - cameraPos);
    }

	vec3 finalColor = vec3(0.0);

	pathTrace(ray, finalColor); // path tracing

	vec3 previousColor = texture2D(displayBufferTexture, vec2(gl_FragCoord.x / displayBufferTextureSize.x,gl_FragCoord.y / displayBufferTextureSize.y) ).rgb;
	gl_FragColor = vec4(mix( finalColor/5.0, previousColor, iterations / ( iterations + 1.0 )), 1.0);

}