#include <stdio.h>
#include <string>
#include <iostream>
#include <fstream>
#include <glad/glad.h>
#include <commun/shader.hpp>

std::string readShaderFile(const char* path){
    std::string shaderCode;
	std::ifstream shaderStream(path, std::ios::in);
	if(shaderStream.is_open()){
		std::string Line = "";
		while(getline(shaderStream, Line))
			shaderCode += Line + "\n";
		shaderStream.close();
        return shaderCode;
	}else{
		std::cout << "Error on load shader!" << path << std::endl;
		getchar();
		return 0;
	}
} 

void compileShader(unsigned int shaderId, int shaderType, const char** source){
    glShaderSource(shaderId, 1, source, NULL);
    glCompileShader(shaderId);
}

void checkShaderError(unsigned int shaderId){
    int complilationResult = GL_FALSE;
	int infoLogLength;

    glGetShaderiv(shaderId, GL_COMPILE_STATUS, &complilationResult);
	glGetShaderiv(shaderId, GL_INFO_LOG_LENGTH, &infoLogLength);

	if (infoLogLength > 0){
        char error[infoLogLength];
		glGetShaderInfoLog(shaderId, infoLogLength, NULL, error);
        std::cout << error << std::endl;
	}

}

unsigned int createShader(int shaderType, const char * path){
    unsigned int shaderId = glCreateShader(shaderType);
    std::string shaderCode = readShaderFile(path);
    const char* sourceCode = shaderCode.c_str();
    compileShader(shaderId, shaderType, &sourceCode);
    checkShaderError(shaderId);
    return shaderId;  
}

unsigned int createComputeShaderProgram(unsigned int computeShaderId){
    unsigned int computeShaderProgramId = glCreateProgram();
    glAttachShader(computeShaderProgramId, computeShaderId);
    glLinkProgram(computeShaderProgramId);

	glDetachShader(computeShaderProgramId, computeShaderId);

    glDeleteShader(computeShaderId);
	return computeShaderProgramId; 
}

unsigned int createShaderProgram(unsigned int vertexShaderId, unsigned int fragmentShaderId){
    unsigned int shaderProgramId = glCreateProgram();
    glAttachShader(shaderProgramId, vertexShaderId);
    glAttachShader(shaderProgramId, fragmentShaderId);
    glLinkProgram(shaderProgramId);

	glDetachShader(shaderProgramId, vertexShaderId);
	glDetachShader(shaderProgramId, fragmentShaderId);

    glDeleteShader(vertexShaderId);
    glDeleteShader(fragmentShaderId);   
	return shaderProgramId; 
}
