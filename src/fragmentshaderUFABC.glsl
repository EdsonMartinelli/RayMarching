#version 330 core
out vec4 fragColor;

uniform vec2 iResolution;

float smin( float a, float b, float k ){
    k *= 4.0;
    float h = max( k - abs(a - b), 0.0 )/ k;
    return min(a, b) - h * h * k * (1.0 / 4.0);
}

float opExtrusion( in vec3 p, in float sdf, in float h ){
    vec2 w = vec2( sdf, abs(p.z) - h );
  	return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}

vec2 calculateLinearPoint(vec2 origin, float m, float x){
    float c = (m * origin.x) - origin.y;
    float y = (m * x) - c;
    return vec2(x,y);
}

float sdPlane(vec2 p){
    p.x = p.x + 0.80;
    p.y = p.y -0.32;
    p.x = p.x + 0.09*sin(9.*p.y);
    return p.x;
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

float sdfUFABC(vec3 p)
{
    float insideCircleRadius = 0.42;
    float outsideCircleRadius = 0.5;
    vec2 centerA = vec2(p.x+0.475,p.y+0.425);
    vec2 centerB = vec2(p.x,p.y-0.375);
    vec2 centerC = vec2(p.x-0.475,p.y+0.425);

    float ringA = max(sdCircle(centerA, outsideCircleRadius), - sdCircle(centerA, insideCircleRadius));
    float ringB = max(sdCircle(centerB, outsideCircleRadius), - sdCircle(centerB, insideCircleRadius));
    float ringC = max(sdCircle(centerC, outsideCircleRadius), - sdCircle(centerC, insideCircleRadius));

    float rings = min(ringA, min(ringC, ringB));

    vec2 boxCenterSideOrigin = vec2(0.475,-0.425);
    float boxSlope = -0.5774;
    float boxXCenterSideEnd = -1.15;

    float box = sdOBox(p.xy, boxCenterSideOrigin, boxSlope,boxXCenterSideEnd, 0.16);
    float arcCCutter = sdOBox(p.xy, boxCenterSideOrigin, 1.690,1.0, 0.16);

    float greenArcs = max(rings, -min(box,arcCCutter));

    float boxCutter = sdOBox(p.xy, boxCenterSideOrigin, boxSlope,boxXCenterSideEnd, 0.02);
    float circleCutter = sdCircle(centerC, insideCircleRadius);
    float planeCutter = sdPlane(p.xy);

    float cutter = min(smin(boxCutter, circleCutter, 0.015), planeCutter);

    float yellowLines = max(box, -cutter);

    float final = min(greenArcs, yellowLines);
    
    return opExtrusion(p,final, 0.5);
}

float sdfFloor(vec3 p){
    return p.y + 0.925;
}

float sdf(vec3 p){
    return min(sdfUFABC(p), sdfFloor(p));
}

vec3 getNormal(in vec3 pos) {	
	vec3 normal;
    float hOffset = 0.0001;
	vec2 h = vec2(hOffset, 0.0);
    normal.x = (sdf(pos + h.xyy) - sdf(pos)) / hOffset;
	normal.y = (sdf(pos + h.yxy) - sdf(pos)) / hOffset;
	normal.z = (sdf(pos + h.yyx) - sdf(pos)) / hOffset;
	return normalize(normal);
}

void main()
{
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy)/iResolution.y;  
    vec3 origin = vec3(1.0, 0.0, 2.0);
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
    fragColor = vec4(color,1.0);

};