/**
 * Esqueleto de um programa usando WegGL
 * Dessa vez usando as bibliotecas
 * macWebglUtils.js
 * MVnew.js do livro do Angel -- Interactive Computer Graphics
 */

"use strict";

// ==================================================================
// constantes globais

const FUNDO = [0, 1, 1, 1];
const DISCO_RES = 3;
const DISCO_UMA_COR = true;

// ==================================================================
// variáveis globais
var gl;
var gCanvas;
var gShader = {};  // encapsula globais do shader

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

// ==================================================================
window.onload = main;

function main() {
    gCanvas = document.getElementById("glcanvas");
    gl = gCanvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gObjetos.push(new Triangulo(50, 140, sorteieInteiro(50, 80), -50, 100, sorteieCorRGBA()));
    gObjetos.push(new Triangulo(150, 240, sorteieInteiro(15, 50), 150, -70, sorteieCorRGBA()));

    crieShaders();

    gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);

    let matrix = mat2(rotate(45, vec3(0,0,1)))
    console.log(matrix)

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
    var bufCores = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufCores);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(gCores), gl.STATIC_DRAW);
    var aColorLoc = gl.getAttribLocation(gShader.program, "aColor");
    gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aColorLoc);

    // resolve os uniforms
    gShader.uResolution = gl.getUniformLocation(gShader.program, "uResolution");

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

    gl.uniform2f(gShader.uResolution, gCanvas.width, gCanvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, gPosicoes.length);

    window.requestAnimationFrame(desenhe);
}

function aproximeDisco(raio, ref = 3)
{
    return [
        vec2(raio, 0),
        vec2(0, raio),
        vec2(-raio, 0),
    ];
}

function Triangulo (x, y, r, vx, vy, cor) {
    this.vertices = aproximeDisco(r, DISCO_RES);
    this.nv = this.vertices.length;
    this.vel = vec2(vx, vy);
    this.cor = cor;
    this.pos = vec2(x, y);

    // inicializa buffers
    let centro = this.pos;
    let nv = this.nv;
    let vert = this.vertices;
    for (let i = 0; i < nv; i++) {
        let k = (i + 1) % nv;
        gPosicoes.push(centro);
        gPosicoes.push(add(centro, vert[i])); // translada
        gPosicoes.push(add(centro, vert[k]));

        gCores.push(cor);
        gCores.push(cor);
        gCores.push(cor);
    }

    this.atualize = function (delta)
    {
        this.pos = add(this.pos, mult(delta, this.vel));
        let x, y;
        let vx, vy;
        [x, y] = this.pos;
        [vx, vy] = this.vel;

        if (x < 0) { x = -x; vx = -vx; }
        if (y < 0) { y = -y; vy = -vy; }
        if (x >= gCanvas.width) { x = gCanvas.width; vx = -vx; }
        if (y >= gCanvas.height) { y = gCanvas.height; vy = -vy; }
        // console.log(x, y, vx, vy);
        let centro = this.pos = vec2(x, y);
        this.vel = vec2(vx, vy);

        let nv = this.nv;
        let vert = this.vertices;
        for (let i = 0; i < nv; i++) {
            let k = (i + 1) % nv;
            gPosicoes.push(centro);
            gPosicoes.push(add(centro, vert[i]));
            gPosicoes.push(add(centro, vert[k]));
        }
    }
}


function rotate_2d(angle, axis)
{
    if ( axis.length == 2 ) {
        axis = vec2(axis[0], axis[1]);
    }

    if(axis.type != 'vec2') throw "rotate: axis not a vec2";
    var v = normalize( axis );

    var x = v[0];
    var y = v[1];
    var z = 1;

    var c = Math.cos( radians(angle) );
    var omc = 1.0 - c;
    var s = Math.sin( radians(angle) );

    var result = mat3(
        x*x*omc + c,   x*y*omc + z*s,
        x*y*omc - z*s, y*y*omc + c,
    );

    return result
}


// -----------------------------------------------------------------------
// Código fonte do Webgl em GLSL

gVertexShaderSrc = `#version 300 es

// aPosition é um buffer de entrada
in vec2 aPosition;
uniform vec2 uResolution;
in vec4 aColor;  // buffer com a cor de cada vértice
out vec4 vColor; // varying -> passado ao fShader

void main() {
    vec2 escala1 = aPosition / uResolution;
    vec2 escala2 = escala1 * 2.0;
    vec2 clipSpace = escala2 - 1.0;

    gl_Position = vec4(clipSpace, 0, 1);
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
