
"use strict";

// -----------------------------------------------------------------------------------------
//

const FUNDO = [0, 1, 1, 1];

// -----------------------------------------------------------------------------------------
// variáveis globais
var gl;
var gCanvas;
var gShader = {};  // encapsula globais do shader
var gBufCores;

// Os códigos fonte dos shaders serão descritos em
// strings para serem compilados e passados a GPU
var gVertexShaderSrc;
var gFragmentShaderSrc;

// Define o objeto a ser desenhado: uma lista de vértices
// com coordenadas no intervalo (0,0) a (200, 200)
var gPosicoes = [];
var gCores = [];
var gObjetos = [];
var gUltimoT = Date.now();
var gLider;


// -----------------------------------------------------------------------------------------

window.onload = main;

function main() {
    gCanvas = document.getElementById("glcanvas");
    gl = gCanvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");


    gObjetos.push(new Triangulo(0, 0, 0.2, 0.5, 0.5, [1,0,0,1]));
    gObjetos.push(new Triangulo(0, 0.5, 0.2, 0.5, 0.5, sorteieCorRGBA()));
    gLider = gObjetos[0];


    crieShaders();

    gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);

    desenhe();
}


function crieShaders() {
    //  cria o programa
    gShader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
    gl.useProgram(gShader.program);

    // carrega dados na GPU
    gShader.bufPosicoes = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gShader.bufPosicoes);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gPosicoes), gl.STATIC_DRAW);

    // Associa as variáveis do shader ao buffer gPosicoes
    var aPositionLoc = gl.getAttribLocation(gShader.program, "aPosition");
    // Configuração do atributo para ler do buffer
    // atual ARRAY_BUFFER
    let size = 2;          // 2 elementos de cada vez - vec2
    let type = gl.FLOAT;   // tipo de 1 elemento = float 32 bits
    let normalize = false; // não normalize os dados
    let stride = 0;        // passo, quanto avançar a cada iteração depois de size*sizeof(type)
    let offset = 0;        // começo do buffer
    gl.vertexAttribPointer(aPositionLoc, size, type, normalize, stride, offset);
    gl.enableVertexAttribArray(aPositionLoc);

    // buffer de cores
    gBufCores = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gBufCores);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gCores), gl.STATIC_DRAW);
    var aColorLoc = gl.getAttribLocation(gShader.program, "aColor");
    gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, true, 0, 0);
    gl.enableVertexAttribArray(aColorLoc);

    // resolve os uniforms
    gShader.uResolution = gl.getUniformLocation(gShader.program, "uResolution");
    gShader.uTranslation = gl.getUniformLocation(gShader.program, "uTranslation");

}

function desenhe() {
    let now = Date.now();
    let delta = (now - gUltimoT) / 1000;
    gUltimoT = now;


    // desenha vertices
    gPosicoes = [];
    for (let i = 0; i < gObjetos.length; i++)
        gObjetos[i].atualize(delta);

    // atualiza o buffer de vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, gShader.bufPosicoes);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gPosicoes), gl.STATIC_DRAW);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, gPosicoes.length);

    window.requestAnimationFrame(desenhe);
}

function aproximeTriangulo(raio)
{
    return [
        vec4(0, raio, 0, 1),
        vec4(raio/3, 0, 0, 1),
        vec4(-raio/3, 0, 0, 1) ]
}

function Triangulo (x, y, r, vx, vy, cor)
{
    this.vertices = aproximeTriangulo(r);
    this.nv = this.vertices.length;
    this.vel = vec4(vx, vy, 0, 0);
    this.cor = cor;
    this.pos = vec4(x, y, 0, 1);
    let nv = this.nv;
    let vert = this.vertices;

    for (let i = 0; i < nv; i++)
    {
        let matriz_r = rotate(0, vec3(0,0,1));
        let matriz_t = translate(x, y, 0);
        let M = mult(matriz_t, matriz_r)

        vert[i] = mult(M, vert[i]);
        gPosicoes.push(vec2(vert[i][0], vert[i][1]))
    }
    gPosicoes.push(vec2(vert[0][0], vert[0][1]))

    gCores.push(cor);
    gCores.push(cor);
    gCores.push(cor);

    this.atualize = function (delta)
    {
        this.pos = add(this.pos, mult(delta, this.vel));

        let x, y;
        let vx, vy;
        x = this.pos[0];
        y = this.pos[1];

        vx = this.vel[0];
        vy = this.vel[1];

        if (x < -1) { x = -1; vx = -vx; }
        if (y < -1) { y = -1; vy = -vy; }
        if (x >= 1) { x = 1; vx = -vx; }
        if (y >= 1) { y = 1; vy = -vy; }

        this.vel = vec4(vx, vy, 0, 0);

        if (this !== gLider)
        {
            let vetor = subtract(gLider.pos, this.pos);
            let d = length(vetor)

            if (Math.abs(d) > 0.00001)
            {
                let forca = subtract(vetor, this.vel);
                this.vel = add(this.vel, forca);
            }
        }

        let nv = this.nv;
        let vert = this.vertices;

        for (let i = 0; i < nv; i++)
        {
            let matriz_r = rotateZ(-1)
            let matriz_t1 = translate(-x, -y, 0)
            let matriz_t2 = translate(x, y, 0)

            vert[i] = mult(matriz_t1, vert[i]);
            vert[i] = mult(matriz_r, vert[i]);
            vert[i] = mult(matriz_t2, vert[i]);

            vert[i] = add(vert[i], mult(delta, this.vel));

            gPosicoes.push(vec2(vert[i][0], vert[i][1]));
        }
    }
}

function distancia (obj_1, obj_2)
{
    let x1 = obj_1.pos[0];
    let y1 = obj_1.pos[1];
    let x2 = obj_2.pos[0];
    let y2 = obj_2.pos[1];
    let width = gCanvas.width;
    let height = gCanvas.height;

    /*
    x1 = (x1 + 1) * (width)/(2.0);
    x2 = (x2 + 1) * (width)/(2.0);
    y1 = (y1 - 1) * (-height)/(2.0);
    y2 = (y2 - 1) * (-height)/(2.0);

     */


    let d = Math.sqrt((x1-x2)**2 + (y1-y2)**2);

    return d;
}

// -----------------------------------------------------------------------
// Código fonte do Webgl em GLSL

gVertexShaderSrc = `#version 300 es

// aPosition é um buffer de entrada
in vec2 aPosition;
in vec4 aColor;  // buffer com a cor de cada vértice
out vec4 vColor; // varying -> passado ao fShader

void main() {

    gl_Position = vec4(aPosition, 0, 1);
    vColor = aColor; 
}
`;

gFragmentShaderSrc = `#version 300 es

// Vc deve definir a precisão do FS.
// Use highp ("high precision") para desktops e mediump para mobiles.
precision highp float;

// out define a saída 
in vec4 vColor;
out vec4 outColor;

void main() {
  outColor = vColor;
}
`;
