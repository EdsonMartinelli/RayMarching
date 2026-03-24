#include <vector>
#include <array>


struct vec4{
    float x;
    float y;
    float z;
    float w;
};

struct AABB{
    vec4 maximum;
    vec4 minimum;
};

struct BinaryOperation{
    float k; // raio do smooth
    int s; // operação: max ou min
    int ca; // valor para a esquerda
    int cb; // valor para a direita
};

enum PrimitiveType {
    PRIMITIVE_CYLINDER,
    PRIMITIVE_BOX,
    PRIMITIVE_PLANE_CUTTER,
    PRIMITIVE_FLOOR
};

enum NodeType{
    NODE_PRIMITIVE = 0,
    NODE_BINARY = 1
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
    PrimitiveType type;

    float pad0, pad1;
};

struct Node{
    NodeType type;
    int index;
    int sign; //<--
    int parent; //<--
};

struct CellInfo{
    int offset;
    int size;
};

void getAABB(struct AABB& aabb){
    vec4 max = {.x = 2.0f, .y = 2.0f, .z = 2.0f, .w = 0.0f};
    vec4 min = {.x = -2.0f, .y = -2.0f, .z = -2.0f, .w = 0.0f};

    aabb = {.maximum = max, .minimum = min};
}

void getPrimitivesPost2(std::array<Primitive, 13>& primitives){
    Primitive floor = {.type = PRIMITIVE_FLOOR};
    Primitive circleA = {.offsetX = -0.46, .offsetY = -0.5, .r = 0.5, .depth = 0.5, .type = PRIMITIVE_CYLINDER};
    Primitive internalCircleA = {.offsetX = -0.46, .offsetY = -0.5, .r = 0.42, .depth = 0.51, .type = PRIMITIVE_CYLINDER};
    Primitive circleB = {.offsetX = 0, .offsetY = 0.296743, .r = 0.5, .depth = 0.5, .type = PRIMITIVE_CYLINDER};
    Primitive internalCircleB = {.offsetX = 0, .offsetY = 0.296743, .r = 0.42, .depth = 0.51, .type = PRIMITIVE_CYLINDER};
    Primitive circleC = {.offsetX = 0.46, .offsetY = -0.5, .r = 0.5, .depth = 0.5, .type = PRIMITIVE_CYLINDER};
    Primitive internalCircleC = {.offsetX = 0.46, .offsetY = -0.5, .r = 0.42, .depth = 0.51, .type = PRIMITIVE_CYLINDER};
    Primitive boxCCutter = {.sideCenterX = 0.46, .sideCenterY = -0.5, .m = 1.690, .xEnd = 1, .th = 0.16, .depth = 0.51, .type = PRIMITIVE_BOX};
    Primitive boxMidCutter = {.sideCenterX = 0.46, .sideCenterY = -0.5, .m = -0.5774, .xEnd = -1.15, .th = 0.16, .depth = 0.51, .type = PRIMITIVE_BOX};
    Primitive boxYellow = {.sideCenterX = 0.46, .sideCenterY = -0.5, .m = -0.5774, .xEnd = -1.15, .th = 0.16, .depth = 0.5, .type = PRIMITIVE_BOX};
    Primitive boxYellowCutter = {.sideCenterX = 0.46, .sideCenterY = -0.5, .m = -0.5774, .xEnd = -1.15, .th = 0.02, .depth = 0.51, .type = PRIMITIVE_BOX};
    Primitive circleYellowCutter = {.offsetX = 0.46, .offsetY = -0.5, .r = 0.42, .depth = 0.51, .type = PRIMITIVE_CYLINDER};
    Primitive planeYellowCutter = {.type = PRIMITIVE_PLANE_CUTTER};


    primitives = {floor,
                  circleA,
                  internalCircleA,
                  circleB,
                  internalCircleB,
                  circleC, 
                  internalCircleC,
                  boxCCutter,
                  boxMidCutter,
                  boxYellow,
                  boxYellowCutter,
                  circleYellowCutter,
                  planeYellowCutter};
}


void getBinaryOperationsPost2(std::array<BinaryOperation, 12>& binaryOperations){
    BinaryOperation max1 = {.k = 0, .s= -1, .ca = 1 , .cb = -1};
    BinaryOperation max2 = {.k = 0, .s= -1, .ca = 1 , .cb = -1};
    BinaryOperation min1 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation max3 = {.k = 0, .s= -1, .ca = 1 , .cb = -1};
    BinaryOperation min2 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation min3 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation max4 = {.k = 0, .s= -1, .ca = 1 , .cb = -1};
    BinaryOperation min4 = {.k = 0.060, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation min5 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation max5 = {.k = 0, .s= -1, .ca = 1 , .cb = -1};
    BinaryOperation min6 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation min7 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};


    binaryOperations = {max1,
                        max2,
                        min1,
                        max3,
                        min2,
                        min3,
                        max4,
                        min4,
                        min5,
                        max5,
                        min6,
                        min7};
}

void getNodesPost3(std::array<Node, 25>& nodes){
    nodes = {{ {.type = NODE_PRIMITIVE, .index = 0, .sign = 1, .parent = 24}, //0
               {.type = NODE_PRIMITIVE, .index = 1, .sign = 1, .parent = 3}, //1
               {.type = NODE_PRIMITIVE, .index = 2, .sign = -1, .parent = 3}, //2
               {.type = NODE_BINARY, .index = 0, .sign = 1, .parent = 7},   //3
               {.type = NODE_PRIMITIVE, .index = 3, .sign = 1, .parent = 6},  //4
               {.type = NODE_PRIMITIVE, .index = 4, .sign = -1, .parent = 6}, //5
               {.type = NODE_BINARY, .index = 1, .sign = 1, .parent = 7},   //6
               {.type = NODE_BINARY, .index = 2, .sign = 1, .parent = 11},  //7
               {.type = NODE_PRIMITIVE, .index = 5, .sign = 1, .parent = 10},  //8
               {.type = NODE_PRIMITIVE, .index = 6, .sign = -1, .parent = 10},  //9
               {.type = NODE_BINARY, .index = 3, .sign = 1, .parent = 11},   //10
               {.type = NODE_BINARY, .index = 4, .sign = 1, .parent = 15},   //11
               {.type = NODE_PRIMITIVE, .index = 7, .sign = 1, .parent = 14}, //12
               {.type = NODE_PRIMITIVE, .index = 8, .sign = 1, .parent = 14}, //13
               {.type = NODE_BINARY, .index = 5, .sign = -1, .parent = 15},   //14
               {.type = NODE_BINARY, .index = 6, .sign = 1, .parent = 23},   //15


               {.type = NODE_PRIMITIVE, .index = 9, .sign = 1, .parent = 22}, //16
               {.type = NODE_PRIMITIVE, .index = 10, .sign = 1, .parent = 19}, //17
               {.type = NODE_PRIMITIVE, .index = 11, .sign = 1, .parent = 19}, //18
               {.type = NODE_BINARY, .index = 7, .sign = 1, .parent = 21},  //19
               {.type = NODE_PRIMITIVE, .index = 12, .sign = 1, .parent = 21},  //20
               {.type = NODE_BINARY, .index = 8, .sign = -1, .parent = 22}, // 21
               {.type = NODE_BINARY, .index = 9, .sign = 1, .parent = 23}, //22
               {.type = NODE_BINARY, .index = 10, .sign = 1, .parent = 24}, //23
               {.type = NODE_BINARY, .index = 11, .sign = 1, .parent = -1} //24   
            }};
}

