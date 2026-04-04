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
 * @defgroup SSBOVariables SSBO Variables 
 * @brief Variables related to configuration and use of SSBOs.
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

layout (location = 2) uniform int subdivisions;

vec4 aabbMax = vec4(2.0, 2.0, 2.0, 0.0);
vec4 aabbMin = vec4(-2.0, -2.0, -2.0, 0.0);

// vec4 aabbMax = vec4(32.0, 2.0, 32.0, 0.0);
// vec4 aabbMin = vec4(-32.0, -2.0, -32.0, 0.0);


#define PRIMITIVE_CYLINDER 0 /*< Define the number for primitive cylinder (extruded circle). */
#define PRIMITIVE_BOX 1 /*< Define the number for primitive box (extruded retangle). */
#define PRIMITIVE_PLANE_CUTTER 2 /*< Define the number for primitive plane cutter (extruded plane with sin).*/
#define PRIMITIVE_FLOOR 3 /*< Define the number for primitive plane. */

#define NODETYPE_PRIMITIVE 0 /*< Define node type as a primitive.*/
#define NODETYPE_BINARY 1 /*< Define node type as a binary operation.*/

const int NODES_MAX = 25; /*< Define the maximum number the nodes per tree.*/

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
    uint offset; /**< Tree start in the node array for the cell.*/
    uint size; /**< Tree size in the node array for the cell.*/
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
layout(std430, binding = 0) readonly restrict buffer PrimitivesBuffer {
    Primitive data[];
} primitives;

/**
 * @ingroup SSBOVariables
 * @brief Binary Operations node array.
*/
layout(std430, binding = 1) readonly restrict buffer BinaryOperationsBuffer {
    BinaryOperation data[];
} binaryOperations;

/**
 * @ingroup SSBOVariables
 * @brief Main node array for renderization.
*/
layout(std430, binding = 2) readonly restrict buffer NodesBuffer {
    Node data[];
} nodes;

/**
 * @ingroup ObjVariables
 * @brief Object hit struct.
 */
layout(std430, binding = 3) readonly restrict buffer CellInfoBuffer {
    CellInfo data[];
} cellInfo;


/**
 * @ingroup SSBOVariables
 * @brief Far-fields values input.
*/
layout(std430, binding = 4) buffer FarFieldValuesBuffer {
    float data[];
} farFieldValues;











/**
 * @ingroup RayVariables
 * @brief Ray information struct.
*/
struct RayInfo{
    //ObjectHit objHit; /**< Object hit at the point */  
    float value; /**< Value at the point */  
    float dist; /**< Distance from camera origin */  
    float count; /**< Steps from camera origin */
};

/**
 * @ingroup CameraVariables
 * @brief Rays origin.
*/
vec3 origin = vec3(1.0, 0.0, 1.999);
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
 * @brief Get the cell index.
 *
 * Get the correct cell index using size of subdivision and the position of cell.
 *
 * @param [in] posCell Cell position.
 * @param [in] subd Subdividison quantity.
 * @return Correct cell index.
 */
uint getCellIndex(ivec3 posCell, uint subd){
    return (posCell.z * subd * subd) + (posCell.y * subd) + posCell.x;
}

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
 * @return The correct value of SDF at the position.
 */
float sdFloor(vec3 p){
    return p.y + 1.0;
}

/**
 * @brief SDF Evaluation.
 *
 * SDF evaluation function for each primitive.
 *
 * @param [in] p Normalized 3D space position.
 * @return The correct value of SDF at the position.
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
 * @brief Complete World SDF .
 *
 * SDF function that combines UFABC logo SDF and plane SDF using min funcion at a given point.
 *
 * @param [in] p Normalized 3D space position.
 * @return The struct ObjectHit with the object color and the correct value of SDF at the position.
 */
float sdf(vec3 p, int offset, int size, uint cellIndex){

    if(size == 0){
         return farFieldValues.data[cellIndex];
    }

    float stack[NODES_MAX];
    int stackIndex = 0;

    for (int i = offset; i < (size + offset); i++) {
        Node node = nodes.data[i];
        int si = node.sign;
        float d;
        if (node.type == NODETYPE_BINARY) {

            BinaryOperation binaryOperation = binaryOperations.data[node.index];
            float leftValue = stack[stackIndex - 2];
            float rightValue = stack[stackIndex - 1];

            float k = binaryOperation.k;
            int s = binaryOperation.s;
            d = s * (min(s * leftValue, s * rightValue) - smoothFunction(leftValue, rightValue, k));
            
            stackIndex -=2;
        } else if (node.type == NODETYPE_PRIMITIVE) {
            Primitive primitive = primitives.data[node.index];
            d = evalPrimitive(p, primitive);
        }

        stack[stackIndex] = d * si;
        stackIndex++;
    }

    return stack[0];
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
vec3 getNormal(in vec3 p, uint cellIndex) {	
	vec3 normal;
    float hOffset = 0.0001;
	vec2 h = vec2(hOffset, 0.0);
    int cellOffset = int(cellInfo.data[cellIndex].offset);
    int cellSize = int(cellInfo.data[cellIndex].size);
    normal.x = sdf(p + h.xyy, cellOffset, cellSize, cellIndex) - sdf(p - h.xyy,  cellOffset, cellSize, cellIndex);
	normal.y = sdf(p + h.yxy, cellOffset, cellSize, cellIndex) - sdf(p - h.yxy,  cellOffset, cellSize, cellIndex);
	normal.z = sdf(p + h.yyx, cellOffset, cellSize, cellIndex) - sdf(p - h.yyx,  cellOffset, cellSize, cellIndex);
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
        vec3 p = origin + direction * t;
        if (any(lessThan(p, aabbMin.xyz)) || any(greaterThanEqual(p, aabbMax.xyz))) {
            t = 1e20;
            break;
        }

        vec3 cellSize = (aabbMax.xyz - aabbMin.xyz) / subdivisions;
        ivec3 cell = ivec3((p - aabbMin.xyz) / cellSize);
        cell = clamp(cell, ivec3(0), ivec3(subdivisions - 1));
        int cellIndex = int(getCellIndex(cell, uint(subdivisions)));

        r = sdf(p, int(cellInfo.data[cellIndex].offset), int(cellInfo.data[cellIndex].size), cellIndex);

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
    //origin = vec3(1.999 *sin(iTimer), 0.0, 1.999 *cos(iTimer));
    vec2 uv = normalizeSpace();  
    vec3 direction = getDirection(uv);  
    vec3 cellSize = (aabbMax.xyz - aabbMin.xyz) / subdivisions;

    RayInfo ri = rayMarching(direction);

    float p = 1 - (gl_FragCoord.y / iResolution.y);
    vec3 color = vec3(0.4,0.4,1.0) + vec3(p);
    
    if(ri.dist < D) {
        vec3 position = origin + direction * ri.dist;
        
        ivec3 cell = ivec3((position - aabbMin.xyz) / cellSize);
        cell = clamp(cell, ivec3(0), ivec3(subdivisions - 1));
        int cellIndex = int(getCellIndex(cell, uint(subdivisions)));

        vec3 normal = getNormal(position, cellIndex);
        color =  normal;       
    }

    fragColor = vec4(gammaCorrection(color),1.0);
}