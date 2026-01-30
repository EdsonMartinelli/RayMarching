#!/bin/bash

DIRECTORY="build-win"
FLAGS="-Iinclude -lopengl32 -lgdi32 -static -static-libgcc -static-libstdc++"

if [ ! -d "$DIRECTORY" ]; then
  mkdir $DIRECTORY
fi

x86_64-w64-mingw32-g++ -std=c++20 dep/glad.c dep/shader.cpp src/main.cpp dep/glfw-win/libglfw3.a -o build-win/app.exe $FLAGS  

WIN_PATH=$(wslpath -w "$(pwd)/build-win/app.exe")


powershell.exe -Command "Start-Process powershell -ArgumentList '-NoExit','chcp 65001; [console]::OutputEncoding = [System.Text.Encoding]::UTF8; & \"$WIN_PATH\"'"
