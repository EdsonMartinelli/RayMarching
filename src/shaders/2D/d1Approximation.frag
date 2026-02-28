#version 430 core

layout (location = 0) out vec4 fragColor;

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

vec2 calculateLinearPoint(vec2 origin, float m, float x){
    float c = (m * origin.x) - origin.y;
    float y = (m * x) - c;
    return vec2(x,y);
}

float sdPlane(vec2 p){
    vec2 offset = vec2(-0.82, 0.32);
    p = p - offset;
    float f0 = p.x + 0.09*sin(9.*p.y);
    vec2 f1 = vec2(1, 0.81 * cos(9.*p.y));
    float nf1 = max(length(f1), 0.0001);
    return f0 / nf1;
}

float sdOBox(vec2 p, vec2 centerSideOrigin, float m, float xCenterEnd, float th){
    vec2 centerSideEnd = calculateLinearPoint(centerSideOrigin, m, xCenterEnd);
    float l = length(centerSideEnd-centerSideOrigin);
    vec2  d = (centerSideEnd-centerSideOrigin)/l; 
    vec2  q = p-(centerSideOrigin+centerSideEnd)*0.5; 
          q = mat2(d.x,-d.y,d.y,d.x)*q; 
          q = abs(q)-vec2(l*0.5,th);
    return length(max(q,0.0)) + min(max(q.x,q.y),0.0);
}

float sdCircle(vec2 p, float r){
    return length(p) - r;
}

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