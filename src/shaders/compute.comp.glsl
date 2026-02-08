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


layout(local_size_x = 1, local_size_y = 1, local_size_z = 1) in;

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
    uint offset;
    uint size;
};


struct Stack{
    float value;
    int index;
};

struct NodeState{
    int state;
    bool inactiveAncestors;
};

layout(std430, binding = 0) buffer PrimitivesBuffer {
    Primitive data[];
} primitives;

layout(std430, binding = 1) buffer BinaryOperationsBuffer {
    BinaryOperation data[];
} binaryOperations;

layout(std430, binding = 2) buffer NodesBuffer {
    Node data[];
} nodes;

layout(std430, binding = 3) buffer CellInfoBuffer {
    int data[];
} cellInfo;



layout(std430, binding = 4) buffer StateOutputBuffer {
    float data[];
} stateOutputData;



layout(std430, binding = 5) buffer NodesOutputBuffer {
    Node data[];
} nodesOutput;

layout(std430, binding = 6) buffer CellInfoOutputBuffer {
    CellInfo data[];
} cellInfoOutput;

layout(std430, binding = 7) buffer NodeCounter {
    uint numNodes;
} ;

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


void main() {

    
    vec3 p = vec3(10, 10, 10);
    float R = 0.5;
    const int cellIndex = 0;

    NodeState states[NODES_MAX];
    Stack stack[NODES_MAX];
    int stackIndex = 0;

    for (int i = NODES_MAX - 1; i >= 0; i--) {
        Node node = nodes.data[i];

        float d;
        if (node.type == NODETYPE_BINARY) {

            BinaryOperation binaryOperation = binaryOperations.data[node.index];
            float leftValue = stack[stackIndex - 1].value;
            float rightValue = stack[stackIndex - 2].value;

            float k = binaryOperation.k;
            int s = binaryOperation.s;
            int ca = binaryOperation.ca;
            int cb = binaryOperation.cb;
            NodeState newState;

            if(s < 0){
                d = max(ca*leftValue, cb*rightValue) + smoothFunction(leftValue, cb*rightValue, k);
            } else {
                d = min(ca*leftValue, cb*rightValue) - smoothFunction(leftValue, rightValue, k);
            }
            if (abs(leftValue - rightValue) <= 2 * R + k) {
               newState.state = NODESTATE_ACTIVE;
            } else {
               newState.state = NODESTATE_SKIPPED;

                if (s * leftValue < s * rightValue) {
                    states[stack[stackIndex - 2].index].state = NODESTATE_INACTIVE;
                    stateOutputData.data[stack[stackIndex - 2].index] = NODESTATE_INACTIVE;
                } else {
                    states[stack[stackIndex - 1].index].state = NODESTATE_INACTIVE;
                    stateOutputData.data[stack[stackIndex - 1].index] = NODESTATE_INACTIVE;
                }
            }
            
            stackIndex -=2;
            newState.inactiveAncestors = false;
            states[i] = newState ;
            stateOutputData.data[i] = newState.state;
        } else if (node.type == NODETYPE_PRIMITIVE) {
            Primitive primitive = primitives.data[node.index];
            d = evalPrimitive(p, primitive);
            NodeState newState;
            newState.state = NODESTATE_ACTIVE;
            newState.inactiveAncestors = false;
            states[i] = newState;
            stateOutputData.data[i] = newState.state;
        }

        Stack newItem;
        newItem.value = d;
        newItem.index = i;
        stack[stackIndex] = newItem;
        stackIndex++;
    }





    uint numGlobalActives = 0;
    for (int i = 0; i < NODES_MAX; i++) {

        bool isGlobalActive = false;
         if (states[i].state == NODESTATE_INACTIVE) {
            states[i].inactiveAncestors = true;
         }else {
            int parentIndex = nodes.data[i].parent;
            bool hasInactiveAncestors = parentIndex >= 0 ? states[parentIndex].inactiveAncestors : false;
            states[i].inactiveAncestors = hasInactiveAncestors;
            isGlobalActive = states[i].state == NODESTATE_ACTIVE && !hasInactiveAncestors;

            if(parentIndex >= 0){
                if(states[parentIndex].state == NODESTATE_SKIPPED){

                    nodes.data[i].parent = nodes.data[parentIndex].parent;
                }
            }

            if(isGlobalActive){
                numGlobalActives++;
            }
            
        }
         
       stateOutputData.data[i] = isGlobalActive ?  1 : 0;
         
    }

    uint cellOffset = atomicAdd(numNodes, numGlobalActives);

    CellInfo newCell;
    newCell.offset = cellOffset;
    newCell.size = numGlobalActives;
    cellInfoOutput.data[cellIndex] = newCell;

    int nodeIndex = 0;
    for (int i = 0; i < NODES_MAX; i++) {
        NodeState nodeState = states[i];
        if (nodeState.state == NODESTATE_ACTIVE && !nodeState.inactiveAncestors) {
            nodesOutput.data[nodeIndex] = nodes.data[i];
            nodeIndex++;
        }
    }
    
}