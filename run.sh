#!/bin/bash

DIRECTORY="build"
FLAGS="-Iinclude -lglfw -lGL -lXrandr -lXxf86vm -lXi -lXinerama -lX11 -lrt -ldl -pthread"

if [ ! -d "$DIRECTORY" ]; then
  mkdir $DIRECTORY
fi

g++ -std=c++20 dep/glad.c dep/shader.cpp src/main.cpp -o build/app.o $FLAGS

./build/app.o