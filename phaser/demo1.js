var w = 800;
var h = 400;
var jugador;
var fondo;

var balas;
var nave;

var salto;
var izquierda;
var derecha;
var menu;

var velocidadBalaX;
var velocidadBalaY;
var estatusAire;
var estatuSuelo;

var nnNetwork, nnEntrenamiento, nnSalida, datosEntrenamiento = [];
var modoAuto = false, eCompleto = false;

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
    jugador = juego.add.sprite(50, h, 'mono');

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

    salto = juego.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    izquierda = juego.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    derecha = juego.input.keyboard.addKey(Phaser.Keyboard.RIGHT);

    nnNetwork = new synaptic.Architect.Perceptron(2, 6, 6, 2); // Entrada (3) y salida (3)
    nnEntrenamiento = new synaptic.Trainer(nnNetwork);

    // Disparar balas cada 5 segundos
    juego.time.events.loop(Phaser.Timer.SECOND * 4, disparo, this);
}

function enRedNeural() {
    nnEntrenamiento.train(datosEntrenamiento, { rate: 0.0003, iterations: 10000, shuffle: true });
}

function datosDeEntrenamiento(param_entrada) {
    nnSalida = nnNetwork.activate(param_entrada);
    return nnSalida;
}

function pausa() {
    juego.paused = true;
    menu = juego.add.sprite(w / 2, h / 2, 'menu');
    menu.anchor.setTo(0.5, 0.5);
}

function mPausa(event) {
    if (juego.paused) {
        var menu_x1 = w / 2 - 270 / 2, menu_x2 = w / 2 + 270 / 2,
            menu_y1 = h / 2 - 180 / 2, menu_y2 = h / 2 + 180 / 2;

        var mouse_x = event.x,
            mouse_y = event.y;

        if (mouse_x > menu_x1 && mouse_x < menu_x2 && mouse_y > menu_y1 && mouse_y < menu_y2) {
            if (mouse_x >= menu_x1 && mouse_x <= menu_x2 && mouse_y >= menu_y1 && mouse_y <= menu_y1 + 90) {
                eCompleto = false;
                datosEntrenamiento = [];
                modoAuto = false;
            } else if (mouse_x >= menu_x1 && mouse_x <= menu_x2 && mouse_y >= menu_y1 + 90 && mouse_y <= menu_y2) {
                if (!eCompleto) {
                    console.log("", "Entrenamiento " + datosEntrenamiento.length + " valores");
                    enRedNeural();
                    eCompleto = true;
                }
                modoAuto = true;
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
    balas.forEachAlive(function (bala) {
        bala.kill();
    });
}

function saltar() {
    if (jugador.body.onFloor()) {
        jugador.body.velocity.y = -400;
    }
}

function update() {
    fondo.tilePosition.x -= 1;

    juego.physics.arcade.collide(balas, jugador, colisionH, null, this);

    estatuSuelo = 1;
    estatusAire = 0;

    if (!jugador.body.onFloor()) {
        estatuSuelo = 0;
        estatusAire = 1;
    }

    var balaMasCercana = obtenerBalaMasCercana();

    if (balaMasCercana) {
        var despBalaX = jugador.position.x - balaMasCercana.position.x;
        var despBalaY = jugador.position.y - balaMasCercana.position.y;

        if (modoAuto == true) {
            var nnDecision = datosDeEntrenamiento([despBalaX, despBalaY]);

          
            // Lógica para alejarse de la bala más cercana
            
            if (nnDecision[0] < 0.33) { // Si la salida está en el rango 0-0.33, mover a la izquierda
                jugador.body.velocity.x = 10;
                console.log('here 0');
            }  
            else if (nnDecision[0] >= 0.33 && nnDecision[1] < 0.5) { // Si la salida está en el rango 0.33-0.66, quedarse quieto
                jugador.body.velocity.x = -200;
                console.log('here 1');
            } else { // Si la salida está en el rango 0.66-1, mover a la derecha
                jugador.body.velocity.x = 200;
                console.log('here 2');
            }
            console.log('entrena: '+nnDecision);
            // Lógica para saltar si es seguro
            if (nnDecision[1] < 0.5 && nnDecision[0] > 0.5 && jugador.body.onFloor()) {
                saltar();
            }
        }
        

        if (!modoAuto) {
            datosEntrenamiento.push({
                'input': [despBalaX, despBalaY],
                'output': [estatusAire, estatuSuelo, jugador.body.velocity.x > 0 ? 1 : jugador.body.velocity.x < 0 ? -1 : 0] // 1 si se mueve a la derecha, -1 si se mueve a la izquierda
            });

            console.log("Desplazamiento Bala X, Desplazamiento Bala Y, Velocidad Bala, Estatus Aire, Estatus Suelo: ",
                despBalaX + " " + despBalaY + " " + estatusAire + " " + estatuSuelo);
        }
    }

    if (!modoAuto) {

        if (salto.isDown) {
            saltar();
        }
        if (izquierda.isDown) {
            jugador.body.velocity.x = -200;
        } else if (derecha.isDown) {
                jugador.body.velocity.x = 200;
            
        } else {
            jugador.body.velocity.x = 0;
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
    var bala = balas.create(w - 100, juego.world.randomY, 'bala');
    juego.physics.enable(bala, Phaser.Physics.ARCADE);
    bala.body.collideWorldBounds = true;
    bala.body.bounce.set(1);

    // Temporizador para destruir la bala después de 5 segundos
    juego.time.events.add(Phaser.Timer.SECOND * 5, function () {
        bala.kill();
    }, this);

    // Generar balas en diferentes direcciones
    var angle = juego.rnd.angle();
    juego.physics.arcade.velocityFromAngle(angle, velocidadRandom(100, 400), bala.body.velocity);

}

function colisionH() {
    pausa();
}

function velocidadRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function render() {
}
