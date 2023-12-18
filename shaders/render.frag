#version 300 es

precision highp float;

uniform sampler2D displayBufferTexture;
in vec2 texCoord;

out vec4 fragColor;

void main(void)
{
    fragColor = texture(displayBufferTexture, texCoord);
}