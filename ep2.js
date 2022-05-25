
"use strict";

// -----------------------------------------------------------------------------------------
//

const FUNDO = [0, 0, 0, 1];
const gRaio = 0.05;

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
var gN = 10;

// -----------------------------------------------------------------------------------------

window.onload = main;

function main() {
    gCanvas = document.getElementById("glcanvas");
    gl = gCanvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");


    gObjetos.push(new Triangulo(sorteie_pos_norm(), sorteie_pos_norm(), 0.12, 0.5, 0.5, [1,0,0,1]));
    gLider = gObjetos[0];

    let cor =  sorteieCorRGBA();
    for (let i=0; i<gN; i++)
    {
        gObjetos.push(new Triangulo(sorteie_pos_norm(), sorteie_pos_norm(), 0.06, 2, 2, cor));
    }


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
    this.theta = 90
    this.novo_theta = 90;

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

        if (x < -1) { x=-1; vx = -vx; }
        if (y < -1) { y=-1; vy = -vy; }
        if (x > 1) { x=1; vx = -vx; }
        if (y > 1) { y=1; vy = -vy; }

        this.vel = vec4(vx, vy, 0, 0);
        this.pos = vec4(x, y, 0, 1)


        // Atualizacoes para quem nao e lider
        if (this !== gLider)
        {
            // Segue o lider
            {
                let alvo = gLider.pos;
                let vetor = subtract(alvo, this.pos);
                let d = length(vetor);

                if (d > 0.001)
                {
                    vetor = subtract(vetor, this.vel);
                    //this.vel = add(this.vel, vetor);
                }
            }


            /*
            // Mantem a distancia
            {
                let c = vec4(0,0,0,0);
                for(let i=0; i<gObjetos.length; i++)
                {
                    let obj = gObjetos[i];
                    if (obj !== this)
                    {
                        let vetor = subtract(gObjetos[i].pos, this.pos);
                        let d = length(vetor);
                        if (d !== 0 && d < gRaio) { c = subtract(c, vetor); }
                    }
                }
                this.vel = add(this.vel, c);
            }
            */

            // Centro de massa
            {
                let total = vec4(0,0,0,0);

                for(let i=1; i<gObjetos.length; i++)
                {
                    let k = 0;
                    let obj = gObjetos[i]

                    if (obj !== this) { total = add(total, obj.vel); k++; }

                    //console.log("K: ", k)

                }

                total = mult(1.0/(gObjetos.length-1), total);
                let vetor = subtract(total, this.vel);
                vetor = mult(0.01, vetor)

                //console.log(total)

                //this.vel = add(this.vel, vetor);
            }
        }



        if (this === gLider)
        {
            this.vel = vec4(0,0,0,0)
        }

        this.novo_theta = cut((Math.atan2(this.vel[1], this.vel[0]) * 180)/Math.PI);
        let nv = this.nv;
        let vert = this.vertices;

        // Corrige a direcao do objeto
        let rodar = Math.abs(this.theta - this.novo_theta) > 0;
        if (rodar)
        {
            for (let i = 0; i < nv; i++)
            {
                // Rotaciona no proprio centro
                let matriz_r = rotateZ(this.novo_theta - this.theta)
                let matriz_t1 = translate(-x, -y, 0)
                let matriz_t2 = translate(x, y, 0)
                vert[i] = mult(matriz_t1, vert[i]);
                vert[i] = mult(matriz_r, vert[i]);
                vert[i] = mult(matriz_t2, vert[i]);
            }

            this.theta = this.novo_theta;
        }


        // Insere os vertices no vetor posicoes
        for (let i = 0; i < nv; i++)
        {
            vert[i] = add(vert[i], mult(delta, this.vel));
            gPosicoes.push(vec2(vert[i][0], vert[i][1]));
        }
    }
}

function sorteie_pos_norm()
{
    return (Math.random() * 2) -1;
}

function sorteie_inter_norm(a, b)
{
    return (Math.random() * 2*b) + a;
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
