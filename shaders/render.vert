precision highp float;

attribute vec3 aVertex;
varying vec2 v_texCoord;

void main(void)
{
   v_texCoord = aVertex.xy * 0.5 + 0.5;
   gl_Position = vec4(aVertex, 1.0);
}