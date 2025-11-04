class CiudadManager {
    constructor(gridId, robotStatusId, contadorObjetosId, contadorFloresId, contadorPapelesId) {
        this.gridId = gridId;
        this.robotStatusId = robotStatusId;
        this.contadorObjetosId = contadorObjetosId;
        this.contadorFloresId = contadorFloresId;
        this.contadorPapelesId = contadorPapelesId;
        
        this.ciudad = [];
        this.tamañoCiudad = 50;
        this.zoomCiudad = 10;
        this.objetosCiudad = [];
        this.intervaloRobot = null;
        
        this.robot = {
            x: 0,
            y: 0,        
            activo: false,
            direccion: 'este',
            objeto: null
        };
        
        this.gridElement = null;
        this.robotStatusElement = null;
        
        this.initializeElements();
    }

    // Inicializar referencias a elementos DOM
    initializeElements() {
        this.gridElement = document.getElementById(this.gridId);
        this.robotStatusElement = document.getElementById(this.robotStatusId);
        
        if (!this.gridElement) {
            console.error(`Elemento con ID '${this.gridId}' no encontrado`);
        }
    }

    // Inicializar o reinicializar la ciudad
    inicializarCiudad(tamaño = 50) {
        this.tamañoCiudad = tamaño;
        this.ciudad = [];
        this.objetosCiudad = [];
        
        if (!this.gridElement) return;
        
        this.gridElement.innerHTML = '';
        
        // Actualizar los valores máximos de los inputs de posición
        const avenidaInput = document.getElementById('avenidaPos');
        const calleInput = document.getElementById('callePos');
        if (avenidaInput) avenidaInput.max = this.tamañoCiudad - 1;
        if (calleInput) calleInput.max = this.tamañoCiudad - 1;
        
        // Crear la cuadrícula
        for (let y = 0; y < this.tamañoCiudad; y++) {
            this.ciudad[y] = [];
            for (let x = 0; x < this.tamañoCiudad; x++) {
                const celda = this.crearCelda(x, y);
                this.gridElement.appendChild(celda);
                this.ciudad[y][x] = celda;
            }
        }
        
        this.actualizarEstiloCuadricula();
        this.actualizarTextoSize();
        this.colocarRobot(0, 0);
        this.actualizarContadores();
        this.actualizarEstadoRobot();
    }

    // Crear una celda individual de la ciudad
    crearCelda(x, y) {
        const celda = document.createElement('div');
        celda.className = 'celda-ciudad';
        
        // Marcar calles y avenidas (cada 10 unidades)
        if (x === 0 || y === 0 || x === this.tamañoCiudad - 1 || y === this.tamañoCiudad - 1) {
            celda.classList.add('calle');
        } else if (x % 10 === 0 || y % 10 === 0) {
            celda.classList.add('avenida');
        }
        
        celda.dataset.x = x;
        celda.dataset.y = y;
        celda.addEventListener('click', () => this.colocarObjetoEnCelda(x, y));
        
        return celda;
    }

    // Actualizar el estilo de la cuadrícula según el zoom
    actualizarEstiloCuadricula() {
        if (!this.gridElement) return;
        
        const cellSize = Math.max(5, Math.min(30, this.zoomCiudad));
        this.gridElement.style.gridTemplateColumns = `repeat(${this.tamañoCiudad}, ${cellSize}px)`;
        this.gridElement.style.gridTemplateRows = `repeat(${this.tamañoCiudad}, ${cellSize}px)`;
        
        // Actualizar el tamaño de fuente en función del zoom
        const fontSize = Math.max(8, Math.min(16, Math.round(cellSize * 0.7)));
        document.querySelectorAll('.celda-ciudad').forEach(celda => {
            celda.style.fontSize = `${fontSize}px`;
        });
    }

    // Actualizar texto del tamaño actual
    actualizarTextoSize() {
        const tamanoActual = document.getElementById('tamano-actual');
        if (tamanoActual) {
            tamanoActual.textContent = `${this.tamañoCiudad}x${this.tamañoCiudad}`;
        }
    }

    // Colocar el robot en una posición específica
    colocarRobot(x, y) {
        // Limpiar la posición anterior del robot
        document.querySelectorAll('.celda-robot').forEach(celda => {
            celda.classList.remove('celda-robot');
            celda.textContent = '';
        });
        
        // Actualizar posición del robot
        this.robot.x = x;
        this.robot.y = y;
        
        // Marcar la nueva posición del robot
        if (this.ciudad[y] && this.ciudad[y][x]) {
            this.ciudad[y][x].classList.add('celda-robot');
            this.ciudad[y][x].textContent = 'R';
        }
        
        this.actualizarEstadoRobot();
    }

    // Colocar un objeto en una celda específica
    colocarObjetoEnCelda(x, y) {
        // No permitir colocar objetos donde está el robot
        if (x === this.robot.x && y === this.robot.y) return;
        
        const tipo = document.getElementById('objetosLista')?.value || 'flores';
        
        // Verificar si ya hay un objeto en esta posición
        const objetoExistente = this.objetosCiudad.findIndex(obj => obj.x === x && obj.y === y);
        if (objetoExistente !== -1) {
            this.objetosCiudad.splice(objetoExistente, 1);
            this.ciudad[y][x].classList.remove('celda-objeto');
            this.ciudad[y][x].removeAttribute('data-tipo');
        } else {
            // Agregar nuevo objeto
            this.objetosCiudad.push({ tipo, x, y });
            this.ciudad[y][x].classList.add('celda-objeto');
            this.ciudad[y][x].setAttribute('data-tipo', tipo);
        }
        
        this.actualizarContadores();
    }

    // Agregar objeto desde el formulario
    agregarObjeto() {
        const tipo = document.getElementById('objetosLista')?.value || 'flores';
        const x = parseInt(document.getElementById('avenidaPos')?.value || 0);
        const y = parseInt(document.getElementById('callePos')?.value || 0);
        const cantidad = parseInt(document.getElementById('cantidadObjeto')?.value || 1);
        
        // Validar coordenadas
        if (x < 0 || x >= this.tamañoCiudad || y < 0 || y >= this.tamañoCiudad) {
            alert("Coordenadas fuera de los límites de la ciudad");
            return;
        }
        
        // No permitir colocar objetos donde está el robot
        if (x === this.robot.x && y === this.robot.y) {
            alert("No se puede colocar un objeto en la posición del robot");
            return;
        }
        
        for (let i = 0; i < cantidad; i++) {
            // Verificar si ya hay un objeto en esta posición
            const objetoExistente = this.objetosCiudad.findIndex(obj => obj.x === x && obj.y === y);
            if (objetoExistente !== -1) {
                // Reemplazar el objeto existente
                this.objetosCiudad[objetoExistente].tipo = tipo;
                this.ciudad[y][x].setAttribute('data-tipo', tipo);
            } else {
                // Agregar nuevo objeto
                this.objetosCiudad.push({ tipo, x, y });
                this.ciudad[y][x].classList.add('celda-objeto');
                this.ciudad[y][x].setAttribute('data-tipo', tipo);
            }
        }
        
        this.actualizarContadores();
    }

    // Eliminar un objeto
    eliminarObjeto(index) {
        const obj = this.objetosCiudad[index];
        this.ciudad[obj.y][obj.x].classList.remove('celda-objeto');
        this.ciudad[obj.y][obj.x].removeAttribute('data-tipo');
        this.objetosCiudad.splice(index, 1);
        
        this.actualizarContadores();
    }

    // Mover el robot
    moverRobot(direccion) {
        if (this.intervaloRobot) {
            clearInterval(this.intervaloRobot);
            this.intervaloRobot = null;
            this.robot.activo = false;
            this.actualizarEstadoRobot();
            return;
        }
        
        let nuevaX = this.robot.x;
        let nuevaY = this.robot.y;
        
        switch(direccion) {
            case 'arriba':
                nuevaY = Math.max(0, this.robot.y - 1);
                break;
            case 'abajo':
                nuevaY = Math.min(this.tamañoCiudad - 1, this.robot.y + 1);
                break;
            case 'izquierda':
                nuevaX = Math.max(0, this.robot.x - 1);
                break;
            case 'derecha':
                nuevaX = Math.min(this.tamañoCiudad - 1, this.robot.x + 1);
                break;
            case 'detener':
                this.robot.activo = false;
                this.actualizarEstadoRobot();
                return;
        }
        
        // Verificar si hay un objeto en la nueva posición
        const objetoEnCamino = this.objetosCiudad.find(obj => obj.x === nuevaX && obj.y === nuevaY);
        if (objetoEnCamino) {
            // El robot puede recoger el objeto o detenerse
            if (confirm(`Hay ${objetoEnCamino.tipo} en el camino. ¿Recogerlo?`)) {
                this.robot.objeto = objetoEnCamino.tipo;
                this.eliminarObjeto(this.objetosCiudad.indexOf(objetoEnCamino));
            } else {
                return; // No moverse si hay un objeto y no se recoge
            }
        }
        
        this.colocarRobot(nuevaX, nuevaY);
    }

    // Actualizar contadores de objetos
    actualizarContadores() {
        // Contador general de objetos
        const contadorObjetos = document.getElementById(this.contadorObjetosId);
        if (contadorObjetos) {
            contadorObjetos.textContent = this.objetosCiudad.length;
        }
        
        // Contadores específicos
        this.actualizarContadoresEspecificos();
    }

    // Actualizar contadores específicos por tipo
    actualizarContadoresEspecificos() {
        const flores = this.objetosCiudad.filter(obj => obj.tipo === 'flores').length;
        const papeles = this.objetosCiudad.filter(obj => obj.tipo === 'papeles').length;
        
        const contadorFlores = document.getElementById(this.contadorFloresId);
        const contadorPapeles = document.getElementById(this.contadorPapelesId);
        
        if (contadorFlores) contadorFlores.textContent = flores;
        if (contadorPapeles) contadorPapeles.textContent = papeles;
    }

    // Actualizar estado del robot en la UI
    actualizarEstadoRobot() {
        if (this.robotStatusElement) {
            this.robotStatusElement.textContent = 
                `Robot: ${this.robot.activo ? 'Activo' : 'Inactivo'} | ` +
                `Posición: (${this.robot.x}, ${this.robot.y}) | ` +
                `Objeto: ${this.robot.objeto || 'Ninguno'}`;
        }
    }

    // Cambiar tamaño de la ciudad
    cambiarTamanoCiudad(nuevoTamaño) {
        this.tamañoCiudad = nuevoTamaño;
        this.inicializarCiudad(this.tamañoCiudad);
    }

    // Actualizar zoom
    actualizarZoom(nuevoZoom) {
        this.zoomCiudad = nuevoZoom;
        this.actualizarEstiloCuadricula();
    }

    // Reiniciar ciudad
    reiniciarCiudad() {
        this.inicializarCiudad(this.tamañoCiudad);
    }

    // Verificar si una posición está ocupada
    estaPosicionOcupada(x, y) {
        return this.objetosCiudad.some(obj => obj.x === x && obj.y === y);
    }

    // Obtener objeto en una posición específica
    obtenerObjetoEnPosicion(x, y) {
        return this.objetosCiudad.find(obj => obj.x === x && obj.y === y);
    }

    // Obtener todas las posiciones con objetos de un tipo específico
    obtenerPosicionesConObjeto(tipo) {
        return this.objetosCiudad
            .filter(obj => obj.tipo === tipo)
            .map(obj => ({ x: obj.x, y: obj.y }));
    }

    // Limpiar todos los objetos
    limpiarObjetos() {
        this.objetosCiudad.forEach(obj => {
            this.ciudad[obj.y][obj.x].classList.remove('celda-objeto');
            this.ciudad[obj.y][obj.x].removeAttribute('data-tipo');
        });
        this.objetosCiudad = [];
        this.actualizarContadores();
    }

    // Destructor para limpieza
    destruir() {
        if (this.intervaloRobot) {
            clearInterval(this.intervaloRobot);
            this.intervaloRobot = null;
        }
        this.ciudad = [];
        this.objetosCiudad = [];
    }
}