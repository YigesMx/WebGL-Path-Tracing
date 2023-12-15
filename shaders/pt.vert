precision highp float;

attribute vec2 aVertex;
uniform vec3 vcameraPos;
uniform mat4 u_vInvMP;

varying vec3 InitRay;
void main(void)
{
    gl_Position = vec4(aVertex, 0.0, 1.0);
    vec2 percent = aVertex.xy * 0.5 + 0.5;
    vec3 ray00 = ((u_vInvMP* vec4(-1.0, -1.0, 0.0, 1.0))/(u_vInvMP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - vcameraPos;
    vec3 ray01 = ((u_vInvMP* vec4(-1.0, 1.0, 0.0, 1.0))/(u_vInvMP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - vcameraPos;
    vec3 ray10 = ((u_vInvMP* vec4(1.0, -1.0, 0.0, 1.0))/(u_vInvMP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - vcameraPos;
    vec3 ray11 = ((u_vInvMP* vec4(1.0, 1.0, 0.0, 1.0))/(u_vInvMP* vec4(-1.0, -1.0, 0.0, 1.0)).w).xyz - vcameraPos;
    InitRay = mix(mix(ray00, ray01, percent.y), mix(ray10, ray11, percent.y), percent.x);
}