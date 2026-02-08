#include <vector>
#include <array>

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

void getParents(std::array<int, 25>& parents){
    parents = {-1,0,0,
                2,3,4,5,6,6,5,9,9,4,12,12,
                3,15,15,
                2,18,18,20,21,21,20};
}

void getNodes(std::array<Node, 25>& nodes){
    nodes = {{ {.type = NODE_BINARY, .index = 0, .sign = 0, .parent = -1},
               {.type = NODE_PRIMITIVE, .index = 0, .sign = 0, .parent = 0},
               {.type = NODE_BINARY, .index = 1, .sign = 0, .parent = 0},
               {.type = NODE_BINARY, .index = 2, .sign = 0, .parent = 2},
               {.type = NODE_BINARY, .index = 3, .sign = 0, .parent = 3},
               {.type = NODE_BINARY, .index = 4, .sign = 0, .parent = 4},
               {.type = NODE_BINARY, .index = 5, .sign = 0, .parent = 5},
               {.type = NODE_PRIMITIVE, .index = 1, .sign = 0, .parent = 6},
               {.type = NODE_PRIMITIVE, .index = 2, .sign = 0, .parent = 6},
               {.type = NODE_BINARY, .index = 6, .sign = 0, .parent = 5},
               {.type = NODE_PRIMITIVE, .index = 3, .sign = 0, .parent = 9},
               {.type = NODE_PRIMITIVE, .index = 4, .sign = 0, .parent = 9},
               {.type = NODE_BINARY, .index = 7, .sign = 0, .parent = 4},
               {.type = NODE_PRIMITIVE, .index = 5, .sign = 0, .parent = 12},
               {.type = NODE_PRIMITIVE, .index = 6, .sign = 0, .parent = 12},
               {.type = NODE_BINARY, .index = 8, .sign = 0, .parent = 3},
               {.type = NODE_PRIMITIVE, .index = 7, .sign = 0, .parent = 15},
               {.type = NODE_PRIMITIVE, .index = 8, .sign = 0, .parent = 15},
               {.type = NODE_BINARY, .index = 9, .sign = 0, .parent = 2},
               {.type = NODE_PRIMITIVE, .index = 9, .sign = 0, .parent = 18},
               {.type = NODE_BINARY, .index = 10, .sign = 0, .parent = 18},
               {.type = NODE_BINARY, .index = 11, .sign = 0, .parent = 20},
               {.type = NODE_PRIMITIVE, .index = 10, .sign = 0, .parent = 21},
               {.type = NODE_PRIMITIVE, .index = 11, .sign = 0, .parent = 21},
               {.type = NODE_PRIMITIVE, .index = 12, .sign = 0, .parent = 20}
            }};
}

void getPrimitives(std::array<Primitive, 13>& primitives){
    // Primitive floor = {.data = {.floor = Floor{}}, .type = PRIMITIVE_FLOOR};
    // Primitive circleA = {.data = {.cylinder = Cylinder{-0.46, -0.5, 0.5, 0.5}}, .type = PRIMITIVE_CYLINDER};
    // Primitive internalCircleA = {.data = {.cylinder = Cylinder{-0.46, -0.5, 0.42, 0.51}}, .type = PRIMITIVE_CYLINDER};
    // Primitive circleB = {.data = {.cylinder = Cylinder{0, 0.296743, 0.5, 0.5}}, .type = PRIMITIVE_CYLINDER};
    // Primitive internalCircleB = {.data = {.cylinder = Cylinder{0, 0.296743, 0.42, 0.51}}, .type = PRIMITIVE_CYLINDER};
    // Primitive circleC = {.data = {.cylinder = Cylinder{0.46, -0.5, 0.5, 0.5}}, .type = PRIMITIVE_CYLINDER};
    // Primitive internalCircleC = {.data = {.cylinder = Cylinder{0.46, -0.5, 0.42, 0.51}}, .type = PRIMITIVE_CYLINDER};
    // Primitive boxCCutter = {.data = {.box = Box{0.46, -0.5, 1.690, 1.0, 0.16, 0.51}}, .type = PRIMITIVE_BOX};
    // Primitive boxMidCutter = {.data = {.box = Box{0.46, -0.5, -0.5774,-1.15, 0.16, 0.51}}, .type = PRIMITIVE_BOX};
    // Primitive boxYellow = {.data = {.box = Box{0.46, -0.5, -0.5774,-1.15, 0.16, 0.50}}, .type = PRIMITIVE_BOX};
    // Primitive boxYellowCutter = {.data = {.box = Box{0.46, -0.5, -0.5774,-1.15, 0.02, 0.51}}, .type = PRIMITIVE_BOX};
    // Primitive circleYellowCutter = {.data = {.cylinder = Cylinder{0.46, -0.5, 0.42, 0.51}}, .type = PRIMITIVE_CYLINDER};
    // Primitive planeYellowCutter = {.data = {.planeCutter = PlaneCutter{}}, .type = PRIMITIVE_PLANE_CUTTER};

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

void getBinaryOperations(std::array<BinaryOperation, 12>& binaryOperations){
    BinaryOperation min1 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation min2 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation max1 = {.k = 0, .s= -1, .ca = 1 , .cb = -1};
    BinaryOperation min3 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation min4 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation max2 = {.k = 0, .s= -1, .ca = 1 , .cb = -1};
    BinaryOperation max3 = {.k = 0, .s= -1, .ca = 1 , .cb = -1};
    BinaryOperation max4 = {.k = 0, .s= -1, .ca = 1 , .cb = -1};
    BinaryOperation min5 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation max5 = {.k = 0, .s= -1, .ca = 1 , .cb = -1};
    BinaryOperation min6 = {.k = 0, .s= 1, .ca = 1 , .cb = 1};
    BinaryOperation min7 = {.k = 0.060, .s= 1, .ca = 1 , .cb = 1};

    binaryOperations = {min1,
                        min2,
                        max1,
                        min3,
                        min4,
                        max2,
                        max3,
                        max4,
                        min5,
                        max5,
                        min6,
                        min7};
}

