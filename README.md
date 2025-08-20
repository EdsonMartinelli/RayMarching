# PGC - RayMarching

## ⚙️ Dependências

Esse programa depende da biblioteca GLFW que pode ser obtida através da instalção dos pacotes:

```sh
sudo apt-get install libglfw3
sudo apt-get install libglfw3-dev
```

Além dessa forma, é possível compilar a biblioteca GLFW diretamente dos [arquivos fontes](https://www.glfw.org/download.html), configurando-a para seu gerenciador de janelas.

## 🚀 Compilando e Executando

Devido a simplicidade, atualmente a compilação é feita sem intermédio de makefiles ou ferramentas como CMake, usando apenas um arquivo bash para isso.

A execução do arquivo **run.sh** na raiz do projeto cria uma pasta build, compila o projeto em um arquivo **app.o** e faz sua execução:

```sh
./run.sh
```

## 📘 Gerando Documentação

Para gerar a documentação é necessario instalar o Doxygen e executar:

```sh
doxygen Doxyfile
```

Uma pasta docs será criarada e os arquivos web e latex estarão disponíveis nela.
