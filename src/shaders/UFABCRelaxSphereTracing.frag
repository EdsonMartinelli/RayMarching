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
    ObjectHit objHit; /**< Object hit at the point */  
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
 * shape.
 *
 * @param [in] p Normalized 2D pixel position.
 * @return The correct value of SDF at the position.
 */
float sdPlaneCutter(vec2 p){
    vec2 offset = vec2(-0.82, 0.245);
    p = p - offset;
    float f = p.x + 0.09*sin(9.*p.y);
    vec2 df = vec2(1, 0.81 * cos(9.*p.y));
    float g = max(length(df),e);
    return f / g;
}

/**
 * @brief Oriented Box SDF.
 *
 * A oriented box function given by center point of its origin side, its slope, thickness and 
 * x coordenate of end.
 *
 * @param [in] p Normalized 2D pixel position.
 * @param [in] sideOriginCenter Center point of box origin side.
 * @param [in] m Box slope.
 * @param [in] xEndCenter X coordenate of the center point of box end side.
 * @param [in] th Thickness of the box.
 * @return The correct value of SDF at the position.
 */
float sdOBox(vec2 p, vec2 sideOriginCenter, float m, float xEndCenter, float th){
    vec2 sideEndCenter = calculateLinearPoint(sideOriginCenter, m, xEndCenter);
    float l = length(sideEndCenter-sideOriginCenter);
    vec2  d = (sideEndCenter-sideOriginCenter)/l;
    vec2  q = p-(sideOriginCenter+sideEndCenter)*0.5;
          q = mat2(d.x,-d.y,d.y,d.x)*q;
          q = abs(q)-vec2(l*0.5,th);
    return length(max(q,0.0)) + min(max(q.x,q.y),0.0);    
}

/**
 * @brief Circle SDF.
 *
 * A simples Circle function representing a circle 2D positioned in space center (0,0,0).
 *
 * @param [in] p Normalized 2D pixel position.
 * @param [in] r Circle radius.
 * @return The correct value of SDF at the position.
 */
float sdCircle(vec2 p, float r){
    return length(p) - r;
}

/**
 * @brief UFABC logo SDF.
 *
 * SDF function of UFABC Logo in 3D space.
 *
 * @param [in] p Normalized 3D space position.
 * @return The struct ObjectHit with the object color and the correct value of SDF at the position.
 */

ObjectHit sdfUFABC(vec3 p){
    ObjectHit objHit;

    // float t = length(p) - 1.5;
    // if(t >= 0.1){
    //     objHit.color = vec3(0.,0.,1.0);
    //     objHit.value = t;
    //     return objHit;
    // } 

    // if(t >= 1.0){
    //     objHit.color = vec3(0.,0.,1.0);
    //     objHit.value = 1.0;
    //     return objHit;
    // } 

    float insideRadius = 0.42;
    float outsideRadius = 0.5;
    float halfDistanceCenterX = outsideRadius - ((outsideRadius - insideRadius) / 2.0);
    float equilateralTriangleHeight = 0.796743; // side = 2 * halfDistanceCenterX
    vec2 centerA = vec2(-halfDistanceCenterX, -outsideRadius);
    vec2 centerB = vec2(0, equilateralTriangleHeight - outsideRadius);
    vec2 centerC = vec2(halfDistanceCenterX,-outsideRadius);

    float ringA = max(sdCircle(p.xy - centerA, outsideRadius), - sdCircle(p.xy - centerA, insideRadius));
    float ringB = max(sdCircle(p.xy - centerB, outsideRadius), - sdCircle(p.xy - centerB, insideRadius));
    float ringC = max(sdCircle(p.xy - centerC, outsideRadius), - sdCircle(p.xy - centerC, insideRadius));

    float rings = min(ringA, min(ringC, ringB));
    float ringCCutter = sdOBox(p.xy, centerC, 1.690,1.0, 0.16);

    float boxSlope = -0.5774; // 30 degree in radian
    float boxXCenterSideEnd = -1.15;
    float box = sdOBox(p.xy, centerC, boxSlope,boxXCenterSideEnd, 0.16);
    
    float greenArcs = max(rings, -min(box,ringCCutter));

    float boxCutter = sdOBox(p.xy, centerC, boxSlope,boxXCenterSideEnd, 0.02);
    float circleCutter = sdCircle(p.xy - centerC, insideRadius);
    float planeCutter = sdPlaneCutter(p.xy);

    float cutter = min(smoothMin(boxCutter, circleCutter, 0.060), planeCutter);

    float yellowLines = max(box, -cutter);

    //float final = min(greenArcs, yellowLines);
    
    
    if(yellowLines < greenArcs){
        vec3 trueColor = vec3(254.,206.,2.);
        objHit.color = trueColor / 255.;
        objHit.value = opExtrusion(p, yellowLines, 0.5);
        return objHit;
    }

    vec3 trueColor = vec3(5.,90.,57.);
    objHit.color = trueColor / 255.;
    objHit.value = opExtrusion(p, greenArcs, 0.5);
    return objHit;
}

/**
 * @brief Plane SDF.
 *
 * A simples SDF function that divide the entire world in two parts: positive, if 
 * position is greatem than -1.0; negative, if position is less than -1.0.
 *
 * @param [in] p Normalized 3D space position.
 * @return The struct ObjectHit with the object color and the correct value of SDF at the position.
 */
ObjectHit sdfFloor(vec3 p){
    ObjectHit objHit;
    objHit.color= vec3(1.,0.,0.);
    if(p.x < 0) p.x -=1;
    if(p.z < 0) p.z -=1;
    if((int(p.x) + int(p.z)) % 2 == 0) objHit.color = vec3(0.5,0.,0.);
    objHit.value = p.y + 1.0;
    return objHit;
}

/**
 * @brief Complete World SDF .
 *
 * SDF function that combines UFABC logo SDF and plane SDF using min funcion at a given point.
 *
 * @param [in] p Normalized 3D space position.
 * @return The struct ObjectHit with the object color and the correct value of SDF at the position.
 */
ObjectHit sdf(vec3 p){
    ObjectHit min;
    ObjectHit objHitUFABC = sdfUFABC(p);
    ObjectHit objHitFloor = sdfFloor(p);

    min = objHitFloor;
    if(objHitUFABC.value < objHitFloor.value){
        min = objHitUFABC;
    }
    return min;
}

/**
 * @brief Get implicit functions normal.
 *
 * Get normal of a given point in the world using a numerical differentiation (Forward Difference).
 * The small value of the method is applied in the three axes (x, y, z).
 *
 * @param [in] p Normalized 3D space position.
 * @param [in] pointValue SDF value at point p.
 * @return Normal vector at the point.
 */
// vec3 getNormal(in vec3 p, float pointValue) {	
// 	vec3 normal;
//     float hOffset = 0.0001;
// 	vec2 h = vec2(hOffset, 0.0);
//     normal.x = (sdf(p + h.xyy).value - pointValue) / hOffset;
// 	normal.y = (sdf(p + h.yxy).value - pointValue) / hOffset;
// 	normal.z = (sdf(p + h.yyx).value - pointValue) / hOffset;
// 	return normalize(normal);
// }
vec3 getNormal(in vec3 p, float pointValue) {	
	vec3 normal;
    float hOffset = 0.0001;
	vec2 h = vec2(hOffset, 0.0);
    normal.x = (sdf(p + h.xyy).value - sdf(p - h.xyy).value);
	normal.y = (sdf(p + h.yxy).value - sdf(p - h.yxy).value);
	normal.z = (sdf(p + h.yyx).value - sdf(p - h.yyx).value);
    return normalize(normal);
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

RayInfo relaxationRayMarching(vec3 direction){
    float count = 0.0;
    float t = 0.0;
    float omega = 1.6;
    float previousR = 0.0;
    float stepSize = 0.0;
    ObjectHit objHit;
    while(t < D) {
        objHit = sdf(origin + direction * t);
        float r = objHit.value;
        if(abs(r) < e) break;
        if(count > MAX_STEP) break;

        if(omega > 1 && abs(previousR) + abs(r) <= stepSize){
            stepSize = -stepSize;
            omega = 1.0;
        } else {           
            stepSize = r * omega;

        }   
        previousR = r;
        t += stepSize;
        count = count + 1; 
    }
    RayInfo ri;
    ri.objHit = objHit;
    ri.dist = t;
    ri.count = count;
    return ri;
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
    ObjectHit objHit;
    while(t < D) {
        objHit = sdf(origin + direction * t);
        float r = objHit.value;
        if(r < e) break;
        if(count > MAX_STEP) break;
        t += r;
        count = count + 1;
    }
    RayInfo ri;
    ri.objHit = objHit;
    ri.dist = t;
    ri.count = count;
    return ri;
}

/**
 * @brief Blinn-Phong illumination model.
 *
 * Phong Illuminition model with Blinn optimazation.
 *
 * @param [in] cameraDirection Camera direction.
 * @param [in] position Point where the ray hits.
 * @param [in] normal Normal of position.
 * @param [in] objColor Color of the object hit by the ray.
 * @param [in] illumination quantity of light hitting the surface.
 * @return Correct color for phong illumination. 
 */
vec3 phongIllumination(vec3 cameraDirection,
                       vec3 position, vec3 normal,
                       vec3 objColor,
                       float illumination){
    vec3 ambientColor = (objColor * 0.1) * (lightColor * 0.1);
    vec3 lightDirection = normalize(lightOrigin - position);
    float diffuseReflection = dot(normal, lightDirection);
    vec3 diffuseColor = (objColor * 0.5) * (lightColor * 0.5) * max(diffuseReflection, 0);
    vec3 halfwayVector = normalize(cameraDirection + lightDirection); 
    float shininess = 1.;
    float facing = diffuseReflection > 0 ?  1 : 0;
    vec3 specularColor = facing * (objColor * 0.9) * (lightColor * 0.9) * pow(max(dot(normal, halfwayVector), 0.0), shininess);
    return ambientColor + (diffuseColor + specularColor) * illumination;
}

/**
 * @brief Ray Marching algorithm for shadows.
 *
 * Starting at the hit point, advance the ray based on the direction of the light and value given by
 * the SDF, seeking to reach the maximum distance or hit a solid object to create a shadow.
 *
 * @param [in] originPoint Solid hit point.
 * @param [in] direction Ray direction towards the light origin.
 * @param [in] MAX_DIST Biggest distance between the solid hit point and the light origin.
 * @return Struct RayInfo containing the object hit information, distance of origin given a direction
 * and steps.
 */
float rayMarchingShadow(vec3 originPoint, vec3 direction, float MAX_DIST){
    float count = 0.0;
    float t = 0.0;
    ObjectHit objHit;
    while(t < MAX_DIST) {
        objHit = sdf(originPoint + direction * t);
        float r = abs(objHit.value);
        if(r < e) return 0.;
        if(count > MAX_STEP) return 0.;
        t += r;
        count = count + 1;
    }
    return 1.;
}

/**
 * @brief Main function to execute the scene.
 *
 * The main function responsible to indicate the correct color of the pixel in the fragColor.
 *
 */
void main()
{
    //origin = vec3(4.0 *sin(iTimer), 0.0, 4.0 *cos(iTimer));
    vec2 uv = normalizeSpace();  
    vec3 cameraDirection = getDirection(uv);  
    RayInfo ri = relaxationRayMarching(cameraDirection);
    
    vec3 color = vec3(0.0,0.0,0.0);
    
    if(ri.dist < D) {
        vec3 position = origin + cameraDirection * ri.dist;
        vec3 normal = getNormal(position, (ri.objHit).value);
        vec3 objColor = (ri.objHit).color;
        vec3 lightDirection = lightOrigin - position;
        float MAX_DIST = length(lightDirection);
        vec3 normalizedLightDirection = lightDirection / MAX_DIST;
        float illumination = rayMarchingShadow(position + (normal * e), normalizedLightDirection, MAX_DIST);
        color = phongIllumination(cameraDirection, position, normal, objColor, illumination);
             
    }

    //  if(ri.dist < D) {
    //     float count = ri.count;
    //     color = vec3(count / MAX_STEP, 0. , 1. - (count / MAX_STEP));
    // }

    fragColor = vec4(gammaCorrection(color),1.0);
}