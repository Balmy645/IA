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
    jugador = juego.add.sprite(w/2, h/2 - 100, 'mono');

    juego.physics.enable(jugador);
    jugador.body.collideWorldBounds = true;
    var corre = jugador.animations.add('corre', [8, 9, 10, 11]);
    jugador.animations.play('corre', 10, true);


    
    //plataforma voladora

    plataforma = juego.add.sprite(juego.width / 2, juego.height / 2, 'plataforma');
    plataforma.anchor.setTo(0.5, 0.5); // Centrar la plataforma
    plataforma.scale.setTo(w*1, 1); // escala del sprite

    // Habilitar la física en la plataforma
    juego.physics.enable(plataforma, Phaser.Physics.ARCADE);

    
    // Ajustar las propiedades de colisión de la plataforma
    plataforma.body.immovable = true; // La plataforma no se moverá cuando colisione con otros objetos
    plataforma.body.allowGravity = false; // La plataforma no será afectada por la gravedad
    

    // Permitir que el jugador colisione con la plataforma
    juego.physics.arcade.collide(jugador, plataforma);

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

    nnNetwork = new synaptic.Architect.Perceptron(4, 6, 4); // Entradas (4) y salidas (4)
    nnEntrenamiento = new synaptic.Trainer(nnNetwork);

    // Disparar balas cada 5 segundos
    juego.time.events.loop(Phaser.Timer.SECOND * 4, disparo, this);
}

function enRedNeural() {
    nnEntrenamiento.train(datosEntrenamiento, { rate: 0.0003, iterations: 5000, error: .005, shuffle: true, log: 1000 });
}

function datosDeEntrenamiento(param_entrada) {
    nnSalida = nnNetwork.activate(param_entrada);

        // Verificar si la acción recomendada ha resultado en un error previamente
        for (var i = 0; i < errores.length; i++) {
            if (compararSituaciones(param_entrada, errores[i].situacion)) {
                if (compararAcciones(nnSalida, errores[i].accion)) {
                    // Si encontramos una acción errónea similar, generamos una nueva salida aleatoria
                    nnSalida = generarNuevaAccion(nnSalida);
                    break;
                }
            }
        }

    return nnSalida;
}


function compararSituaciones(s1, s2) {
    for (var i = 0; i < s1.length; i++) {
        if (Math.abs(s1[i] - s2[i]) > 10) { // Umbral de similitud
            return false;
        }
    }
    return true;
}

function compararAcciones(a1, a2) {
    for (var i = 0; i < a1.length; i++) {
        if (Math.abs(a1[i] - a2[i]) > 0.5) { // Umbral de similitud para acciones
            return false;
        }
    }
    return true;
}


function generarNuevaAccion(accionActual) {
    var nuevaAccion = accionActual.slice();
    var indice = Math.floor(Math.random() * nuevaAccion.length);
    nuevaAccion[indice] = 1 - nuevaAccion[indice]; // Cambiar la acción en un índice aleatorio
    return nuevaAccion;
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

        var mouse_x = event.x  ,
            mouse_y = event.y  ;

        if(mouse_x > menu_x1 && mouse_x < menu_x2 && mouse_y > menu_y1 && mouse_y < menu_y2 ){
            if(mouse_x >=menu_x1 && mouse_x <=menu_x2 && mouse_y >=menu_y1 && mouse_y <=menu_y1+90){
                eCompleto=false;
                datosEntrenamiento = [];
                modoAuto = false;
            }else if (mouse_x >=menu_x1 && mouse_x <=menu_x2 && mouse_y >=menu_y1+90 && mouse_y <=menu_y2) {
                console.log("here20");
                if(!eCompleto) {
                    console.log("","Entrenamiento "+ datosEntrenamiento.length +" valores" );
                    
                    eCompleto=true;
                }
                enRedNeural();
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
    jugador.position.x = w/2;
    jugador.position.y = h/2 - 100;
    balas.forEachAlive(function (bala) {
        bala.kill();
    });
}

function saltar() {
    if (jugador.body.touching.down && plataforma.body.touching.up) {
        jugador.body.velocity.y = -400;
        isjumping = true;
    }
    console.log(estatuSuelo);
}

function update() {
    fondo.tilePosition.x -= 1;

    juego.physics.arcade.collide(balas, jugador, colisionH, null, this);
    juego.physics.arcade.collide(jugador, plataforma);

    estatuSuelo = jugador.body.touching.down && plataforma.body.touching.up ? 1 : 0;
    estatusAire = jugador.body.touching.down && plataforma.body.touching.up ? 1 : 0;

    var balaMasCercana = obtenerBalaMasCercana();

    if (balaMasCercana) {
        var despBalaX = jugador.position.x - balaMasCercana.position.x;
        var despBalaY = jugador.position.y - balaMasCercana.position.y;

        var distancia = Phaser.Math.distance(jugador.position.x, jugador.position.y, balaMasCercana.position.x, balaMasCercana.position.y);

        if (modoAuto) {
            console.log("here");
            var action = [0 , 0, 0, 0] //derecha?, izquierda?, salto?, quieto?
            var nnDecision = datosDeEntrenamiento([despBalaX, despBalaY, estatuSuelo, estatusAire]);
            console.log("nnDecision: ",nnDecision);

            // rama de desiciones 

            // Añadir margen de seguridad
            if (distancia < umbralSeguridad) {
                if (nnDecision[0] > 0.3) { // Ajusta el umbral según sea necesario
                    jugador.body.velocity.x = 300;
                    action = [1 , 0, 0, 0];
                } else if (nnDecision[1] > 0.3) {
                    jugador.body.velocity.x = -300;
                    action = [0 , 1, 0, 0];
                } else if (nnDecision[2] > 0.3) {
                    saltar();
                    action = [0 , 0, 1, 0];
                } else {
                    jugador.body.velocity.x = 0;
                    action = [0 , 0, 0, 1];
                }
            } else {
                if (nnDecision[0] > 0.5) {
                    jugador.body.velocity.x = 300;
                    action = [1 , 0, 0, 0];
                } else if (nnDecision[1] > 0.5) {
                    jugador.body.velocity.x = -300;
                    action = [0 , 1, 0, 0];
                } else if (nnDecision[2] > 0.5) {
                    saltar();
                    action = [0 , 0, 1, 0];
                } else {
                    jugador.body.velocity.x = 0;
                    action = [0 , 0, 0, 1];
                }
            }
            
            // Verificar si la situación es crítica y forzar el salto si es necesario
            if (distancia < umbralCritico) {
                saltar();
                action = [0 , 0, 1, 0];
            }



            datosEntrenamiento.push({
                'input': [despBalaX, despBalaY, estatuSuelo, estatusAire],
                'output': action
            });
        } 

        if (!modoAuto) {

            var action = [0 , 0, 0, 0] //derecha?, izquierda?, salto?, quieto?

            if (izquierda.isDown) {
                jugador.body.velocity.x = -300;
                action = [0 , 1, 0, 0]
            } else if (derecha.isDown) {
                jugador.body.velocity.x = 300;
                action = [1 , 0, 0, 0]
            } else if (salto.isDown){
                action = [0 , 0, 1, 0]
                saltar();
            }
            
            else {
                jugador.body.velocity.x = 0;
                action = [0 , 0, 0, 1]
            }
            
    
            datosEntrenamiento.push({
                'input': [despBalaX, despBalaY, estatuSuelo, estatusAire],
                'output': action
            });
    
            console.log("derecha | izquierda | salta | quieto ",
                    action);
    
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
    var bala = balas.create(juego.world.randomX, h-100, 'bala');
    var bala2 = balas.create(w-100, velocidadRandom(h/2 -50, h/2 -100), 'bala'); //bala desde la derecha
    var bala3 = balas.create(velocidadRandom(0,w), 10, 'bala'); //bala desde arriba 

    juego.physics.enable(bala, Phaser.Physics.ARCADE);
    bala.body.allowGravity = false;
    bala.body.collideWorldBounds = true;


    juego.physics.enable(bala2, Phaser.Physics.ARCADE);
    bala2.body.allowGravity = false;
    bala2.body.collideWorldBounds = true;

    juego.physics.enable(bala3, Phaser.Physics.ARCADE);
    bala3.body.allowGravity = false;
    bala3.body.collideWorldBounds = true;


    // Temporizador para destruir la bala después de 5 segundos
    juego.time.events.add(Phaser.Timer.SECOND * 4, function () {
        bala.kill();
        bala2.kill();
        bala3.kill();
    }, this);

    // Generar balas en diferentes direcciones
    var angle = juego.rnd.angle();

      // Bala hacia la izq
       bala2.body.velocity.x = -200;
       bala2.body.velocity.y = 0;


       // Bala hacia derecha
       bala.body.velocity.x = 0;
       bala.body.velocity.y = -200;

       bala3.body.velocity.x = 100;
       bala3.body.velocity.y = 200;

}

function colisionH() {
        // Registrar un error
        var balaMasCercana = obtenerBalaMasCercana();
        if (balaMasCercana) {
            var despBalaX = jugador.position.x - balaMasCercana.position.x;
            var despBalaY = jugador.position.y - balaMasCercana.position.y;
            var situacion = [despBalaX, despBalaY, estatuSuelo, estatusAire];
    
            var accionFallida = datosDeEntrenamiento([despBalaX, despBalaY, estatuSuelo, estatusAire]);
            errores.push({
                'situacion': situacion,
                'accion': accionFallida
            });
        }
    pausa();
}

function velocidadRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function render() {
}
