#version 300 es

precision highp float;

#ifndef PI
#define PI 3.1415926535
#endif
#ifndef EPS
#define EPS 0.00001
#endif

/* Classes */

struct Ray {
    vec3 origin;
    vec3 direction;
    float IOR; // index of refraction 即折射率
};

struct Object {
    int objType;

    mat4 model;
    mat4 invModel;
    mat4 transInvModel;

    int meshID;

    vec3 color;

    int reflective;
    float reflectivity;
    int refractive;
    float IOR; // indexOfRefraction

    float emittance;
    int subsurfaceScatter;
};

struct Intersection {
    vec3 intersectPos;
    vec3 intersectNormal;
    float intersectDistance;
};

struct Triangle {
    mat3 vertex;
    mat3 vertexNormal;
};

/* Mat Utility Functions */
void translate(inout mat4 origin,in vec3 dir) {
    mat4 trans = mat4(1.0,0.0,0.0,0.0,
    0.0,1.0,0.0,0.0,
    0.0,0.0,1.0,0.0,
    dir.x,dir.y,dir.z,1.0);
    origin =  origin * trans;
}

void scale(inout mat4 origin,in vec3 scalev) {
    mat4 scale = mat4(scalev.x,0.0,0.0,0.0,
    0.0,scalev.y,0.0,0.0,
    0.0,0.0,scalev.z,0.0,
    0.0,0.0,0.0,1.0);
    origin =  origin * scale;
}

void rotateX (inout mat4 origin, in float angle) {
    mat4 dest = origin;
    float s = sin(angle), c = cos(angle),
    a10 = origin[1][0], a11 = origin[1][1], a12 = origin[1][2], a13 = origin[1][3],
    a20 = origin[2][0], a21 = origin[2][1], a22 = origin[2][2], a23 = origin[2][3];

    dest[1][0] = a10 * c + a20 * s; dest[1][1] = a11 * c + a21 * s;
    dest[1][2] = a12 * c + a22 * s; dest[1][3] = a13 * c + a23 * s;
    dest[2][0] = a10 * -s + a20 * c; dest[2][1] = a11 * -s + a21 * c;
    dest[2][2] = a12 * -s + a22 * c; dest[2][3] = a13 * -s + a23 * c;

    origin = dest;
    return;
}

void rotateY  (inout mat4 origin, in float angle) {
    mat4 dest = origin;
    float s = sin(angle),c = cos(angle),
    a00 = origin[0][0],a01 = origin[0][1],a02 = origin[0][2],a03 = origin[0][3],
    a20 = origin[2][0],a21 = origin[2][1],a22 = origin[2][2],a23 = origin[2][3];

    dest[0][0] = a00 * c + a20 * -s; dest[0][1] = a01 * c + a21 * -s;
    dest[0][2] = a02 * c + a22 * -s; dest[0][3] = a03 * c + a23 * -s;
    dest[2][0] = a00 * s + a20 * c; dest[2][1] = a01 * s + a21 * c;
    dest[2][2] = a02 * s + a22 * c; dest[2][3] = a03 * s + a23 * c;

    origin = dest;
    return;
}

void rotateZ (inout mat4 origin, in float angle) {
    mat4 dest = origin;
    float s = sin(angle),c = cos(angle),
    a00 = origin[0][0], a01 = origin[0][1], a02 = origin[0][2], a03 = origin[0][3],
    a10 = origin[1][0], a11 = origin[1][1], a12 = origin[1][2], a13 = origin[1][3];

    dest[0][0] = a00 * c + a10 * s; dest[0][1] = a01 * c + a11 * s;
    dest[0][2] = a02 * c + a12 * s; dest[0][3] = a03 * c + a13 * s;

    dest[1][0] = a00 * -s + a10 * c; dest[1][1] = a01 * -s + a11 * c;
    dest[1][2] = a02 * -s + a12 * c; dest[1][3] = a03 * -s + a13 * c;

    origin = dest;
    return;
}

mat4 inversemat(in mat4 mat) {
    mat4 dest = mat4(1.0);
    float a00 = mat[0][0], a01 = mat[0][1], a02 = mat[0][2], a03 = mat[0][3],
    a10 = mat[1][0], a11 = mat[1][1], a12 = mat[1][2], a13 = mat[1][3],
    a20 = mat[2][0], a21 = mat[2][1], a22 = mat[2][2], a23 = mat[2][3],
    a30 = mat[3][0], a31 = mat[3][1], a32 = mat[3][2], a33 = mat[3][3],
    b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10,
    b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
    b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
    b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
    b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31,
    b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32,
    d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
    invDet;

    if (d<0.000001) { return mat4(1.0);}
    invDet = 1.0 / d;

    dest[0][0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet; dest[0][1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
    dest[0][2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet; dest[0][3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
    dest[1][0] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet; dest[1][1] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
    dest[1][2] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet; dest[1][3] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
    dest[2][0] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet; dest[2][1] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
    dest[2][2] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet; dest[2][3] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
    dest[3][0] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet; dest[3][1] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
    dest[3][2] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet; dest[3][3] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;

    return dest;
}

mat4 transposeMat(in mat4 mat) {
    mat4 dest = mat4(1.0);
    dest[0][0] = mat[0][0]; dest[0][1] = mat[1][0]; dest[0][2] = mat[2][0]; dest[0][3] = mat[3][0];
    dest[1][0] = mat[0][1]; dest[1][1] = mat[1][1]; dest[1][2] = mat[2][1]; dest[1][3] = mat[3][1];
    dest[2][0] = mat[0][2]; dest[2][1] = mat[1][2]; dest[2][2] = mat[2][2]; dest[2][3] = mat[3][2];
    dest[3][0] = mat[0][3]; dest[3][1] = mat[1][3]; dest[3][2] = mat[2][3]; dest[3][3] = mat[3][3];
    return dest;
}


/* For Random */
float randOnVec3WithNoiseAndSeed(vec3 rVec3, vec3 noise, float seed) {
    return fract(sin(dot(rVec3 + seed, noise)) * 43758.5453 + seed);
}

highp float randOnVec2(vec2 rVec2) {
    highp float a = 12.9898,b = 78.233,c = 43758.5453,dt= dot(rVec2.xy ,vec2(a,b)),sn= mod(dt,PI);
    return fract(sin(sn) * c);
}

/* For Diffusion */
vec3 calculateRandomDirectionInHemisphere(vec3 normal, vec3 rVec3, float seed) { // 在法线方向上选取一个半球面进行光线方向的随机选取

    float u = randOnVec3WithNoiseAndSeed(rVec3, vec3(12.9898, 78.233, 151.7182), seed);
    float v = randOnVec3WithNoiseAndSeed(rVec3, vec3(63.7264, 10.873, 623.6736), seed);

    float up = sqrt(u);
    float over = sqrt(1.0 - up * up);
    float around = v * 3.141592 * 2.0;

    vec3 directionNotNormal;
    if (abs(normal.x) < 0.577350269189) {
        directionNotNormal = vec3(1, 0, 0);
    } else if (abs(normal.y) < 0.577350269189) {
        directionNotNormal = vec3(0, 1, 0);
    } else {
        directionNotNormal = vec3(0, 0, 1);
    }

    vec3 perpendicularDirection1 = normalize(cross(normal, directionNotNormal));
    vec3 perpendicularDirection2 = normalize(cross(normal, perpendicularDirection1));

    return ( up * normal ) + ( cos(around) * over * perpendicularDirection1 ) + ( sin(around) * over * perpendicularDirection2 );
}

/* For Refraction */
struct Fresnel {
    float reflectionCoefficient;
    float transmissionCoefficient;
};

Fresnel calculateFresnel(vec3 normal, vec3 incident, float incidentIOR, float transmittedIOR) {
    Fresnel fresnel;
    incident = normalize(incident);
    normal = normalize(normal);
    float cosThetaI = abs(dot(normal, incident));
    float sinIncidence = sqrt(1.0-pow(cosThetaI,2.0));
    float cosThetaT = sqrt(1.0-pow(((incidentIOR/transmittedIOR)*sinIncidence),2.0));
    if (cosThetaT <= 0.0 ) {
        fresnel.reflectionCoefficient = 1.0;
        fresnel.transmissionCoefficient = 0.0;
        return fresnel;
    }else{

        float RsP = pow( (incidentIOR * cosThetaI - transmittedIOR * cosThetaT) / (incidentIOR * cosThetaI + transmittedIOR * cosThetaT) , 2.0);
        float RpP = pow( (incidentIOR * cosThetaT - transmittedIOR * cosThetaI) / (incidentIOR * cosThetaT + transmittedIOR * cosThetaI) , 2.0);
        fresnel.reflectionCoefficient = (RsP + RpP) / 2.0;
        fresnel.transmissionCoefficient = 1.0 - fresnel.reflectionCoefficient;
        return fresnel;
    }
}

/* For Reflectivity & Roughness */
vec3 reflectDiffuseRandom(in vec3 direction, in float reflectivity, in vec3 rVec3, in float seed) { // 在方向上再选取一个半球面进行光线方向的随机选取
    vec3 randomDirection = normalize(calculateRandomDirectionInHemisphere(direction, rVec3, seed + 0.7));
    vec3 scale = vec3(- log(1.0 + EPS - reflectivity) + 0.0001);
    vec3 newDirection = normalize(direction*scale + randomDirection);
    return newDirection;
}

/* For Subsurface Scattering */
float halfLambert(in vec3 vect1, in vec3 vect2) {
    float product = dot(vect1,vect2);
    return product * 0.5 + 0.5;
}

float blinnPhongSpecular(in vec3 normalVec, in vec3 lightVec, in float specPower) {
    vec3 halfAngle = normalize(normalVec + lightVec);
    return pow(clamp(0.0,1.0,dot(normalVec,halfAngle)),specPower);
}


vec3 subScatterFS(in Intersection intersect, in Object obj, in float seed) { // TODO: 目前这个是写死的模拟次表面散射，考虑能否改为通过 pt和材质动态 计算的。

    float RimScalar = 1.0;
    float MaterialThickness = 0.5;
    vec3 ExtinctionCoefficient = vec3(1.0,1.0,1.0);
    vec3 SpecColor = vec3(1.0,1.0,1.0);
    vec3 lightPoint = vec3(-3.5, 4.0, 5.0);

    float attenuation = 10.0 * (1.0 / distance(lightPoint,intersect.intersectPos));
    vec3 eVec = normalize(intersect.intersectPos);
    vec3 lVec = normalize(lightPoint - intersect.intersectPos);
    vec3 wNorm = normalize(intersect.intersectNormal);

    vec3 dotLN = vec3(halfLambert(lVec,wNorm) * attenuation);
    dotLN *= obj.color;

    vec3 indirectLightComponent = vec3(MaterialThickness * max(0.0,dot(-wNorm,lVec)));
    indirectLightComponent += MaterialThickness * halfLambert(-eVec,lVec);
    indirectLightComponent *= attenuation;
    indirectLightComponent.r *= ExtinctionCoefficient.r;
    indirectLightComponent.g *= ExtinctionCoefficient.g;
    indirectLightComponent.b *= ExtinctionCoefficient.b;

    vec3 rim = vec3(1.0 - max(0.0,dot(wNorm,eVec)));
    rim *= rim;
    rim *= max(0.0,dot(wNorm,lVec)) * SpecColor.rgb;

    vec4 finalCol = vec4(dotLN,1.0) + vec4(indirectLightComponent,1.0);
    finalCol.rgb += (rim * RimScalar * attenuation * finalCol.a);
    float SpecularPower = 15.0;
    finalCol.rgb += vec3(blinnPhongSpecular(wNorm,lVec,SpecularPower) * attenuation * SpecColor * finalCol.a * 0.1);
    finalCol.rgb *= vec3(1.0);

    return finalCol.rgb;
}