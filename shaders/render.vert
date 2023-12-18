#version 300 es

precision highp float;

in vec3 vertexPos;
out vec2 texCoord;

void main(void)
{
   texCoord = vertexPos.xy * 0.5 + 0.5;
   gl_Position = vec4(vertexPos, 1.0);
}