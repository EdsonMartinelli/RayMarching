/**
 * @brief Simple Vertex shader
 *
 * Vertex shader used to draw de square on the entire screen.
 *
 * @author Edson Martinelli
 * @date 2025
 */

#version 430 core

/**
 * @defgroup VertVariables Vertex Variables
 * @brief Variables related to Vertex shader input, output and uniforms.
*/

/**
 * @ingroup VertVariables
 * @brief Current vertex position.
*/
layout (location = 0) in vec3 aPos;

/**
 * @brief Main function.
 *
 * Responsible to let the vertex in the same position.
 *
 */
void main()
{
    gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);
}