/**
 * @file main.cpp
 * @brief Main project file.
 *
 * Main project file. This setup the libraries GLFW (window manager)
 * and GLAD (OpenGL Loader), create vertices to render, load shaders and
 * create the application main loop.
 * 
 * @author Edson Martinelli
 * @date 2025
 */

#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>
#include <string>
#include <fstream>
#include <commun/shader.hpp>
#include <cmath>
#include <vector>
#include <numeric> // Para std::iota
#include <array>

#include "shape.hpp"

#define CALCULATE_SHADER_TIME 0 /**< Defines if the program will calculate shader time (1) or not (0)*/

int WINDOW_WIDTH = 800; /**< Global window width size. */
int WINDOW_HEIGHT = 600; /**< Global window height size. */

int SAMPLES = 5;/**< Number of samples for avarage FPS and Shader Time calculte.*/
double ONE_MINUTE = 60.0; /** Time of each sample. */

/**
 * @brief Callback function for error handler.
 * 
 * Error handler function that prints the error description in standard output.
 * This is used as callback function by the GLFW Library when a error is caught.
 * 
 * @param [in] error Error number.
 * @param [in] description Strig with error description.
 */
void errorCallback(int error, const char* description)
{
     std::cout << "Error: " << description << std::endl;
}

/**
 * @brief Window key handler function callback.
 * 
 * Key handler function that prints the keyboard key number in standard output.
 * This is used as callback function by the GLFW Library when a key is pressed, released or held down.
 * 
 * @param [in] window Window pointer to indicate the window of the input.
 * @param [in] key Keyboard key number.
 * @param [in] scancode Platform-specific scancode.
 * @param [in] action Actions like press, release, repeat.
 * @param [in] mods Modifier bit to check ALT, CTRL, SHIFT held down and check Caps Lock and Num Lock is enable.
 */
void keyCallback(GLFWwindow* window, int key, int scancode, int action, int mods)
{
    std::cout << "Key: " << key << std::endl;
}

/**
 * @brief Window resize handler function callback.
 * 
 * This used as callback by GLFW when window got resized. This modify WINDOW_WIDTH and WINDOW_HEIGHT
 * globals used in uniforms and change OpenGL viewport to current window size.
 * 
 * @param window Window pointer to indicate the window resized.
 * @param width Current window width size.
 * @param height Current window height size.
 */
void framebufferSizeCallback(GLFWwindow* window, int width, int height)
{
    WINDOW_WIDTH = width;
    WINDOW_HEIGHT = height;
    glViewport(0, 0, WINDOW_WIDTH, (int)WINDOW_HEIGHT);
}

/**
 * @brief Calculate metrics related to FPS.
 * 
 * Calculate average, variance and standard deviation of FPS samples.
 * 
 * @param [in] FPSamples FPS samples.
 */
void calculteFPSMetrics(double FPSamples[]){
    double averageFPSSamples = 0;
    double averageShaderTimeSamples = 0;
    for(int i = 0; i < SAMPLES; i++){
        averageFPSSamples += FPSamples[i];
    }
    
    averageFPSSamples = averageFPSSamples / SAMPLES;
    printf("Média de FPS nas amostras: %.2f\n", averageFPSSamples);

    double varianceFPSSamples = 0;
    for(int i = 0; i < SAMPLES; i++){
        double difference = (FPSamples[i] -averageFPSSamples);
        varianceFPSSamples += difference * difference;
    }

    varianceFPSSamples =  varianceFPSSamples / SAMPLES;
    printf("Variância de FPS nas amostras: %.2f\n", varianceFPSSamples);
    printf("Desvio Padrão de FPS nas amostras: %.2f\n", sqrt(varianceFPSSamples));
}


/**
 * @brief Calculate metrics related to Shader time.
 * 
 * Calculate average, variance and standard deviation of Shader samples.
 * 
 * @param [in] ShaderTimeSamples Shader time samples.
 */
void calculteShaderMetrics(double ShaderTimeSamples[]){
    double averageShaderTimeSamples = 0;
    for(int i = 0; i < SAMPLES; i++){
        averageShaderTimeSamples += ShaderTimeSamples[i];
    }
    averageShaderTimeSamples = averageShaderTimeSamples / SAMPLES;
    printf("Média de tempo do shader nas amostras: %.4f\n", averageShaderTimeSamples);

    double varianceShaderTimeSamples = 0;
    for(int i = 0; i < SAMPLES; i++){
        double difference = (ShaderTimeSamples[i] - averageShaderTimeSamples);
        varianceShaderTimeSamples += difference * difference;
    }

    varianceShaderTimeSamples =  varianceShaderTimeSamples / SAMPLES;
    printf("Variância de FPS nas amostras: %.4f\n", varianceShaderTimeSamples);
    printf("Desvio Padrão de FPS nas amostras: %.4f\n", sqrt(varianceShaderTimeSamples));
}

/**
 * @brief Main function of program to generate image.
 * 
 * Main function: Initialized GLFW and GLAD, setup callback functions, read the shaders, create the vertices
 * square that encompasses the entire viewport and execute the main loop to generate the image in the window.
 * 
 */
int main() {
    if (!glfwInit()) {
        std::cerr << "Failed to initialize GLFW\n";
        return -1;
    }
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(WINDOW_WIDTH, WINDOW_HEIGHT, "PGC - RayMarching", nullptr, nullptr);
    if (!window) {
        std::cerr << "Failed to create window\n";
        glfwTerminate();
        return -1;
    }
    
    glfwMakeContextCurrent(window);
    glfwSwapInterval(0);
    

    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
    {
        std::cout << "Failed to initialize GLAD" << std::endl;
        return -1;
    } 

    glfwSetErrorCallback(errorCallback);
    glfwSetKeyCallback(window, keyCallback);
    glfwSetFramebufferSizeCallback(window, framebufferSizeCallback);  

    glViewport(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

    unsigned int vertexShader = createShader(GL_VERTEX_SHADER, "src/shaders/vertexshader.vert");
    unsigned int fragmentShader = createShader(GL_FRAGMENT_SHADER, "src/shaders/UFABCFull3D.frag");
    unsigned int shaderProgram = createShaderProgram(vertexShader, fragmentShader); 

    float vertices[] = {
        1.0f,  1.0f, 0.0f,
        1.0f, -1.0f, 0.0f,
        -1.0f, -1.0f, 0.0f,
        -1.0f,  1.0f, 0.0f
    };
    unsigned int indices[] = {
        0, 1, 3,  
        1, 2, 3
    }; 

    unsigned int VAO;
    glGenVertexArrays(1, &VAO);  
    glBindVertexArray(VAO);   

    unsigned int VBO;
    glGenBuffers(1, &VBO); 
    glBindBuffer(GL_ARRAY_BUFFER, VBO);  
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    unsigned int EBO;
    glGenBuffers(1, &EBO);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);  







    const int N = 25; 
    size_t sizeInBytes = N * sizeof(float); 

    std::vector<float> state(N, 99); 

    
    std::array<Primitive,13> primitives;
    std::array<BinaryOperation,12> binaryOperations;
    std::array<Node,25> nodes;
    std::array<int,25> parents;

    getPrimitives(primitives);
    getBinaryOperations(binaryOperations);
    getNodes(nodes);
    getParents(parents);

    std::cout << primitives.at(1).offsetX << std::endl;

    GLuint ssbo[5];
    glGenBuffers(5, ssbo);
  
    glBindBuffer(GL_SHADER_STORAGE_BUFFER, ssbo[0]);
    glBufferData(GL_SHADER_STORAGE_BUFFER, 13 * sizeof(primitives.data()[0]), primitives.data(), GL_DYNAMIC_DRAW);
    glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, ssbo[0]);

    glBindBuffer(GL_SHADER_STORAGE_BUFFER, ssbo[1]);
    glBufferData(GL_SHADER_STORAGE_BUFFER, 12 * sizeof(binaryOperations.data()[0]), binaryOperations.data(), GL_DYNAMIC_DRAW);
    glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 1, ssbo[1]);

    glBindBuffer(GL_SHADER_STORAGE_BUFFER, ssbo[2]);
    glBufferData(GL_SHADER_STORAGE_BUFFER, 25 * sizeof(nodes.data()[0]), nodes.data(), GL_DYNAMIC_DRAW);
    glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 2, ssbo[2]);

    glBindBuffer(GL_SHADER_STORAGE_BUFFER, ssbo[3]);
    glBufferData(GL_SHADER_STORAGE_BUFFER, 25 * sizeof(parents.data()[0]), parents.data(), GL_DYNAMIC_DRAW);
    glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 3, ssbo[3]);

    glBindBuffer(GL_SHADER_STORAGE_BUFFER, ssbo[4]);
    glBufferData(GL_SHADER_STORAGE_BUFFER, sizeInBytes, state.data(), GL_DYNAMIC_DRAW);
    glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 4, ssbo[4]);

    unsigned int computeShader = createShader(GL_COMPUTE_SHADER, "src/shaders/compute.comp.glsl");
    unsigned int computeShaderProgram = createComputeShaderProgram(computeShader); 

    glUseProgram(computeShaderProgram);
    glDispatchCompute(1,1,1);
    glMemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);


    std::vector<float> final_data(N);
    glBindBuffer(GL_SHADER_STORAGE_BUFFER, ssbo[4]);
    glGetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeInBytes, final_data.data());

    int count = 0;
    for (const auto& element : final_data) {
        std::cout << count << ": " << element << std::endl;
        count++;
    }






    //Shader Time
    unsigned int queryID;
    glGenQueries(1, &queryID);
    double totalShaderTime = 0;
    double ShaderTimeSamples[SAMPLES];

    //FPS
    double totalTime = 0.0;
    int totalFrames = 0;
    double lastFrameTime = glfwGetTime();
    double FPSamples[SAMPLES];

    int samplesCount = 0;

    while (!glfwWindowShouldClose(window)) {
        double currentTime = glfwGetTime();
        double deltaTime = currentTime - lastFrameTime;
        totalTime += deltaTime;
        totalFrames++;
        lastFrameTime = currentTime;

        glClearColor(1.0f, 1.0f, 1.0f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glBeginQuery(GL_TIME_ELAPSED, queryID);

        glUseProgram(shaderProgram);
        //int iResolutionLocation = glGetUniformLocation(shaderProgram, "iResolution");
        glUniform2f(0, (float)WINDOW_WIDTH, (float)WINDOW_HEIGHT);
        glUniform1f(1, currentTime);
        glBindVertexArray(VAO);
        //glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
        glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);
        glBindVertexArray(0);

        glEndQuery(GL_TIME_ELAPSED);

        if(CALCULATE_SHADER_TIME){
            GLint available = GL_FALSE;
            while (available == GL_FALSE) {
                glGetQueryObjectiv(queryID, GL_QUERY_RESULT_AVAILABLE, &available);
            }
            GLuint64 elapsedTime;
            glGetQueryObjectui64v(queryID, GL_QUERY_RESULT, &elapsedTime);
            double ms = (double)elapsedTime / 1000000.0;
            totalShaderTime += ms;
        }

        glfwSwapBuffers(window);
        glfwPollEvents();

         //FPS
        if (totalTime >= ONE_MINUTE) {
            double averageFPS = (double)totalFrames / totalTime;
            printf("Média de FPS em %.1f segundos: %.2f\n", totalTime, averageFPS);
            FPSamples[samplesCount] = averageFPS;
            if(CALCULATE_SHADER_TIME){
                double averageShaderTime = (double)totalShaderTime / totalFrames;
                ShaderTimeSamples[samplesCount] = averageShaderTime;
                printf("Média de tempo do shader em %.1f segundos: %.4f (ms)\n", totalTime, averageShaderTime);
            }

            samplesCount++;
            totalShaderTime = 0;
            totalTime = 0;
            totalFrames = 0;

            if(samplesCount == SAMPLES){
                calculteFPSMetrics(FPSamples);
                if(CALCULATE_SHADER_TIME) calculteShaderMetrics(ShaderTimeSamples);
                return 0;
            }
        }
    }

    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}
