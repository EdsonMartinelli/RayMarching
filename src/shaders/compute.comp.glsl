#version 430 core

#define PRIMITIVE_CYLINDER 0
#define PRIMITIVE_BOX 1
#define PRIMITIVE_PLANE_CUTTER 2
#define PRIMITIVE_FLOOR 3

#define NODETYPE_PRIMITIVE 0
#define NODETYPE_BINARY 1


layout(local_size_x = 4, local_size_y = 1, local_size_z = 1) in;

struct BinaryOperation{
    float k;
    int s;
    int ca;
    int cb;
};

struct Primitive{
    //box
    float sideCenterX;
    float sideCenterY;
    float m;
    float xEnd;
    float th;

    //cylinder
    float offsetX;
    float offsetY;
    float r;

    float depth;
    uint type;

    float pad0, pad1;
};

struct Node{
    int type;
    int index;
};


layout(std430, binding = 0) buffer DataBuffer {
    float data[];
} dataData;

layout(std430, binding = 1) buffer PrimitivesBuffer {
    Primitive data[];
} primitives;

layout(std430, binding = 2) buffer BinaryOperationsBuffer {
    BinaryOperation data[];
} binaryOperations;

layout(std430, binding = 3) buffer NodesBuffer {
    Node data[];
} nodes;

layout(std430, binding = 4) buffer ParentsBuffer {
    int data[];
} parentsData;

float smoothMin( float a, float b, float k ){
    if(k == 0) return 0;
    float d = abs(a - b);
    float h = max(k - d, 0.0);
    return min(a, b) - h * h * (1.0 / (4.0 * k));
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

float sdCircle(vec3 p3, vec2 offset, float r, float depth){
    vec2 p = p3.xy - offset;
    float v = length(p) - r;
    return opExtrusion(p3, v, depth);
}

float evalPrimitive(vec3 p, Primitive pr){
    float d;

    switch (pr.type) {
        case PRIMITIVE_CYLINDER: 
            d = sdCircle(p, vec2(pr.offsetX, pr.offsetY), pr.r, pr.depth);  
            break;
        case PRIMITIVE_BOX: 
            d = sdOBox(p, vec2(pr.sideCenterX, pr.sideCenterY), pr.m, pr.xEnd, pr.th, pr.depth);  
            break;
        case PRIMITIVE_PLANE_CUTTER:
            d = sdPlaneCutter(p);
            break;
        case PRIMITIVE_FLOOR:
            d = sdfFloor(p);
            break;
        default:
            dist = 1e20;
            break;
    }

    return d;
}


void main() {
    uint id = gl_GlobalInvocationID.x;
    dataData.data[id] = dataData.data[id] * 2.0;

    int NODES_MAX = 25
    int stack[NODES_MAX];
    int stack_idx = 0;

    for (int i = NODES_MAX - 1; i >= 0; i--) {
        Node node = nodes.data[i];

        float d;
        if (node.type == NODETYPE_BINARY) {
            BinaryOperation binaryOperation = binaryOperations.data[node.index];
        }else if (node.type == NODETYPE_PRIMITIVE) {
            Primitive primitive = primitives.data[node.index];
            d = evalPrimitive(0, primitive);
        }
    }
    
}