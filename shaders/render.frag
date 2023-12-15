precision highp float;

uniform sampler2D displayBufferTexture;
varying vec2 texCoord;

void main(void)
{
    gl_FragColor = texture2D(displayBufferTexture, texCoord);
}