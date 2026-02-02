#ifndef SHADER_HPP
#define SHADER_HPP

unsigned int createShader(int shaderType, const char * path);
unsigned int createShaderProgram(unsigned int vertexShaderId, unsigned int fragmentShaderId);
unsigned int createComputeShaderProgram(unsigned int computeShaderId);

#endif