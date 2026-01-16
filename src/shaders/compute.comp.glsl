#version 430 core

layout(local_size_x = 4, local_size_y = 1, local_size_z = 1) in;

layout(std430, binding = 0) buffer DataBuffer {
    float data[];
} dataData;

void main() {
    uint id = gl_GlobalInvocationID.x;
    dataData.data[id] = dataData.data[id] * 2.0;
}