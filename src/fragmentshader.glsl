#version 330 core
out vec4 fragColor;

uniform vec2 iResolution;

float sphere(in vec3 pos) {
    return length(pos) - 1.0;    
}

float plane(in vec3 pos) {
    return pos.y  + 1.0;  
}

float sdf(in vec3 pos) {  
    return min(sphere(pos), plane(pos));
}

vec3 getNormal(in vec3 pos) {	
	vec3 normal;
    float hOffset = 0.0001;
	vec2 h = vec2(hOffset, 0.0);
    normal.x = (sdf(pos + h.xyy) - sdf(pos)) / hOffset;
	normal.y = (sdf(pos + h.yxy) - sdf(pos)) / hOffset;
	normal.z = (sdf(pos + h.yyx) - sdf(pos)) / hOffset;
	return (normalize(normal) + vec3(1.0)/2.);
}

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
    fragColor = vec4(color,1.0);

};