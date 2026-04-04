/**
 * @brief Pruning Algorithm
 *
 * Pruning algorithm described by Barbier at el. in the paper Lipschitz Pruning  Hierarchical Simplification 
 * of Primitive‐Based SDFs without far-fields procedure.
 *
 * @author Edson Martinelli
 * @date 2026
 */

#version 430 core

/**
 * @defgroup ComputeVariables Compute Variables 
 * @brief Variables related to compute shader and parallel programing.
*/

/**
 * @defgroup SSBOVariables SSBO Variables 
 * @brief Variables related to configuration and use of SSBOs.
*/

/**
 * @defgroup ConfigVariables Configuration Variables 
 * @brief Variables related to algorithm configuration.
*/

/**
 * @defgroup RayVariables Ray Variables
 * @brief Variables related to Ray Marching.
*/

#define PRIMITIVE_CYLINDER 0 /*< Define the number for primitive cylinder (extruded circle). */
#define PRIMITIVE_BOX 1 /*< Define the number for primitive box (extruded retangle). */
#define PRIMITIVE_PLANE_CUTTER 2 /*< Define the number for primitive plane cutter (extruded plane with sin).*/
#define PRIMITIVE_FLOOR 3 /*< Define the number for primitive plane. */

#define NODETYPE_PRIMITIVE 0 /*< Define node type as a primitive.*/
#define NODETYPE_BINARY 1 /*< Define node type as a binary operation.*/

#define NODESTATE_ACTIVE 0 /*< Define node state as active.*/
#define NODESTATE_SKIPPED 1 /*< Define node state as skipped.*/
#define NODESTATE_INACTIVE 2 /*< Define node state as innactive.*/

/**
 * @ingroup ComputeVariables
 * @brief Size for each work group.
*/
layout(local_size_x = 4, local_size_y = 4, local_size_z = 4) in;

/**
 * @ingroup SSBOVariables
 * @brief Binary operation node struct.
*/
struct BinaryOperation{
    float k; /**< Smooth radius.*/
    int s; /**< Operation constraint: max or min.*/
    int ca; /**< Value for left node.*/
    int cb; /**< Value for right node.*/
};

/**
 * @ingroup SSBOVariables
 * @brief Primitive node struct.
*/
struct Primitive{
    //box
    float sideCenterX; /**< Center point of box origin side in X axis.*/
    float sideCenterY; /**< Center point of box origin side in Y axis.*/
    float m; /**<  Box slope.*/
    float xEnd; /**< X coordenate of the center point of box end side.*/
    float th; /**< Thickness of the box.*/

    //cylinder
    float offsetX; /**< Cylinder offset in the X axis.*/
    float offsetY; /**< Cylinder offset in the Y axis.*/
    float r; /**< Cylinder radius.*/

    float depth; /**< Extrude depth.*/
    uint type; /**< Type of primitive.*/

    float pad0, pad1; /**< Paddings for alignment.*/
};

/**
 * @ingroup SSBOVariables
 * @brief General node struct.
*/
struct Node{
    int type; /**< Type of node.*/
    int index; /**< Index of the position in original array (Primitive or Binary Operation) for the node.*/
    int sign; /**< Signal used by the parent in the node calculation.*/
    int parent; /**< Node parent in the node array.*/
};

/**
 * @ingroup SSBOVariables
 * @brief Tree information for the cell.
*/
struct CellInfo{
    int offset; /**< Tree start in the node array for the cell.*/
    int size;  /**< Tree size in the node array for the cell.*/
};

/**
 * @ingroup SSBOVariables
 * @brief Post order evaluation stack.
*/
struct Stack{
    float value; /**< Node value.*/
    int index; /**< Node index in cell (global index  - offset).*/
};

/**
 * @ingroup SSBOVariables
 * @brief Post order evaluation stack.
*/
struct NodeState{
    int state; /**< Node current state.*/
    bool inactiveAncestors; /**< Innactive parent mark.*/
    int sign; /**< Current signal used by the parent in the node calculation.*/
    int parent; /**< Current parent node. */
};

/**
 * @ingroup SSBOVariables
 * @brief Primitives node array.
*/
layout(std430, binding = 0) readonly buffer PrimitivesBuffer {
    Primitive data[];
} primitives;

/**
 * @ingroup SSBOVariables
 * @brief Binary Operations node array.
*/
layout(std430, binding = 1) readonly buffer BinaryOperationsBuffer {
    BinaryOperation data[];
} binaryOperations;

/**
 * @ingroup SSBOVariables
 * @brief Input node array.
*/
layout(std430, binding = 2) readonly buffer NodesBuffer {
    Node data[];
} nodes;

/**
 * @ingroup SSBOVariables
 * @brief Input cell node array.
*/
layout(std430, binding = 3) readonly buffer CellInfoBuffer {
    CellInfo data[];
} cellInfo;

/**
 * @ingroup SSBOVariables
 * @brief Output node array.
*/
layout(std430, binding = 4) buffer NodesOutputBuffer {
    Node data[];
} nodesOutput;

/**
 * @ingroup SSBOVariables
 * @brief Output cell node array.
*/
layout(std430, binding = 5) buffer CellInfoOutputBuffer {
    CellInfo data[];
} cellInfoOutput;


/**
 * @ingroup SSBOVariables
 * @brief Node counter.
*/
layout(std430, binding = 6) buffer NodeCounter {
    uint numNodes;
};

/**
 * @ingroup ConfigVariables
 * @brief AABB points to pruning algorithm.
*/
layout(std140, binding = 0) uniform AABBData {
    vec4 maximum;
    vec4 minimum;
} aabb;

/**
 * @ingroup ConfigVariables
 * @brief Number of espace subdivisions per axis to pruning algorithm.
*/
layout(location = 0) uniform int subdivisions;

/**
 * @ingroup ConfigVariables
 * @brief Maxmimum number of nodes.
*/
const int NODES_MAX = 25;

/**
 * @ingroup RayVariables
 * @brief Minimun next step to consider the ray hits a surface (maximun error). 
*/
float e = 0.0001;

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
float smoothFunction( float a, float b, float k ){
    if(k == 0) return 0;
    float d = abs(a - b);
    float h = max(k - d, 0.0);
    return h * h * (1.0 / (4.0 * k));
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
 * x coordenate of end.
 *
 * @param [in] p Normalized 2D pixel position.
 * @param [in] sideOriginCenter Center point of box origin side.
 * @param [in] m Box slope.
 * @param [in] xEndCenter X coordenate of the center point of box end side.
 * @param [in] th Thickness of the box.
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
 * A simples Circle function representing a circle 2D positioned in space center (0,0,0).
 *
 * @param [in] p Normalized 2D pixel position.
 * @param [in] r Circle radius.
 * @return The correct value of SDF at the position.
 */
float sdCircle(vec3 p3, vec2 offset, float r, float depth){
    vec2 p = p3.xy - offset;
    float v = length(p) - r;
    return opExtrusion(p3, v, depth);
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
float sdFloor(vec3 p){
    return p.y + 1.0;
}

/**
 * @brief Primitive Evaluation.
 *
 * Primitive type evaluation from node.
 *
 * @param [in] p Normalized 3D space position.
 * @param [in] pr Primitive type.
 * @return  The correct value of SDF at the position.
 */
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

/**
 * @brief Get index by Global Identificator.
 *
 * Use size of subdivisions and Global Identificator to determine cell index.
 *
 * @param [in] globalID Global thread identificator .
 * @param [in] pr Subdivision size.
 * @return The correct value of index for the cell.
 */
uint getCellIndex(uvec3 globalID, uint size){
    return (globalID.z * size * size) + (globalID.y * size) + globalID.x;
}


void main() {

    uint cellIndex = getCellIndex(gl_GlobalInvocationID, subdivisions);

    uvec3 parentIndex = gl_GlobalInvocationID.xyz / 4;
    uint parentSubdivisions = subdivisions / 4;

    uint cellParentIndex = getCellIndex( parentIndex,  parentSubdivisions);

    CellInfo cellParentInfo = cellInfo.data[cellParentIndex];

    vec3 cellSize = (aabb.maximum.xyz - aabb.minimum.xyz) / subdivisions;
    vec3 cellCenter = aabb.minimum.xyz + cellSize * (vec3(gl_GlobalInvocationID.xyz) + 0.5);    

    float R = length(cellSize) * 0.5;

    NodeState states[NODES_MAX];
    Stack stack[NODES_MAX];
    int stateIndex = 0;
    int stackIndex = 0;
    
    for (int i = cellParentInfo.offset; i < (cellParentInfo.size + cellParentInfo.offset); i++) {
        Node node = nodes.data[i];
        int si = node.sign;

        float d;
        NodeState newState;
        if (node.type == NODETYPE_BINARY) {

            BinaryOperation binaryOperation = binaryOperations.data[node.index];
            float leftValue = stack[stackIndex - 2].value;
            float rightValue = stack[stackIndex - 1].value;

            float k = binaryOperation.k;
            int s = binaryOperation.s;

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
        } else if (node.type == NODETYPE_PRIMITIVE) {
            Primitive primitive = primitives.data[node.index];
            d = evalPrimitive(cellCenter, primitive);
            newState.state = NODESTATE_ACTIVE;
        }

        newState.inactiveAncestors = false;
        newState.parent = node.parent;
        newState.sign = node.sign;
        states[stateIndex] = newState;

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
            int parentIndex = states[i].parent;
            bool hasInactiveAncestors = parentIndex >= 0 ? states[parentIndex].inactiveAncestors : false;
            states[i].inactiveAncestors = hasInactiveAncestors;
            isGlobalActive = states[i].state == NODESTATE_ACTIVE && !hasInactiveAncestors;

            if(parentIndex >= 0){
                if( states[parentIndex].state == NODESTATE_SKIPPED){
                    states[i].parent = states[parentIndex].parent;
                    states[i].sign *= states[parentIndex].sign;
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

    int oldToNewIndex[NODES_MAX];
    for(int i=0; i<NODES_MAX; i++) oldToNewIndex[i] = -1;

    int currentIdx = 0;
    for (int i = 0; i < cellParentInfo.size; i++) {
        if (states[i].state == NODESTATE_ACTIVE && !states[i].inactiveAncestors) {
            oldToNewIndex[i] = currentIdx++;
        }
    }

    int nodeIndex = 0;
    for (int i = 0; i < cellParentInfo.size; i++) {
        NodeState nodeState = states[i];
        if (nodeState.state == NODESTATE_ACTIVE && !nodeState.inactiveAncestors) {
            nodesOutput.data[cellOffset + nodeIndex] = nodes.data[cellParentInfo.offset + i];
            nodesOutput.data[cellOffset + nodeIndex].parent = states[i].parent >= 0 ? oldToNewIndex[states[i].parent] : -1;
            nodesOutput.data[cellOffset + nodeIndex].sign = states[i].sign;
            nodeIndex++;
        }
    }
}