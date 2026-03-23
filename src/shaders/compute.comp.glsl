#version 430 core

#define PRIMITIVE_CYLINDER 0
#define PRIMITIVE_BOX 1
#define PRIMITIVE_PLANE_CUTTER 2
#define PRIMITIVE_FLOOR 3

#define NODETYPE_PRIMITIVE 0
#define NODETYPE_BINARY 1

#define NODESTATE_ACTIVE 0
#define NODESTATE_SKIPPED 1
#define NODESTATE_INACTIVE 2


layout(local_size_x = 4, local_size_y = 4, local_size_z = 4) in;

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
    int sign; //<--
    int parent; //<--
};

struct CellInfo{
    int offset;
    int size;
};


struct Stack{
    float value;
    int index;
};

struct NodeState{
    int state;
    bool inactiveAncestors;
    int sign; //<--
    int parent; //<--
};

layout(std430, binding = 0) readonly buffer PrimitivesBuffer {
    Primitive data[];
} primitives;

layout(std430, binding = 1) readonly buffer BinaryOperationsBuffer {
    BinaryOperation data[];
} binaryOperations;

layout(std430, binding = 2) readonly buffer NodesBuffer {
    Node data[];
} nodes;

layout(std430, binding = 3) readonly buffer CellInfoBuffer {
    CellInfo data[];
} cellInfo;


layout(std430, binding = 4) buffer NodesOutputBuffer {
    Node data[];
} nodesOutput;

layout(std430, binding = 5) buffer CellInfoOutputBuffer {
    CellInfo data[];
} cellInfoOutput;

layout(std430, binding = 6) buffer NodeCounter {
    uint numNodes;
};

layout(std430, binding = 7) buffer aabbMaxBuffer {
    vec4 aabbMax;
};

layout(std430, binding = 8) buffer aabbMinBuffer {
    vec4 aabbMin;
};


// shared Node activeNode[25]
const int NODES_MAX = 25;

float e = 0.0001;

float smoothFunction( float a, float b, float k ){
    if(k == 0) return 0;
    float d = abs(a - b);
    float h = max(k - d, 0.0);
    return h * h * (1.0 / (4.0 * k));
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

float sdFloor(vec3 p){
    return p.y + 1.0;
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
            d = sdFloor(p);
            break;
        default:
            d = 1e20;
            break;
    }

    return d;
}

uint getCellIndex(uvec3 globalID, uint size){
    return (globalID.z * size * size) + (globalID.y * size) + globalID.x;
}


void main() {

    uint cellIndex = getCellIndex(gl_GlobalInvocationID, 4);
    uint cellParentIndex = uint(cellIndex / 64);

    CellInfo cellParentInfo = cellInfo.data[cellParentIndex];

    vec3 cellSize = (aabbMax.xyz - aabbMin.xyz) / 4.0;
    vec3 cellCenter = aabbMin.xyz + cellSize * (vec3(gl_GlobalInvocationID.xyz) + 0.5);    

    float R = length(cellSize) * 0.5;

    NodeState states[NODES_MAX];
    Stack stack[NODES_MAX];
    int stateIndex = 0;
    int stackIndex = 0;
    
    for (int i = cellParentInfo.offset; i < (cellParentInfo.size + cellParentInfo.offset); i++) {
        Node node = nodes.data[i];
        int si = node.sign;

        float d;
        if (node.type == NODETYPE_BINARY) {

            BinaryOperation binaryOperation = binaryOperations.data[node.index];
            float leftValue = stack[stackIndex - 2].value;
            float rightValue = stack[stackIndex - 1].value;

            float k = binaryOperation.k;
            int s = binaryOperation.s;
            NodeState newState;

            d = s * (min(s * leftValue, s * rightValue) - smoothFunction(leftValue, rightValue, k));

            if (abs(leftValue - rightValue) <= 2 * R + k) {
               newState.state = NODESTATE_ACTIVE;
            } else {
               newState.state = NODESTATE_SKIPPED;

                if (s * leftValue < s * rightValue) {
                    states[stack[stackIndex - 1].index].state = NODESTATE_INACTIVE;
                } else {
                    states[stack[stackIndex - 2].index].state = NODESTATE_INACTIVE;
                }
            }
            
            stackIndex -=2;
            newState.inactiveAncestors = false;
            newState.parent = node.parent;
            newState.sign = node.sign;
            states[i] = newState;
        } else if (node.type == NODETYPE_PRIMITIVE) {
            Primitive primitive = primitives.data[node.index];
            d = evalPrimitive(cellCenter, primitive);
            NodeState newState;
            newState.state = NODESTATE_ACTIVE;
            newState.inactiveAncestors = false;
            newState.parent = node.parent;
            newState.sign = node.sign;
            states[stateIndex] = newState;
        }

        Stack newItem;
        newItem.value = d * si;
        newItem.index = stateIndex;
        stack[stackIndex] = newItem;
        stackIndex++;
        stateIndex++;
    }

    int numGlobalActives = 0;
    for (int i = cellParentInfo.size - 1; i >= 0; i--) {

        bool isGlobalActive = false;
         if (states[i].state == NODESTATE_INACTIVE) {
            states[i].inactiveAncestors = true;
         }else {
            int parentIndex = nodes.data[i].parent;
            NodeState parentState = states[parentIndex];
            bool hasInactiveAncestors = parentIndex >= 0 ? parentState.inactiveAncestors : false;
            states[i].inactiveAncestors = hasInactiveAncestors;
            isGlobalActive = states[i].state == NODESTATE_ACTIVE && !hasInactiveAncestors;

            if(parentIndex >= 0){
                if(parentState.state == NODESTATE_SKIPPED){
                    states[i].parent = parentState.parent;
                    states[i].sign *= parentState.sign;
                }
            }

            if(isGlobalActive){
                numGlobalActives++;
            }
            
        }
    }

    uint cellOffset = atomicAdd(numNodes, numGlobalActives);
   
    CellInfo newCell;
    newCell.offset = int(cellOffset);
    newCell.size = numGlobalActives;
    
    cellInfoOutput.data[cellIndex] = newCell;

    int nodeIndex = 0;
    for (int i = 0; i < cellParentInfo.size; i++) {
        NodeState nodeState = states[i];
        if (nodeState.state == NODESTATE_ACTIVE && !nodeState.inactiveAncestors) {
            nodesOutput.data[cellOffset + nodeIndex] = nodes.data[i];
            nodesOutput.data[cellOffset + nodeIndex].parent = states[i].parent;
            nodesOutput.data[cellOffset + nodeIndex].sign = states[i].sign;
            nodeIndex++;
        }
    }
    
}