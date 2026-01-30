#version 430 core

#define PRIMITIVE_SPHERE 0
#define PRIMITIVE_BOX 1
#define PRIMITIVE_CYLINDER 2
#define PRIMITIVE_CONE 3

#define NODETYPE_BINARY 0
#define NODETYPE_PRIMITIVE 1

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

// layout(std430, binding = 2) buffer BinaryOperationsBuffer {
//     BinaryOperation data[];
// } binaryOperations;

// layout(std430, binding = 3) buffer NodesBuffer {
//     Node data[];
// } nodes;

// layout(std430, binding = 4) buffer ParentsBuffer {
//     int data[];
// } parentsData;

void main() {
    uint id = gl_GlobalInvocationID.x;
    dataData.data[id] = dataData.data[id] * 2.0;
}