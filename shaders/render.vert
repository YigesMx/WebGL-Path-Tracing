precision highp float;

attribute vec3 vertexPos;
varying vec2 texCoord;

void main(void)
{
   texCoord = vertexPos.xy * 0.5 + 0.5;
   gl_Position = vec4(vertexPos, 1.0);
}