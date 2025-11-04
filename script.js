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

let panelMinimizado = false;
let panelContenidoMinimizado = false;

// Instancia del gestor de la ciudad
let ciudadManager;

//Compiler
let machine = new Machine();

//Interprete del editor RInfo
let rinfoEditor;

// Cargar preferencia de tema al iniciar y inicializar la ciudad
window.addEventListener('DOMContentLoaded', function() {
    rinfoEditor = new RInfoEditor(
        'nombre-programa',    // ID del elemento para el nombre del programa
        'seccionCodigo',      // ID del textarea
        'line-numbers',       // ID del elemento para números de línea
        'cursor-position',    // ID del elemento para posición del cursor
        'code-stats'          // ID del elemento para estadísticas
    );

    // Inicializar el gestor de ciudad
    ciudadManager = new CiudadManager(
        'ciudad-grid',          // ID del grid
        'robot-status',         // ID del estado del robot
        'contador-objetos',     // ID del contador general
        'contador-flores',      // ID del contador de flores
        'contador-papeles'      // ID del contador de papeles
    );
    
    // Inicializar la ciudad
    ciudadManager.inicializarCiudad(50);
    
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
    //inicializarCiudad();
            
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
    const zoomCiudad = parseInt(zoomSlider.value);
    zoomValue.textContent = zoomCiudad;
    ciudadManager.actualizarZoom(zoomCiudad);
}

// Función para actualizar el valor de la velocidad
function actualizarValorVelocidad() {
    const velocidadSlider = document.getElementById('velocidad');
    const valorVelocidad = document.getElementById('valor-velocidad');
    if (velocidadSlider && valorVelocidad) {
        valorVelocidad.textContent = velocidadSlider.value;
    }
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

// Función para cambiar el tamaño de la ciudad
function cambiarTamanoCiudad() {
    const nuevoTamaño = parseInt(document.getElementById('tamano-ciudad').value);
    ciudadManager.cambiarTamanoCiudad(nuevoTamaño);
}

// Función para reiniciar la ciudad
function reiniciarCiudad() {
    ciudadManager.reiniciarCiudad();
}

// Función para agregar un objeto a la ciudad
function agregarObjeto() {
    ciudadManager.agregarObjeto();
}

// Función para mover el robot
function moverRobot(direccion) {
    ciudadManager.moverRobot(direccion);
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

// Funciones para manejo de código
function guardarCodigo() {
    rinfoEditor.guardarCodigo();
}

function cargarCodigo() {
    rinfoEditor.cargarCodigo();
}