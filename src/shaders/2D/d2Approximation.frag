/**
 * @brief UFABC logotype renderized in 2D.
 *
 * UFABC logo in the center of scene created using d2 approximation method in plane with sin.
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
float sdPlane(vec2 p){
    vec2 offset = vec2(-0.82, 0.32);
    p = p - offset;
    float f0 = p.x + 0.09*sin(9.*p.y);
    float nf1 = length(vec2(1, 0.81 * cos(9.*p.y)));
    float nf2 = max(length(vec3(0, -7.29 * sin(9.*p.y), 0)), 0.0001);
    float d2 = sqrt(((nf1 * nf1) / (4 * nf2 * nf2)) + (abs(f0)/(nf2))) - ((nf1 / (2 * nf2)));
    return f0 < 0 ? -d2 : d2;
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
 * SDF function of UFABC Logo in 2D space.
 *
 * @param [in] p Normalized 3D space position.
 * @return The correct value of SDF at the position.
 */
float sdf(vec2 p)
{
    float insideRadius = 0.42;
    float outsideRadius = 0.5;
    float halfDistanceCenterX = outsideRadius - ((outsideRadius - insideRadius) / 2.0);
    float equilateralTriangleHeight = 0.796743; // side = 2 * halfDistanceCenterX
    float offsetY = 0.1;
    vec2 centerA = vec2(-halfDistanceCenterX, -(outsideRadius - offsetY));
    vec2 centerB = vec2(0, equilateralTriangleHeight - (outsideRadius - offsetY));
    vec2 centerC = vec2(halfDistanceCenterX,-(outsideRadius - offsetY));

    float ringA = max(sdCircle(p - centerA, outsideRadius), - sdCircle(p - centerA, insideRadius));
    float ringB = max(sdCircle(p - centerB, outsideRadius), - sdCircle(p - centerB, insideRadius));
    float ringC = max(sdCircle(p - centerC, outsideRadius), - sdCircle(p - centerC, insideRadius));

    float rings = min(ringA, min(ringC, ringB));

    float boxSlope = -0.5774;
    float boxXCenterSideEnd = -1.15;

    float box = sdOBox(p.xy, centerC, boxSlope,boxXCenterSideEnd, 0.16);
    float arcCCutter = sdOBox(p.xy, centerC, 1.690,1.0, 0.16);

    float greenArcs = max(rings, -min(box,arcCCutter));

    float boxCutter = sdOBox(p.xy, centerC, boxSlope,boxXCenterSideEnd, 0.02);
    float circleCutter = sdCircle(p - centerC, insideRadius);
    float planeCutter = sdPlane(p.xy);

    float cutter = min(smoothMin(boxCutter, circleCutter, 0.060), planeCutter);

    float yellowLines = max(box, -cutter);

    float final = min(greenArcs, yellowLines);
    
    return final;
}

/**
 * @brief Main function to execute the scene.
 *
 * The main function responsible to indicate the correct color of the pixel in the fragColor.
 *
 */
void main()
{
	vec2 p = (2.0*gl_FragCoord.xy-iResolution.xy)/iResolution.y;

	float d = sdf(p);
  
    vec3 col = (d>0.0) ? vec3(0.4,0.4,0.4) : vec3(0.65,0.85,1.0);
    col = (d < 0.1) ?  vec3(0.,0.,0.) : col;
	col *= 1.5*cos(180.0*d);
    col = d<0.0 ? vec3(1.,1.,1.): col;
    
    float planeCutter = sdPlane(p);
    float contourPlaneCutter = 0.008;
    if(abs(planeCutter) < contourPlaneCutter){
        col = vec3(1.0,0.0,0.0);
    }
	fragColor = vec4(col,1.0);
}