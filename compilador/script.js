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
let codeEditor; // Variable global para el editor CodeMirror

// Variables para el manejo de alcance
let scopeMarkers = [];

// Función para analizar y marcar alcances
function analizarYMarcarAlcances() {
    // Limpiar marcadores anteriores
    scopeMarkers.forEach(marker => marker.clear());
    scopeMarkers = [];

    const code = codeEditor.getValue();
    const lines = code.split('\n');
    const stack = [];
    const scopes = [];

    // Identificar estructuras que definen alcances
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
                
        // Detectar inicio de alcance
        if (line.match(/^(proceso|si|mientras|repetir|funcion|inicio|comenzar)\b/)) {
            stack.push({ type: line.split(/\s+/)[0], line: i });
        // Detectar fin de alcance
        }else if (line.match(/^(fin|sino|fsi|fmientras|frep|ffuncion)\b/) && stack.length > 0) {
            const start = stack.pop();
            scopes.push({ 
                start: start.line, 
                end: i, 
                type: start.type,
                indent: lines[i].search(/\S|$/) // Nivel de indentación
            });
        }
    }

    // Marcar los alcances en el editor
    scopes.forEach(scope => {
        // Marcar línea de inicio
        scopeMarkers.push(codeEditor.markText(
            { line: scope.start, ch: 0 },
            { line: scope.start, ch: lines[scope.start].length },
            { className: 'cm-scope-start' }
        ));

        // Marcar línea de fin
        scopeMarkers.push(codeEditor.markText(
            { line: scope.end, ch: 0 },
            { line: scope.end, ch: lines[scope.end].length },
            { className: 'cm-scope-end' }
        ));

        // Marcar líneas intermedias
        for (let i = scope.start + 1; i < scope.end; i++) {
            // Solo marcar líneas que estén dentro del mismo nivel de indentación
            const currentIndent = lines[i].search(/\S|$/);
            if (currentIndent > scope.indent) {
                scopeMarkers.push(codeEditor.markText(
                    { line: i, ch: scope.indent },
                    { line: i, ch: scope.indent + 1 },
                    { className: 'cm-scope-line' }
                ));
            }
        }
    });
}

// Función para analizar estructuras de procesos
function analizarEstructurasProcesos() {
    const code = codeEditor.getValue();
    const lines = code.split('\n');
    const procesos = [];
    let currentProceso = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
                
        // Detectar inicio de proceso
        if (line.match(/^proceso\s+\w+/)) {
            currentProceso = {
                name: line.split(/\s+/)[1],
                start: i,
                end: -1
            };
        // Detectar fin de proceso
        }else if (line === 'fin' && currentProceso) {
            currentProceso.end = i;
            procesos.push(currentProceso);
            currentProceso = null;
        }
    }

    // Marcar procesos
    procesos.forEach(proceso => {
        // Marcar línea de inicio del proceso
        scopeMarkers.push(codeEditor.markText(
            { line: proceso.start, ch: 0 },
            { line: proceso.start, ch: lines[proceso.start].length },
            { className: 'cm-scope-start' }
        ));

        // Marcar línea de fin del proceso
        scopeMarkers.push(codeEditor.markText(
            { line: proceso.end, ch: 0 },
            { line: proceso.end, ch: lines[proceso.end].length },
            { className: 'cm-scope-end' }
        ));

        // Marcar líneas del proceso
        for (let i = proceso.start + 1; i < proceso.end; i++) {
            scopeMarkers.push(codeEditor.markText(
                { line: i, ch: 0 },
                { line: i, ch: 1 },
                { className: 'cm-scope-line' }
            ));
        }
    });
}

// Función para analizar estructuras de control
function analizarEstructurasControl() {
    const code = codeEditor.getValue();
    const lines = code.split('\n');
            
    // Palabras clave de control
    const controlKeywords = ['si', 'sino', 'mientras', 'repetir'];
    const stack = [];
    const estructuras = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const words = line.split(/\s+/);
                
        // Verificar si es una palabra clave de control
        if (controlKeywords.includes(words[0])) {
            stack.push({ 
                type: words[0], 
                line: i, 
                indent: lines[i].search(/\S|$/) 
            });
        // Detectar fin de estructura (por indentación)
        }else if (stack.length > 0) {
            const currentIndent = lines[i].search(/\S|$/);
            const lastStructure = stack[stack.length - 1];
                    
            if (currentIndent <= lastStructure.indent && line !== '') {
                // Encontramos el fin de la estructura
                const start = stack.pop();
                estructuras.push({
                    type: start.type,
                    start: start.line,
                    end: i - 1,
                    indent: start.indent
                });
            }
        }
    }

    // Marcar las estructuras de control
    estructuras.forEach(estructura => {
        // Marcar línea de inicio
        scopeMarkers.push(codeEditor.markText(
            { line: estructura.start, ch: 0 },
            { line: estructura.start, ch: lines[estructura.start].length },
            { className: 'cm-scope-start' }
        ));

        // Marcar líneas del cuerpo de la estructura
        for (let i = estructura.start + 1; i <= estructura.end; i++) {
            if (lines[i].trim() !== '') {
                scopeMarkers.push(codeEditor.markText(
                    { line: i, ch: estructura.indent },
                    { line: i, ch: estructura.indent + 1 },
                    { className: 'cm-scope-line' }
                ));
            }
        }
    });
}

function compilar() {
    const sourceCode = codeEditor.getValue();

    try{
        // 1. Análisis Léxico
        const lexer = new Lexer(sourceCode);
        const tokens = lexer.tokenize();   
                
        //  Muestra de tokens
        let tokenText = tokens.map(token => 
        `${token.type}: "${token.value}" (Línea ${token.line}, Columna ${token.column})`
        ).join('\n');
                
        console.log(tokenText);
                 

        // 2. Análisis Sintáctico
        const parser = new Parser(tokens);
        const ast = parser.parse();
                
        console.log(ast); //resultado de parser

        // 3. Análisis Semántico
        const semanticAnalyzer = new SemanticAnalyzer();
        const semanticResult = semanticAnalyzer.analyze(ast);
        
        // Mostrar resultados
        if (semanticResult.errors.length > 0) { 
            alert('Errores semánticos encontrados:\n' + semanticResult.errors.join('\n'));
            //displayErrors(semanticResult.errors);
        } else {
            //displaySymbolTable(semanticResult.symbolTable);
            alert('Compilación exitosa sin errores.');
        }
                
    } catch (error) {
        alert('Error durante la compilación: ' + error.message);
    }

}

function inicializarEditor() {
    codeEditor = CodeMirror.fromTextArea(document.getElementById('seccionCodigo'), {
        mode: "rinfo",
        theme: "dracula",
        lineNumbers: false,
        indentUnit: 4,
        indentWithTabs: false,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        extraKeys: {
            "Tab": function(cm) {
                cm.replaceSelection("    ", "end");
            },
            "Ctrl-S": function(cm) {
                guardarCodigo();
            },
            "Ctrl-O": function(cm) {
                cargarCodigo();
            },
            "Ctrl-/": function(cm) {
                toggleComment();
            }
        }
    });
            
    // Configurar el editor
    codeEditor.setSize("100%", "100%");
            
    // Eventos para actualizar interfaz
    codeEditor.on("change", function() {
        updateLineNumbers();
        updateCodeStats();
        // Analizar y marcar alcances cuando cambia el código
        setTimeout(analizarAlcances, 100);
    });
            
    codeEditor.on("cursorActivity", function() {
        updateCursorPosition();
    });
            
    codeEditor.on("scroll", function() {
        lineNumbers.scrollTop = codeEditor.getScrollInfo().top;
    });
            
    // Inicializar números de línea y estadísticas
    updateLineNumbers();
    updateCursorPosition();
    updateCodeStats();
            
    // Analizar alcances iniciales
    setTimeout(analizarAlcances, 500);
}

// Función principal para analizar todos los alcances
function analizarAlcances() {
    // Limpiar marcadores anteriores
    scopeMarkers.forEach(marker => marker.clear());
    scopeMarkers = [];
            
    // Analizar diferentes tipos de estructuras
    analizarYMarcarAlcances();
    analizarEstructurasProcesos();
    analizarEstructurasControl();
}
        
// Palabras clave de R-Info para resaltar (instrucciones de control)
const rinfoKeywords = ['si', 'sino', 'mientras', 'repetir'];
const rinfoBuiltins = ['mover', 'tomarFlor','tomarPapel', 'depositarFlor', 'depositarPapel','Pos','Informar','EnviarMensaje','RecibirMensaje','Random'];
const rinfoSections = ['programa','procesos','proceso','areas','robots','variables','comenzar','fin'];
const rinfoDeclaratives = ['robot','numero','booleano','AreaC','AreaPC','AreaP','Iniciar','AsignarArea'];
const rinfoConstants = ['ES','E','V','F','PosCa','PosAv','HayFlorEnLaEsquina','HayPapelEnLaEsquina','HayFlorEnLaBolsa','HayPapelEnLaBolsa'];

// Definir un modo personalizado para R-Info
CodeMirror.defineMode("rinfo", function(config, parserConfig) {
    return {
        startState: function() {
            return {
                inString: false,
                stringType: null,
                inComment: false,
                inBraceComment: false
            };
        },
        token: function(stream, state) {
            // Comentarios
                    
            // 1. Detectar apertura de comentario con {
            if (!state.inString && !state.inComment && !state.inBraceComment && stream.match(/^{/)) {
                state.inBraceComment = true;
                return "comment";
            }
                    
            // 2. Detectar cierre de comentario con }
            if (state.inBraceComment && stream.match(/^}/)) {
                state.inBraceComment = false;
                return "comment";
            }
                    
            // 3. Si estamos dentro de un comentario de llaves, todo es comentario
            if (state.inBraceComment) {
                // Buscar cualquier ocurrencia de } incluso si tiene caracteres alrededor
                let index = stream.string.indexOf('}', stream.pos);
                        
                if (index !== -1) {
                    // Avanzar hasta la posición de la llave de cierre
                    stream.pos = index;
                    // Consumir la llave de cierre
                    stream.next();
                    state.inBraceComment = false;
                    return "comment";
                } else {
                    // Si no encuentra llave de cierre, consumir hasta el final
                    stream.skipToEnd();
                    return "comment";
                }
            }
                    
            // Strings
            if (!state.inString) {
                if (stream.match(/^""".*"""/)) return "string";
                if (stream.match(/^'''.*'''/)) return "string";
                if (stream.match(/^".*?"/)) return "string";
                if (stream.match(/^'.*?'/)) return "string";
                        
                if (stream.match(/^"""/)) {
                    state.inString = true;
                    state.stringType = '"""';
                    return "string";
                }
                if (stream.match(/^'''/)) {
                    state.inString = true;
                    state.stringType = "'''";
                    return "string";
                }
                if (stream.match(/^"/)) {
                    state.inString = true;
                    state.stringType = '"';
                    return "string";
                }
                if (stream.match(/^'/)) {
                    state.inString = true;
                    state.stringType = "'";
                    return "string";
                }
            } else {
                if (stream.match(state.stringType)) {
                    state.inString = false;
                    state.stringType = null;
                } else {
                    stream.next();
                }
                    return "string";
            }
                    
            // Números
            if (stream.match(/^\d+/)) return "number";
            if (stream.match(/^\d+\.\d+/)) return "number";
                    
            // Identificadores y palabras clave
            if (stream.match(/^[a-zA-Z_áéíóúñÑ][a-zA-Z0-9_áéíóúñÑ]*/)) {
                const word = stream.current();
                if (rinfoKeywords.includes(word)) return "keyword";
                if (rinfoBuiltins.includes(word)) return "builtin";
                if (rinfoSections.includes(word)) return "section";
                if (rinfoDeclaratives.includes(word)) return "declarative";
                if (rinfoConstants.includes(word)) return "constans";
                return "variable";
            }
                    
            // Operadores
            if (stream.match(/^[+~\-*/%=&|<>!?:.,;{}[\]()]/)) return "operator";
                    
                // Avanzar stream
                stream.next();
                return null;
            },
            indent: function(state, textAfter) {
                return 0;
            },
            electricInput: /^\s*[\}\]\)]$/,
            closeBrackets: {pairs: '()[]{}""\'\''}
        };
});

// Inicializar CodeMirror
function inicializarEditor() {
    codeEditor = CodeMirror.fromTextArea(document.getElementById('seccionCodigo'), {
        mode: "rinfo",
        theme: "dracula",
        lineNumbers: false, // Usamos nuestros propios números de línea
        indentUnit: 4,
        indentWithTabs: false,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        extraKeys: {
            "Tab": function(cm) {
                cm.replaceSelection("    ", "end");
            },
            "Ctrl-S": function(cm) {
                guardarCodigo();
            },
            "Ctrl-O": function(cm) {
                cargarCodigo();
            },
            "Ctrl-/": function(cm) {
                toggleComment();
            }
        }
    });
            
    // Configurar el editor con un tamaño adecuado
    codeEditor.setSize("100%", "100%");
            
    // Eventos para actualizar interfaz
    codeEditor.on("change", function() {
        updateLineNumbers();
        updateCodeStats();
    });
            
    codeEditor.on("cursorActivity", function() {
        updateCursorPosition();
    });
            
    codeEditor.on("scroll", function() {
        lineNumbers.scrollTop = codeEditor.getScrollInfo().top;
    });
            
    // Inicializar números de línea y estadísticas
    updateLineNumbers();
    updateCursorPosition();
    updateCodeStats();
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
        if (codeEditor) codeEditor.refresh();
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

// Actualizar números de línea
function updateLineNumbers() {
    const lineCount = codeEditor.lineCount();
    let numbers = '';
    for (let i = 1; i <= lineCount; i++) {
        numbers += i + '<br>';
    }
    lineNumbers.innerHTML = numbers;
}

// Actualizar estadísticas del código
function updateCodeStats() {
    const text = codeEditor.getValue();
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const lineCount = codeEditor.lineCount();
    codeStats.textContent = `${wordCount} palabras, ${lineCount} líneas`;
}

// Actualizar posición del cursor
function updateCursorPosition() {
    const cursor = codeEditor.getCursor();
    cursorPosition.textContent = `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
}

// Función para comentar/descomentar línea
function toggleComment() {
    const from = codeEditor.getCursor("from");
    const to = codeEditor.getCursor("to");
            
    // Comentar o descomentar según el caso
    codeEditor.toggleComment({ 
        lineComment: "#", 
        blockComment: ["'''", "'''"] 
    });
            
    updateLineNumbers();
    updateCodeStats();
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

// Función para avanzar
function avanzar() {
    alert('Función de avance activada');
    // Lógica para avanzar en el programa
}


// Función para guardar código
function guardarCodigo() {
    const codigo = codeEditor.getValue();
    
    // Verificar que hay código para guardar
    if (!codigo.trim()) {
        alert('No hay código para guardar');
        return;
    }

    // Obtener el nombre personalizado del input
    const nombreInput = document.getElementById('nombre-programa');
    const nombrePersonalizado = nombreInput.value.trim() || 'robot';
    
    if ('showSaveFilePicker' in window) {
        guardarConFileSystemAPI(codigo, nombrePersonalizado);
    } else {
        // Fallback para navegadores antiguos
        guardarConDescarga(codigo, nombrePersonalizado);
    }
}

// Función para actualizar el nombre en el header del editor
function actualizarNombreArchivo(nombre) {
    const nombreInput = document.getElementById('nombre-programa');
    if (nombreInput) {
        nombreInput.value = nombre;
    }
}

// Método moderno con File System Access API
async function guardarConFileSystemAPI(codigo, fileName) {
    try {
        const options = {
            suggestedName: `${fileName}.rinfo`,
            types: [
                {
                    description: 'Archivos R-Info',
                    accept: {
                        'text/plain': ['.rinfo'],
                    },
                },
            ],
        };

        const fileHandle = await window.showSaveFilePicker(options);
        
        // Crear un FileSystemWritableFileStream para escribir
        const writableStream = await fileHandle.createWritable();
        
        // Escribir el contenido
        await writableStream.write(codigo);
        
        // Cerrar el archivo
        await writableStream.close();
        
        console.log('Archivo R-Info guardado:', fileHandle.name);
        alert(`Archivo guardado correctamente: ${fileHandle.name}`);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error al guardar:', error);
            alert('Error al guardar el archivo: ' + error.message);
        }
        // Si es AbortError, el usuario canceló la operación
    }
}

// Método de fallback para navegadores antiguos
function guardarConDescarga(codigo, fileName) {
    try {
        // Crear blob con el contenido
        const blob = new Blob([codigo], { type: 'text/plain' });
        
        // Crear URL temporal
        const url = URL.createObjectURL(blob);
        
        // Crear elemento de enlace temporal
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.rinfo`;
        
        // Simular click para descargar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Liberar URL
        URL.revokeObjectURL(url);
        
        console.log('Archivo R-Info descargado:', `${fileName}.rinfo`);
        alert(`Archivo descargado correctamente: ${fileName}.rinfo`);
        
    } catch (error) {
        console.error('Error al descargar:', error);
        alert('Error al descargar el archivo: ' + error.message);
    }
}

// Función adicional para cargar archivos .rinfo
function cargarCodigo() {
    if ('showOpenFilePicker' in window) {
        cargarConFileSystemAPI();
    } else {
        cargarConInputArchivo();
    }
}

// Función cargarCodigo para actualizar el nombre
async function cargarConFileSystemAPI() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [
                {
                    description: 'Archivos R-Info',
                    accept: {
                        'text/plain': ['.rinfo'],
                    },
                },
            ],
            multiple: false
        });

        const file = await fileHandle.getFile();
        const contenido = await file.text();
        
        // Cargar el contenido en el editor
        codeEditor.setValue(contenido);
        
        // Extraer el nombre del archivo (sin extensión) y actualizar el input
        const nombreArchivo = file.name.replace('.rinfo', '');
        actualizarNombreArchivo(nombreArchivo);
        
        console.log('Archivo cargado:', file.name);
        alert(`Archivo cargado correctamente: ${file.name}`);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error al cargar:', error);
            alert('Error al cargar el archivo: ' + error.message);
        }
    }
}

// Función de fallback
function cargarConInputArchivo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.rinfo';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            codeEditor.setValue(e.target.result);
            
            // Extraer el nombre del archivo y actualizar el input
            const nombreArchivo = file.name.replace('.rinfo', '');
            actualizarNombreArchivo(nombreArchivo);
            
            console.log('Archivo cargado:', file.name);
            alert(`Archivo cargado correctamente: ${file.name}`);
        };
        
        reader.onerror = function() {
            alert('Error al leer el archivo');
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Función para exportar compilación
function exportarCompilacion() {
    const resultado = document.getElementById('resultado-compilacion')?.innerText || 
                     'No hay resultado de compilación disponible';
    
    if (!resultado || resultado === 'No hay resultado de compilación disponible') {
        alert('No hay resultado de compilación para exportar');
        return;
    }

    const contenido = `// Resultado de compilación R-Info\n// Fecha: ${new Date().toLocaleString()}\n\n${resultado}`;
    const fileName = prompt('Ingrese el nombre para el archivo de compilación:', 'compilacion');

    if (!fileName) return;

    if ('showSaveFilePicker' in window) {
        guardarConFileSystemAPI(contenido, fileName);
    } else {
        guardarConDescarga(contenido, fileName);
    }
}

// Función para alternar entre temas claro/oscuro
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const themeToggle = document.querySelector('.theme-toggle');
            
    if (document.body.classList.contains('light-theme')) {
        themeToggle.textContent = 'Tema Oscuro';
        codeEditor.setOption("theme", "eclipse");
        // Guardar preferencia
        localStorage.setItem('theme', 'light');
    } else {
        themeToggle.textContent = 'Tema Claro';
        codeEditor.setOption("theme", "dracula");
        // Guardar preferencia
        localStorage.setItem('theme', 'dark');
    }
}

// Cargar preferencia de tema al iniciar y inicializar la ciudad
window.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.querySelector('.theme-toggle').textContent = 'Tema Oscuro';
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
            
    // Inicializar el editor
    inicializarEditor();
            
    // Inicializar el control de velocidad
    actualizarValorVelocidad();
    document.getElementById('velocidad').addEventListener('input', actualizarValorVelocidad);
            
    // Aplicar el tema correcto al editor
    if (savedTheme === 'light') {
        codeEditor.setOption("theme", "eclipse");
    } else {
        codeEditor.setOption("theme", "dracula");
    }
});