precision highp float;

attribute vec2 vertexPos;
uniform vec3 cameraPos;
uniform mat4 invVP;

varying vec3 initRayDirection;
//varying vec2 texCoord;

void main(void){

    gl_Position = vec4(vertexPos, 0.0, 1.0);

    vec2 pos_propotion = vertexPos.xy * 0.5 + 0.5;

    vec3 ray00 = ((invVP* vec4(-1.0, -1.0, 0.0, 1.0))/(invVP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - cameraPos;
    vec3 ray01 = ((invVP* vec4(-1.0, 1.0, 0.0, 1.0))/(invVP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - cameraPos;
    vec3 ray10 = ((invVP* vec4(1.0, -1.0, 0.0, 1.0))/(invVP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - cameraPos;
    vec3 ray11 = ((invVP* vec4(1.0, 1.0, 0.0, 1.0))/(invVP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - cameraPos;

//    texCoord = vec2(pos_propotion);
    initRayDirection = mix(mix(ray00, ray01, pos_propotion.y), mix(ray10, ray11, pos_propotion.y), pos_propotion.x);
}