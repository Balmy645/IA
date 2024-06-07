var w = 800;
var h = 400;
var jugador;
var fondo;
var plataforma;

var balas;
var nave;

var salto;
var izquierda;
var derecha;
var menu;
var isjumping = false;

var velocidadBalaX;
var velocidadBalaY;
var estatusAire;
var estatuSuelo;

var nnNetwork, nnEntrenamiento, nnSalida, datosEntrenamiento = [];
var modoAuto = false, eCompleto = false;
var umbralSeguridad = 250; // Para facilitar el machine learning
var umbralCritico = 100; // Para facilitar la solucón de situaciones criticas

var errores = [];

var juego = new Phaser.Game(w, h, Phaser.CANVAS, '', { preload: preload, create: create, update: update, render: render });

function preload() {
    juego.load.image('fondo', 'assets/game/fondo.jpg');
    juego.load.spritesheet('mono', 'assets/sprites/altair.png', 32, 48);
    juego.load.image('nave', 'assets/game/ufo.png');
    juego.load.image('bala', 'assets/sprites/purple_ball.png');
    juego.load.image('menu', 'assets/game/menu.png');
}

function create() {
    juego.physics.startSystem(Phaser.Physics.ARCADE);
    juego.physics.arcade.gravity.y = 800;
    juego.time.desiredFps = 30;

    fondo = juego.add.tileSprite(0, 0, w, h, 'fondo');
    nave = juego.add.sprite(w - 100, h - 70, 'nave');
    jugador = juego.add.sprite(50, h-10, 'mono');

    juego.physics.enable(jugador);
    jugador.body.collideWorldBounds = true;
    var corre = jugador.animations.add('corre', [8, 9, 10, 11]);
    jugador.animations.play('corre', 10, true);

    balas = juego.add.group();
    balas.enableBody = true;
    balas.physicsBodyType = Phaser.Physics.ARCADE;

    pausaL = juego.add.text(w - 100, 20, 'Pausa', { font: '20px Arial', fill: '#fff' });
    pausaL.inputEnabled = true;
    pausaL.events.onInputUp.add(pausa, self);
    juego.input.onDown.add(mPausa, self);

    salto = juego.input.keyboard.addKey(Phaser.Keyboard.UP);
    izquierda = juego.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    derecha = juego.input.keyboard.addKey(Phaser.Keyboard.RIGHT);

    nnNetwork = new synaptic.Architect.Perceptron(3, 6, 4); // Entradas (3) y salidas (4)
    nnEntrenamiento = new synaptic.Trainer(nnNetwork);

    // Disparar balas cada 5 segundos
    juego.time.events.loop(Phaser.Timer.SECOND * 1, disparo, this);
}

function enRedNeural() {
    nnEntrenamiento.train(datosEntrenamiento, { rate: 0.03, iterations: 20000, error: .005, shuffle: true, log: 1000 });
}

function datosDeEntrenamiento(param_entrada) {
    nnSalida = nnNetwork.activate(param_entrada);
    return nnSalida;
}

function pausa() {
    juego.paused = true;
    menu = juego.add.sprite(w / 2, h / 2, 'menu');
    menu.anchor.setTo(0.5, 0.5);
    console.log("state?: ",modoAuto);
}

function mPausa(event){
    if(juego.paused){
        var menu_x1 = w/2 - 270/2, menu_x2 = w/2 + 270/2,
            menu_y1 = h/2 - 180/2, menu_y2 = h/2 + 180/2;

        var mouse_x = event.x,
            mouse_y = event.y;

        if(mouse_x > menu_x1 && mouse_x < menu_x2 && mouse_y > menu_y1 && mouse_y < menu_y2 ){
            if(mouse_x >=menu_x1 && mouse_x <=menu_x2 && mouse_y >=menu_y1 && mouse_y <=menu_y1+90){
                eCompleto=false;
                datosEntrenamiento = [];
                modoAuto = false;
            }else if (mouse_x >=menu_x1 && mouse_x <=menu_x2 && mouse_y >=menu_y1+90 && mouse_y <=menu_y2) {
                console.log("here20");
                if(!eCompleto) {
                    console.log("","Entrenamiento "+ datosEntrenamiento.length +" valores" );
                    enRedNeural();
                    eCompleto=true;
                }
                modoAuto = true;
                menu.destroy();
            }

            menu.destroy();
            resetVariables();
            juego.paused = false;
        }
    }
}

function resetVariables() {
    jugador.body.velocity.x = 0;
    jugador.body.velocity.y = 0;
    jugador.position.x = 50;
    jugador.position.y = h-10;
    balas.forEachAlive(function (bala) {
        bala.kill();
    });
}

function saltar() {
    if (jugador.body.onFloor()) {
        jugador.body.velocity.y = -300;
        isjumping = true;
    }
    console.log(estatuSuelo);
}

function update() {
    fondo.tilePosition.x -= 1;

    juego.physics.arcade.collide(balas, jugador, colisionH, null, this);

    estatuSuelo = jugador.body.touching.down && jugador.body.onFloor();
    estatusAire = jugador.body.touching.down && jugador.body.onFloor();

    var balaMasCercana = obtenerBalaMasCercana();

    if (balaMasCercana) {
        var despBalaX = jugador.position.x - balaMasCercana.position.x;
        var despBalaY = jugador.position.y - balaMasCercana.position.y;

        var distancia = Phaser.Math.distance(jugador.position.x, jugador.position.y, balaMasCercana.position.x, balaMasCercana.position.y);

        if (modoAuto) {
            var nnDecision = datosDeEntrenamiento([despBalaX, despBalaY, distancia]);

            console.log("nnDecision: ", nnDecision);

            const action1 = nnDecision.indexOf(Math.max(...nnDecision));

            console.log(action1);

            switch(action1) {
                case 0:
                    console.log("Mover a la derecha");
                    jugador.body.velocity.x = 200;
                    break;
                case 1:
                    console.log("Mover a la izquierda");
                    jugador.body.velocity.x = -300;
                    break;
                case 2:
                    console.log("Saltar");
                    saltar();
                    break;
                case 3:
                    console.log("Quedarse quieto");
                    jugador.body.velocity.x = 0;
                    break;
            }
        } else {
            var action = [0, 0, 0, 0] // derecha?, izquierda?, salto?, quieto?

            if (izquierda.isDown) {
                jugador.body.velocity.x = -300;
                action = [0, 1, 0, 0];
            } else if (derecha.isDown) {
                jugador.body.velocity.x = 300;
                action = [1, 0, 0, 0];
            } else if (salto.isDown){
                action = [0, 0, 1, 0];
                saltar();
            } else {
                jugador.body.velocity.x = 0;
                action = [0, 0, 0, 1];
            }

            datosEntrenamiento.push({
                'input': [despBalaX, despBalaY, distancia],
                'output': action
            });

            console.log("derecha | izquierda | salta | quieto ", action);
        }
    }
}

function obtenerBalaMasCercana() {
    var distanciaMinima = Infinity;
    var balaMasCercana = null;

    balas.forEachAlive(function (bala) {
        var distancia = Phaser.Math.distance(jugador.position.x, jugador.position.y, bala.position.x, bala.position.y);
        if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            balaMasCercana = bala;
        }
    });

    return balaMasCercana;
}

function disparo() {


    // Bala desde arriba con dirección 270 grados
    var balaArriba = balas.create(50, 0, 'bala');
    juego.physics.enable(balaArriba, Phaser.Physics.ARCADE);
    balaArriba.body.allowGravity = false; // Desactivar la gravedad
    balaArriba.body.velocity.y = 415; // Velocidad hacia abajo
    balaArriba.body.velocity.x = 0;

    // Bala desde arriba a la derecha con dirección 225 grados
    var balaArribaDerecha = balas.create(w/2, 50, 'bala');
    juego.physics.enable(balaArribaDerecha, Phaser.Physics.ARCADE);
    balaArribaDerecha.body.allowGravity = false; // Desactivar la gravedad
    balaArribaDerecha.body.velocity.x = -380;
    balaArribaDerecha.body.velocity.y = 380;

    // Bala desde la derecha con dirección 180 grados
    var balaDerecha = balas.create(w, h-20, 'bala');
    juego.physics.enable(balaDerecha, Phaser.Physics.ARCADE);
    balaDerecha.body.allowGravity = false; // Desactivar la gravedad
    balaDerecha.body.velocity.y = 0;
    balaDerecha.body.velocity.x = -760;

    juego.time.events.add(Phaser.Timer.SECOND * 4, function () {
        balaArriba.kill();
        balaDerecha.kill();
        balaArribaDerecha.kill();
    }, this);
}

function velocidadRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function colisionH() {
    pausa();
}

function velocidadRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function render() {
}
