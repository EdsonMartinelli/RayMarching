/**
 * @brief A simple sphere and plane renderized by Ray Maching in 3D.
 *
 * A simple SDF sphere in the center of scene, SDF plane (space divider) and
 * camera in z = 2.0 looking at scene center (right-hand coordinate system). This configuration
 * is renderized by a standard Ray Marching method with maximum distance equals 32.0.
 *
 * @author Edson Martinelli
 * @date 2025
 */
#version 430 core

/**
 * @ingroup FragVariables
 * @brief Output color of the pixel.
*/
layout (location = 0) out vec4 fragColor;

/**
 * @ingroup FragVariables
 * @brief Viewport and window resolution(x = width, y = height).
*/
layout (location = 0) uniform vec2 iResolution;

/**
 * @brief Sphere SDF.
 *
 * A simples SDF function representing a solid sphere positioned in space center (0,0,0).
 *
 * @param [in] pos Normalized pixel position.
 * @return The correct value of SDF at the position.
 */
float sphere(in vec3 pos) {
    return length(pos) - 1.0;    
}

/**
 * @brief Plane SDF.
 *
 * A simples SDF function that divide the entire world in two parts: positive, if 
 * position is greatem than -1.0; negative, if position is less than -1.0.
 *
 * @param [in] pos Normalized pixel position.
 * @return The correct value of SDF at the position.
 */
float plane(in vec3 pos) {
    return pos.y  + 1.0;  
}

/**
 * @brief Complete World SDF .
 *
 * SDF function that combines Sphere SDF and plane SDF using min funcion at a given point.
 *
 * @param [in] pos Normalized pixel position.
 * @return The correct value of SDF at the position.
 */
float sdf(in vec3 pos) {  
    return min(sphere(pos), plane(pos));
}

/**
 * @brief Get implicit functions normal.
 *
 * Get normal of a given point in the world using a numerical differentiation (Forward Difference).
 * The small value of the method is applied in the three axes (x, y, z) and the final result is normalized to all
 * values stays between 0.0 and 1.0 because it is only used to color.
 *
 * @param [in] pos Normalized pixel position.
 * @return Normal vector at the point.
 */
vec3 getNormal(in vec3 pos) {	
	vec3 normal;
    float hOffset = 0.0001;
	vec2 h = vec2(hOffset, 0.0);
    normal.x = (sdf(pos + h.xyy) - sdf(pos)) / hOffset;
	normal.y = (sdf(pos + h.yxy) - sdf(pos)) / hOffset;
	normal.z = (sdf(pos + h.yyx) - sdf(pos)) / hOffset;
	return (normalize(normal) + vec3(1.0)/2.);
}

/**
 * @brief Apply gamma correction to a color.
 *
 * Find the correct color based in the eyes structure.
 *
 * @param [in] color color to be correction.
 * @return color with gamma correction.
 */
vec3 gammaCorrection(in vec3 color){
    float gamma = 2.2;
    return pow(color, vec3(1.0/gamma)); 
}

/**
 * @brief Main function to execute the scene.
 *
 * The main function responsible for normalize pixel position, create camera and
 * run Ray Marching algorithm, given the correct color of the pixel in the fragColor.
 *
 */
void main()
{
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy)/iResolution.y;  
    vec3 origin = vec3(0.0, 0.0, 2.0);
    vec3 lookAt = vec3(0.0, 0.0, 0.0);
    vec3 vup = normalize(vec3(0.0, 1.0, 0.0));
    vec3 viewDir = normalize(lookAt - origin);
    vec3 hViewport = cross(viewDir, vup);
    vec3 vViewport = cross(hViewport, viewDir);
    vec3 viewportPoint = (hViewport * uv.x) + (vViewport * uv.y);
    vec3 direction = normalize(viewportPoint + viewDir);  

    float D = 32.0;
    float e = 0.0001;

    float count = 0.0;
    float MAX_STEP = 256.0;
    
    float t = 0.0;
    while(t < D) {
        float r = sdf(origin + direction * t);
        if(r < e) break;
        if(count > MAX_STEP) break;
        t += r;
        count = count + 1;
    }
    
    vec3 color = vec3(0.0,0.0,0.0);
    
    if(t < D) {
        vec3 position = origin + direction * t;
        vec3 normal = getNormal(position);
        //color = vec3((count/MAX_STEP), 0.0, 1.0 - (count/MAX_STEP));
        color = normal;
    }
    fragColor = vec4(gammaCorrection(color),1.0);

}