// Elementos del DOM
const lineNumbers = document.getElementById('line-numbers');
const cursorPosition = document.getElementById('cursor-position');
const fileInfo = document.getElementById('file-info');
const codeStats = document.getElementById('code-stats');
const modalAyuda = document.getElementById('modal-ayuda');
const panelContent = document.getElementById('panel-content');
const toggleButton = document.getElementById('toggle-button');
const editorContainer = document.getElementById('editor-container');
const panelControl = document.getElementById('panel-control');
const editorSection = document.getElementById('editor-section');
const togglePanelBtn = document.getElementById('toggle-panel-btn');
const zoomSlider = document.getElementById('zoom-ciudad');
const zoomValue = document.getElementById('zoom-value');
const tamanoActual = document.getElementById('tamano-actual');
const ventanaPrincipal = document.getElementById('ventana-principal');
const editorHeader = document.querySelector('.editor-header span');

// Variables para la ciudad y el robot
let ciudad = [];
let tamañoCiudad = 50;
let zoomCiudad = 10;
let robot = {
    x: 0,
    y: 0,        
    activo: false,
    direccion: 'este',
    objeto: null
};
let objetosCiudad = [];
let intervaloRobot = null;
let panelMinimizado = false;
let panelContenidoMinimizado = false;

//Compiler
let machine = new Machine();

// En tu código principal
let rinfoEditor;

// Cargar preferencia de tema al iniciar y inicializar la ciudad
window.addEventListener('DOMContentLoaded', function() {
    rinfoEditor = new RInfoEditor(
        'nombre-programa',
        'seccionCodigo',      // ID del textarea
        'line-numbers',       // ID del elemento para números de línea
        'cursor-position',    // ID del elemento para posición del cursor
        'code-stats'          // ID del elemento para estadísticas
    );
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        // Buscar el elemento del tema (ajustado para el nuevo ID)
        const themeToggle = document.getElementById('theme-toggle-link');
        if (themeToggle) {
            themeToggle.textContent = 'Cambiar a Tema Oscuro';
        }
    }
            
    // Cargar estado del panel
    const savedPanelState = localStorage.getItem('panelMinimizado');
    if (savedPanelState === 'true') {
        togglePanel();
    }
            
    // Cargar estado del contenido del panel
    const savedPanelContentState = localStorage.getItem('panelContenidoMinimizado');
    if (savedPanelContentState === 'true') {
        togglePanelContent();
    }
            
    // Inicializar la ciudad
    inicializarCiudad();
            
    // Actualizar el valor del zoom
    actualizarZoom();
            
    // Inicializar el control de velocidad
    actualizarValorVelocidad();
    document.getElementById('velocidad').addEventListener('input', actualizarValorVelocidad);
            
    // Aplicar el tema correcto al editor
    if (savedTheme === 'light') {
        rinfoEditor.setTheme("eclipse");
    } else {
        rinfoEditor.setTheme("dracula");
    }
});

//Funcion para compilar
function compilar() {
    const sourceCode = rinfoEditor.getValue();

    machine.reset(sourceCode);

    machine.runAllStages();
      
    if (machine.hasErrors()) {
        alert(machine.reportErrors()); 
    } else {
        alert("Compilacion exitosa");
    }
}

// Función para actualizar el zoom de la ciudad
function actualizarZoom() {
    zoomCiudad = parseInt(zoomSlider.value);
    zoomValue.textContent = zoomCiudad;
    actualizarEstiloCuadricula();
}

// Función para actualizar el estilo de la cuadrícula según el zoom
function actualizarEstiloCuadricula() {
    const grid = document.getElementById('ciudad-grid');
    const cellSize = Math.max(5, Math.min(30, zoomCiudad)); // Tamaño entre 5px and 30px
    grid.style.gridTemplateColumns = `repeat(${tamañoCiudad}, ${cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(${tamañoCiudad}, ${cellSize}px)`;
            
    // Actualizar el tamaño de fuente en función del zoom
    const fontSize = Math.max(8, Math.min(16, Math.round(cellSize * 0.7)));
    document.querySelectorAll('.celda-ciudad').forEach(celda => {
        celda.style.fontSize = `${fontSize}px`;
    });
}

// Función para minimizar/mostrar el panel completo (derecha a izquierda)
function togglePanel() {
    panelMinimizado = !panelMinimizado;
            
    if (panelMinimizado) {
        panelControl.classList.add('collapsed');
        editorSection.classList.add('expanded');
        togglePanelBtn.innerHTML = '<span>▶</span> Panel';
        ventanaPrincipal.classList.add('panel-minimizado');
    } else {
        panelControl.classList.remove('collapsed');
        editorSection.classList.remove('expanded');
        togglePanelBtn.innerHTML = '<span>◀</span> Panel';
        ventanaPrincipal.classList.remove('panel-minimizado');
    }
            
    // Guardar estado en localStorage
    localStorage.setItem('panelMinimizado', panelMinimizado);
            
    // Redimensionar el editor después de cambiar el panel
    setTimeout(function() {
        if (rinfoEditor) rinfoEditor.refresh();
    }, 300);
}

// Función para minimizar/mostrar el contenido del panel (interno)
function togglePanelContent() {
    panelContenidoMinimizado = !panelContenidoMinimizado;
            
    if (panelContenidoMinimizado) {
        panelContent.classList.add('collapsed');
        toggleButton.classList.add('collapsed');
        toggleButton.textContent = '►';
    } else {
        panelContent.classList.remove('collapsed');
        toggleButton.classList.remove('collapsed');
        toggleButton.textContent = '▼';
    }
            
    // Guardar estado en localStorage
    localStorage.setItem('panelContenidoMinimizado', panelContenidoMinimizado);
}

// Inicializar la ciudad
function inicializarCiudad() {
    const grid = document.getElementById('ciudad-grid');
    grid.innerHTML = '';
            
    ciudad = [];
    objetosCiudad = [];
    actualizarContadorObjetos();
            
    // Actualizar los valores máximos de los inputs de posición
    document.getElementById('avenidaPos').max = tamañoCiudad - 1;
    document.getElementById('callePos').max = tamañoCiudad - 1;
            
    // Crear la cuadrícula
    for (let y = 0; y < tamañoCiudad; y++) {
        ciudad[y] = [];
        for (let x = 0; x < tamañoCiudad; x++) {
            const celda = document.createElement('div');
            celda.className = 'celda-ciudad';
                    
            // Marcar calles y avenidas (cada 10 unidades)
            if (x === 0 || y === 0 || x === tamañoCiudad - 1 || y === tamañoCiudad - 1) {
                celda.classList.add('calle');
            } else if (x % 10 === 0 || y % 10 === 0) {
                celda.classList.add('avenida');
            }
                    
            celda.dataset.x = x;
            celda.dataset.y = y;
            celda.addEventListener('click', () => colocarObjetoEnCelda(x, y));
                    
            grid.appendChild(celda);
            ciudad[y][x] = celda;
        }
    }
            
    // Actualizar el estilo de la cuadrícula
    actualizarEstiloCuadricula();
            
    // Actualizar el texto del tamaño actual
    tamanoActual.textContent = `${tamañoCiudad}x${tamañoCiudad}`;
            
    // Colocar el robot en la posición inicial
    colocarRobot(0, 0);
    actualizarEstadoRobot();
}

// Colocar el robot en una posición específica
function colocarRobot(x, y) {
    // Limpiar la posición anterior del robot
    document.querySelectorAll('.celda-robot').forEach(celda => {
        celda.classList.remove('celda-robot');
        celda.textContent = '';
    });
            
    // Actualizar posición del robot
    robot.x = x;
    robot.y = y;
            
    // Marcar la nueva posición del robot
    if (ciudad[y] && ciudad[y][x]) {
        ciudad[y][x].classList.add('celda-robot');
        ciudad[y][x].textContent = 'R';
    }
            
    actualizarEstadoRobot();
}

// Colocar un objeto en una celda específica
function colocarObjetoEnCelda(x, y) {
    // No permitir colocar objetos donde está el robot
    if (x === robot.x && y === robot.y) return;
            
    const tipo = document.getElementById('objetosLista').value;
            
    // Verificar si ya hay un objeto en esta posición
    const objetoExistente = objetosCiudad.findIndex(obj => obj.x === x && obj.y === y);
    if (objetoExistente !== -1) {
        objetosCiudad.splice(objetoExistente, 1);
        ciudad[y][x].classList.remove('celda-objeto');
        ciudad[y][x].removeAttribute('data-tipo');
    } else {
        // Agregar nuevo objeto
        objetosCiudad.push({ tipo, x, y });
        ciudad[y][x].classList.add('celda-objeto');
        ciudad[y][x].setAttribute('data-tipo', tipo);
    }
            
    actualizarContadorObjetos();
    actualizarContadoresObjetos();
}

// Función para actualizar los contadores de objetos
function actualizarContadoresObjetos() {
    const contadorFlores = document.getElementById('contador-flores');
    const contadorPapeles = document.getElementById('contador-papeles');
            
    // Contar flores y papeles
    const flores = objetosCiudad.filter(obj => obj.tipo === 'flores').length;
    const papeles = objetosCiudad.filter(obj => obj.tipo === 'papeles').length;
            
    // Actualizar los contadores
    contadorFlores.textContent = flores;
    contadorPapeles.textContent = papeles;
}

// Función para actualizar el valor de velocidad visible
function actualizarValorVelocidad() {
    const velocidadSlider = document.getElementById('velocidad');
    const valorVelocidad = document.getElementById('valor-velocidad');
    valorVelocidad.textContent = velocidadSlider.value;
}

// Actualizar el contador de objetos
function actualizarContadorObjetos() {
    document.getElementById('contador-objetos').textContent = objetosCiudad.length;
    actualizarContadoresObjetos(); // Llamar a la nueva función
}

// Eliminar un objeto
function eliminarObjeto(index) {
    const obj = objetosCiudad[index];
    ciudad[obj.y][obj.x].classList.remove('celda-objeto');
    ciudad[obj.y][obj.x].removeAttribute('data-tipo');
    objetosCiudad.splice(index, 1);
            
    actualizarContadorObjetos();
    actualizarContadoresObjetos();
}

// Mover el robot
function moverRobot(direccion) {
    if (intervaloRobot) {
        clearInterval(intervaloRobot);
        intervaloRobot = null;
        robot.activo = false;
        actualizarEstadoRobot();
        return;
    }
            
    let nuevaX = robot.x;
    let nuevaY = robot.y;
            
    switch(direccion) {
        case 'arriba':
            nuevaY = Math.max(0, robot.y - 1);
            break;
        case 'abajo':
            nuevaY = Math.min(tamañoCiudad - 1, robot.y + 1);
            break;
        case 'izquierda':
            nuevaX = Math.max(0, robot.x - 1);
            break;
        case 'derecha':
            nuevaX = Math.min(tamañoCiudad - 1, robot.x + 1);
            break;
        case 'detener':
            robot.activo = false;
            actualizarEstadoRobot();
            return;
    }
            
    // Verificar si hay un objeto en la nueva posición
    const objetoEnCamino = objetosCiudad.find(obj => obj.x === nuevaX && obj.y === nuevaY);
    if (objetoEnCamino) {
        // El robot puede recoger el objeto o detenerse
        if (confirm(`Hay ${objetoEnCamino.tipo} en el camino. ¿Recogerlo?`)) {
            robot.objeto = objetoEnCamino.tipo;
            eliminarObjeto(objetosCiudad.indexOf(objetoEnCamino));
        } else {
            return; // No moverse si hay un objeto y no se recoge
        }
    }
            
    colocarRobot(nuevaX, nuevaY);
}

// Modificar la función agregarObjeto para usar las coordenadas del formulario
function agregarObjeto() {
    const tipo = document.getElementById('objetosLista').value;
    const x = parseInt(document.getElementById('avenidaPos').value);
    const y = parseInt(document.getElementById('callePos').value);
    const cantidad = parseInt(document.getElementById('cantidadObjeto').value);
            
    // Validar coordenadas
    if (x < 0 || x >= tamañoCiudad || y < 0 || y >= tamañoCiudad) {
        alert("Coordenadas fuera de los límites de la ciudad");
        return;
    }
            
    // No permitir colocar objetos donde está el robot
    if (x === robot.x && y === robot.y) {
        alert("No se puede colocar un objeto en la posición del robot");
        return;
    }
            
    for (let i = 0; i < cantidad; i++) {
        // Verificar si ya hay un objeto en esta posición
        const objetoExistente = objetosCiudad.findIndex(obj => obj.x === x && obj.y === y);
        if (objetoExistente !== -1) {
            // Reemplazar el objeto existente
            objetosCiudad[objetoExistente].tipo = tipo;
            ciudad[y][x].setAttribute('data-tipo', tipo);
        } else {
            // Agregar nuevo objeto
            objetosCiudad.push({ tipo, x, y });
            ciudad[y][x].classList.add('celda-objeto');
            ciudad[y][x].setAttribute('data-tipo', tipo);
        }
    }
            
    actualizarContadorObjetos();
    actualizarContadoresObjetos();
}

// Actualizar el estado del robot en la UI
function actualizarEstadoRobot() {
    const status = document.getElementById('robot-status');
    status.textContent = `Robot: ${robot.activo ? 'Activo' : 'Inactivo'} | Posición: (${robot.x}, ${robot.y}) | Objeto: ${robot.objeto || 'Ninguno'}`;
}

// Cambiar el tamaño de la ciudad
function cambiarTamanoCiudad() {
    tamañoCiudad = parseInt(document.getElementById('tamano-ciudad').value);
    inicializarCiudad();
}

// Reiniciar la ciudad
function reiniciarCiudad() {
    inicializarCiudad();
}

// Función para mostrar ayuda
function mostrarAyuda() {
    modalAyuda.style.display = 'block';
}

// Función para cerrar modal
function cerrarModal() {
    modalAyuda.style.display = 'none';
}

// Cerrar modal al hacer clic fuera del contenido
window.addEventListener('click', function(event) {
    if (event.target === modalAyuda) {
        cerrarModal();
    }
});

// Función para alternar entre temas claro/oscuro
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const themeToggle = document.getElementById('theme-toggle-link');
            
    if (document.body.classList.contains('light-theme')) {
        if (themeToggle) {
            themeToggle.textContent = 'Cambiar a Tema Oscuro';
        }
        rinfoEditor.setTheme("eclipse");
        // Guardar preferencia
        localStorage.setItem('theme', 'light');
    } else {
        if (themeToggle) {
            themeToggle.textContent = 'Cambiar a Tema Claro';
        }
        rinfoEditor.setTheme("dracula");
        // Guardar preferencia
        localStorage.setItem('theme', 'dark');
    }
}

// Funciones adicionales que podrías necesitar
function guardarCodigo() {
    rinfoEditor.guardarCodigo();
}

function cargarCodigo() {
    rinfoEditor.cargarCodigo();
}