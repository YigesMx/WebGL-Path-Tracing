precision highp float;

in vec2 vertexPos;
uniform vec3 cameraPos;
uniform mat4 invVP;

uniform float time;

uniform int enableSSAA;
uniform float SSAA_Scale;
uniform vec2 displayBufferTextureSize;
#define displayBufferTextureWidth displayBufferTextureSize.x
#define displayBufferTextureHeight displayBufferTextureSize.y

out vec3 initRayDirection;
//varying vec2 texCoord;

void main(void){

    gl_Position = vec4(vertexPos, 0.0, 1.0);

    vec2 pos_propotion = vertexPos.xy * 0.5 + 0.5;

    vec3 ray00 = ((invVP* vec4(-1.0, -1.0, 0.0, 1.0))/(invVP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - cameraPos;
    vec3 ray01 = ((invVP* vec4(-1.0, 1.0, 0.0, 1.0))/(invVP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - cameraPos;
    vec3 ray10 = ((invVP* vec4(1.0, -1.0, 0.0, 1.0))/(invVP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - cameraPos;
    vec3 ray11 = ((invVP* vec4(1.0, 1.0, 0.0, 1.0))/(invVP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - cameraPos;

    if(enableSSAA>0){ // jitter

        float random1 = randOnVec3WithNoiseAndSeed(vec3(pos_propotion, 0.0), vec3(pos_propotion, 0.5)*vec3(12.9898, 78.233, 151.7182), time) - 0.5;
        float random2 = randOnVec3WithNoiseAndSeed(vec3(pos_propotion, 1.0), vec3(pos_propotion, 0.5)*vec3(63.7264, 10.873, 623.6736), time) - 0.5;
        float u = random1*SSAA_Scale/displayBufferTextureWidth;
        float v = random2*SSAA_Scale/displayBufferTextureHeight;

        pos_propotion += vec2(u,v);
    }

    //    texCoord = vec2(pos_propotion);
    initRayDirection = mix(mix(ray00, ray01, pos_propotion.y), mix(ray10, ray11, pos_propotion.y), pos_propotion.x);
}