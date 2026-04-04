/**
 * @brief UFABC logotype and plane renderized by Ray Maching in 3D.
 *
 * UFABC logo in the center of scene, SDF plane (space divider) and
 * camera looking at scene center (right-hand coordinate system). This configuration
 * is renderized by a standard Ray Marching method with maximum distance equals 32.0.
 *
 * @author Edson Martinelli
 * @date 2025
 */

#version 430 core

/**
 * @defgroup FragVariables Fragment Variables
 * @brief Variables related to fragment shader input, output and uniforms.
*/

/**
 * @defgroup CameraVariables Camera Variables
 * @brief Variables related to camera system.
*/

/**
 * @defgroup ObjVariables Object Variables
 * @brief Variables related to objects in scene.
*/

/**
 * @defgroup LightVariables Light Variables
 * @brief Variables related to light.
*/

/**
 * @defgroup RayVariables Ray Variables
 * @brief Variables related to Ray Marching.
*/

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
 * @ingroup FragVariables
 * @brief Time information for rotate.
*/
layout (location = 1) uniform float iTimer;

/**
 * @ingroup ObjVariables
 * @brief Object hit struct.
 */
struct ObjectHit{
    vec3 color; /**< Object point color. */  
    float value; /**< Value at object point. */ 
};

/**
 * @ingroup RayVariables
 * @brief Ray information struct.
*/
struct RayInfo{
    float value; /**< Value at the point */ 
    float dist; /**< Distance from camera origin */  
    float count; /**< Steps from camera origin */
};

/**
 * @ingroup CameraVariables
 * @brief Rays origin.
*/
vec3 origin = vec3(1.0, 0.0, 2.0);
/**
 * @ingroup CameraVariables
 * @brief Rays target position.
*/
vec3 lookAt = vec3(0.0, 0.0, 0.0);
/**
 * @ingroup CameraVariables
 * @brief Vector for up direction. 
*/
vec3 vup = normalize(vec3(0.0, 1.0, 0.0));

/**
 * @ingroup LightVariables
 * @brief Light point position. 
*/
vec3 lightOrigin = vec3(0.0, 1.0, 2.0);

/**
 * @ingroup LightVariables
 * @brief Light color. 
*/
vec3 lightColor =  vec3(1.0, 1.0, 1.0);

/**
 * @ingroup RayVariables
 * @brief Maximun ray distance. 
*/
float D = 32.0;
/**
 * @ingroup RayVariables
 * @brief Minimun next step to consider the ray hits a surface (maximun error). 
*/
float e = 0.0001;
/**
 * @ingroup RayVariables
 * @brief Maximun ray steps.
*/
float MAX_STEP = 256.0;

/**
 * @brief Smooth minimum function.
 *
 * A quadractic polynomial smooth mininum function.
 *
 * @param [in] a Point value in the first SDF.
 * @param [in] b Point value in the second SDF.
 * @param [in] k Smooth value parameter.
 * @return Smooth value for given values.
 */
float smoothMin( float a, float b, float k ){
    float d = abs(a - b);
    float h = max(k - d, 0.0);
    return min(a, b) - h * h * (1.0 / (4.0 * k));
}

/**
 * @brief Extrusion operation for 2D SDFs.
 *
 * Transform a 2D SDF in a 3D SDF using extrusion.
 *
 * @param [in] p Normalized 3D pixel position.
 * @param [in] sdf 2D SDF value for pixel position.
 * @param [in] h Extrusion size.
 * @return Correct value of 3D SDF at p point.
 */
float opExtrusion( in vec3 p, in float sdf, in float h ){
    vec2 w = vec2( sdf, abs(p.z) - h );
  	return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}

/**
 * @brief Calculate Y coordenate of the linear equation and return the point.
 *
 * Calculate Y coordenate given a origin point in 2D, a slope and x coordenate. After that, this
 * function returns a point with given x e calculate Y.
 *
 * @param [in] origin A point in the line.
 * @param [in] m Equation slope.
 * @param [in] x Second point X coordenate.
 * @return A point (2D) with X coordenate and correspondent Y.
 */
vec2 calculateLinearPoint(vec2 origin, float m, float x){
    float c = (m * origin.x) - origin.y;
    float y = (m * x) - c;
    return vec2(x,y);
}

/**
 * @brief Plane SDF with sin function used to cut. 
 *
 * A SDF function that use sin function to divide the entire world in two parts using a wave
 * shape extruded in the Z axis.
 *
 * @param [in] p Normalized 3D pixel position.
 * @return The correct value of SDF at the position.
 */
float sdPlaneCutter(vec3 p3){
    vec2 p = p3.xy;
    vec2 offset = vec2(-0.82, 0.245);
    p = p - offset;
    float f = p.x + 0.09 * sin(9. * p.y);
    vec2 df = vec2(1, 0.81 * cos(9. * p.y));
    float g = max(length(df), e);
    float v = f / g;
    return opExtrusion(p3, v, 0.51);
}

/**
 * @brief Oriented Box SDF.
 *
 * A oriented box function given by center point of its origin side, its slope, thickness and 
 * x coordenate of end extruded in the Z axis.
 *
 * @param [in] p Normalized 2D pixel position.
 * @param [in] sideOriginCenter Center point of box origin side.
 * @param [in] m Box slope.
 * @param [in] xEndCenter X coordenate of the center point of box end side.
 * @param [in] th Thickness of the box.
 * @param [in] depth Extrusion depth.
 * @return The correct value of SDF at the position.
 */
float sdOBox(vec3 p3, vec2 sideOriginCenter, float m, float xEndCenter, float th, float depth){
    vec2 p = p3.xy;
    vec2 sideEndCenter = calculateLinearPoint(sideOriginCenter, m, xEndCenter);
    float l = length(sideEndCenter-sideOriginCenter);
    vec2  d = (sideEndCenter-sideOriginCenter)/l;
    vec2  q = p-(sideOriginCenter+sideEndCenter)*0.5;
          q = mat2(d.x, -d.y, d.y, d.x) * q;
          q = abs(q) - vec2(l * 0.5, th);
    float v = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);   
    return opExtrusion(p3, v, depth); 
}

/**
 * @brief Circle SDF.
 *
 * A simples Circle function representing a circle 2D extruded in the Z axis.
 *
 * @param [in] p Normalized 3D pixel position.
 * @param [in] r Circle radius.
 * @param [in] depth Extrusion depth.
 * @return The correct value of SDF at the position.
 */
float sdCircle(vec3 p3, float r, float depth){
    vec2 p = p3.xy;
    float v = length(p) - r;
    return opExtrusion(p3, v, depth);
}


/**
 * @brief Green arcs of UFABC logo SDF.
 *
 * SDBF of Green arcs in UFABC Logo in 3D space.
 *
 * @param [in] p Normalized 3D space position.
 * @return The correct value of SDF at the position.
 */

float sdfGreenArcs(vec3 p){
    float insideRadius = 0.42;
    float outsideRadius = 0.5;
    float halfEquilateralTriangleSide = (outsideRadius + insideRadius) * 0.5;
    float equilateralTriangleHeight = 0.796743;
    vec3 centerA = vec3(-halfEquilateralTriangleSide, -outsideRadius, 0);
    vec3 centerB = vec3(0, equilateralTriangleHeight -outsideRadius, 0);
    vec3 centerC = vec3(halfEquilateralTriangleSide, -outsideRadius, 0);

    float ringA = max(sdCircle(p - centerA, outsideRadius, 0.5), - sdCircle(p - centerA, insideRadius, 0.51));
    float ringB = max(sdCircle(p - centerB, outsideRadius, 0.5), - sdCircle(p - centerB, insideRadius, 0.51));
    float ringC = max(sdCircle(p - centerC, outsideRadius, 0.5), - sdCircle(p - centerC, insideRadius, 0.51));

    float rings = min(ringA, min(ringC, ringB));
    float ringCCutter = sdOBox(p, centerC.xy, 1.690, 1.0, 0.16, 0.51);

    float boxSlope = -0.5774; // 30 degree in radian
    float boxXCenterSideEnd = -1.15;
    float box = sdOBox(p, centerC.xy, boxSlope,boxXCenterSideEnd, 0.16, 0.51);
    float greenArcs = max(rings, -min(box,ringCCutter));
    return greenArcs;
}


/**
 * @brief Yellow lines of UFABC logo SDF.
 *
 * SDBF of yellow lines in UFABC Logo in 3D space.
 *
 * @param [in] p Normalized 3D space position.
 * @return The correct value of SDF at the position.
 */
float sdfYellowLines(vec3 p){

    float insideRadius = 0.42;
    float outsideRadius = 0.5;
    float halfEquilateralTriangleSide = (outsideRadius + insideRadius) * 0.5;
    vec3 centerC = vec3(halfEquilateralTriangleSide, -outsideRadius, 0);


    float boxSlope = -0.5774; // 30 degree in radian
    float boxXCenterSideEnd = -1.15;
    float box = sdOBox(p, centerC.xy, boxSlope, boxXCenterSideEnd, 0.16, 0.50);

    float boxCutter = sdOBox(p, centerC.xy, boxSlope, boxXCenterSideEnd, 0.02, 0.51);
    float circleCutter = sdCircle(p - centerC, insideRadius, 0.51);
    float planeCutter = sdPlaneCutter(p);

    float cutter = min(smoothMin(boxCutter, circleCutter, 0.060), planeCutter);

    float yellowLines = max(box, -cutter);
    return yellowLines;
}

/**
 * @brief UFABC logo SDF.
 *
 * SDBF of UFABC Logo in 3D space.
 *
 * @param [in] p Normalized 3D space position.
 * @return The correct value of SDF at the position.
 */
float sdfUFABC(vec3 p){
    return min(sdfGreenArcs(p), sdfYellowLines(p));
}

/**
 * @brief Plane SDF.
 *
 * A simples SDF function that divide the entire world in two parts: positive, if 
 * position is greatem than -1.0; negative, if position is less than -1.0.
 *
 * @param [in] p Normalized 3D space position.
 * @return The correct value of SDF at the position.
 */
float sdfFloor(vec3 p){
    return p.y + 1.0;
}

/**
 * @brief Complete World SDF .
 *
 * SDF function that combines UFABC logo SDF and plane SDF using min funcion at a given point.
 *
 * @param [in] p Normalized 3D space position.
 * @return The correct value of SDF at the position.
 */
float sdf(vec3 p){
    return min(sdfUFABC(p), sdfFloor(p));
}

/**
 * @brief Get implicit functions normal.
 *
 * Get normal of a given point in the world using a numerical differentiation (Cental Difference).
 * The small value of the method is applied in the three axes (x, y, z).
 *
 * @param [in] p Normalized 3D space position.
 * @return Normal vector at the point.
 */
vec3 getNormal(in vec3 p) {	
	vec3 normal;
    float hOffset = 0.0001;
	vec2 h = vec2(hOffset, 0.0);
    normal.x = (sdf(p + h.xyy) - sdf(p - h.xyy));
	normal.y = (sdf(p + h.yxy) - sdf(p - h.yxy));
	normal.z = (sdf(p + h.yyx) - sdf(p - h.yyx));
    vec3 color = normalize(normal) * 0.5 + 0.5;
    return normalize(pow(color, vec3(2)) * 1.2);
}

/**
 * @brief Apply gamma correction to a color.
 *
 * Find the correct color based in the eyes structure.
 *
 * @param [in] color Color to be correction.
 * @return Color with gamma correction.
 */
vec3 gammaCorrection(vec3 color){
    float gamma = 2.2;
    return pow(color, vec3(1.0/gamma)); 
}

/**
 * @brief Normalize space coordenates.
 *
 * Use gl_FragCoord (current pixel coordenate) and iResolution uniform to generate a 2D normalized
 * space.
 *
 * @return Normalized 2D space position.
 */
vec2 normalizeSpace(){
    return (gl_FragCoord.xy * 2.0 - iResolution.xy)/iResolution.y;  
}

/**
 * @brief Get direction to given normalized pixel.
 *
 * Use cross product to produce a offset for ray origin point based in the current normalized pixel
 * position that dictates the direction.
 *
 * @param [in] uv Normalized space position.
 * @return Direction of ray to given normalized pixel.
 */
vec3 getDirection(vec2 uv){
    vec3 viewDir = normalize(lookAt - origin);
    vec3 hViewport = cross(viewDir, vup);
    vec3 vViewport = cross(hViewport, viewDir);
    vec3 viewportPoint = (hViewport * uv.x) + (vViewport * uv.y);
    return normalize(viewportPoint + viewDir);  
}

/**
 * @brief Ray Marching Algorithm.
 *
 * Starting at the origin, advance the ray based on the direction and value given by the SDF, seeking
 * to find solid hit or reach the maximum distance.
 *
 * @param [in] direction Ray direction.
 * @return Struct RayInfo containing the object hit information, distance of origin given a direction
 * and steps.
 */
RayInfo rayMarching(vec3 direction){
    float count = 0.0;
    float t = 0.0;
    float r = 0.0;
    while(t < D) {
        r = sdf(origin + direction * t);
        if(r < e) break;
        if(count > MAX_STEP) break;
        t += r;
        count = count + 1;
    }
    RayInfo ri;
    ri.value = r;
    ri.dist = t;
    ri.count = count;
    return ri;
}


/**
 * @brief Main function to execute the scene.
 *
 * The main function responsible to indicate the correct color of the pixel in the fragColor.
 *
 */
void main()
{
    //origin = vec3(3.0 *sin(iTimer), 0.0, 3.0 *cos(iTimer));
    vec2 uv = normalizeSpace();  
    vec3 cameraDirection = getDirection(uv);  
    RayInfo ri = rayMarching(cameraDirection);
    
    float p = 1 - (gl_FragCoord.y / iResolution.y);
    vec3 color = vec3(0.4,0.4,1.0) + vec3(p) ;
    
    if(ri.dist < D) {
        vec3 position = origin + cameraDirection * ri.dist;
        vec3 normal = getNormal(position);
        color =  normal; 
             
    }

    fragColor = vec4(gammaCorrection(color),1.0);
}