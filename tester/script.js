// Variables globales
let codeEditor;

//Compiler
let machine = new Machine();

/*
    Funciones para inicializar y manejar el editor de código.
*/

// Inicializar CodeMirror
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
            }
        }
    });
            
    // Configurar el editor
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
        const lineNumbers = document.getElementById('line-numbers');
        if (lineNumbers) {
            lineNumbers.scrollTop = codeEditor.getScrollInfo().top;
        }
    });
    
    // Inicializar números de línea y estadísticas
    updateLineNumbers();
    updateCursorPosition();
    updateCodeStats();
}

// Funciones auxiliares del editor
function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers) return;
    
    const lineCount = codeEditor.lineCount();
    let numbers = '';
    for (let i = 1; i <= lineCount; i++) {
        numbers += i + '<br>';
    }
    lineNumbers.innerHTML = numbers;
}

function updateCodeStats() {
    const codeStats = document.getElementById('code-stats');
    if (!codeStats) return;
    
    const text = codeEditor.getValue();
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const lineCount = codeEditor.lineCount();
    codeStats.textContent = `${wordCount} palabras, ${lineCount} líneas`;
}

function updateCursorPosition() {
    const cursorPosition = document.getElementById('cursor-position');
    if (!cursorPosition) return;
    
    const cursor = codeEditor.getCursor();
    cursorPosition.textContent = `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
}

// Función para actualizar el nombre en el header del editor
function actualizarNombreArchivo(nombre) {
    const nombreInput = document.getElementById('nombre-programa');
    if (nombreInput) {
        nombreInput.value = nombre;
    }
}

// Función para renderizar los resultados
function renderCompilerResults() {
    let result = machine.getResultThree();
    // Actualizar resumen
    document.getElementById('totalProcesses').textContent = result.summary.totalProcesses;
    document.getElementById('totalInstructions').textContent = result.summary.totalInstructions;
    //document.getElementById('totalConexiones').textContent = result.summary.totalConexiones;
    document.getElementById('totalAreas').textContent = result.summary.totalAreas;
    document.getElementById('totalRobots').textContent = result.summary.totalRobots;
    document.getElementById('totalErrors').textContent = result.summary.totalErrors;

    /*

    // Renderizar llamadas a procesos
    const processCallList = document.getElementById('processCallList');
    if (result.processCalls && result.processCalls.length > 0) {
        processCallList.innerHTML = result.processCalls.map(call => `
            <div class="process-call-item ${call.isValid ? 'call-valid' : 'call-invalid'}">
                <div>
                    <strong>${call.name}</strong>
                    <div class="process-details">
                        Parámetros: [${call.parameters.join(', ')}]
                        ${call.line !== 'desconocida' ? ` • Línea: ${call.line}` : ''}
                    </div>
                </div>
                <div class="valid-badge ${call.isValid ? 'valid-true' : 'valid-false'}">
                    ${call.isValid ? 'Válida' : 'Inválida'}
                </div>
            </div>
        `).join('');
    } else {
        processCallList.innerHTML = '<div class="empty-state">No se realizaron llamadas a procesos</div>';
    }

    // Renderizar variables
    const variableList = document.getElementById('variableList');
    if (result.symbolTable && result.symbolTable.length > 0) {
        variableList.innerHTML = result.symbolTable.map(variable => `
            <div class="variable-item">
                <div class="variable-name">
                    <i>📝</i> ${variable.name}
                </div>
                <div class="variable-details">
                    <div><strong>Tipo:</strong> ${variable.type}</div>
                    <div><strong>Ámbito:</strong> ${variable.scope}</div>
                    <div><strong>Inicializada:</strong> ${variable.initialized ? 'Sí' : 'No'}</div>
                </div>
            </div>
        `).join('');
    } else {
        variableList.innerHTML = '<div class="empty-state">No se declararon variables globales</div>';
    }

    // Renderizar áreas
    const areaList = document.getElementById('areaList');
    if (result.executable.areas && result.executable.areas.length > 0) {
        areaList.innerHTML = result.executable.areas.map(area => `
            <div class="area-item">
                <div class="area-name">
                    <i>🗺️</i> ${area.name}
                </div>
                <div class="area-details">
                    <div><strong>Tipo:</strong> ${area.type}</div>
                    <div><strong>Dimensiones:</strong> ${area.dimensions.join(' x ')}</div>
                    <div><strong>Límites:</strong> (${area.bounds.x1}, ${area.bounds.y1}) a (${area.bounds.x2}, ${area.bounds.y2})</div>
                </div>
            </div>
        `).join('');
    } else {
        areaList.innerHTML = '<div class="empty-state">No se declararon áreas</div>';
    }

    // Renderizar errores
    const errorList = document.getElementById('errorList');
    if (result.errors && result.errors.length > 0) {
        errorList.innerHTML = result.errors.map(error => `
            <div class="error-item">
                <div class="error-message">${error}</div>
            </div>
        `).join('');
    } else {
        errorList.innerHTML = '<div class="empty-state">No se encontraron errores</div>';
    }

    // Renderizar código ejecutable
    const executableCode = document.getElementById('executableCode');
    if (result.executable) {
        executableCode.textContent = JSON.stringify(result.executable, null, 2);
    } else {
        executableCode.textContent = "No se generó código ejecutable";
    }
    
    */
}

// Funciones para mostrar los resultados del proceso de compilacion
function renderLexerResults() {
    const lexerResults = document.getElementById('lexerResults');

    const tokenText = machine.simplifyStageOne();

    lexerResults.innerHTML = `<pre>${tokenText}</pre>`;
    lexerResults.classList.remove('empty-state');

}

function renderParserResults() {
    const parserResults = document.getElementById('parserResults');

    const result = machine.simplifyStageTwo();
    
    parserResults.innerHTML = `<pre class="parser-output">${result}</pre>`;
    parserResults.classList.remove('empty-state');
}

function renderSemanticResults() {
    const semanticAnalizerResults = document.getElementById('semanticResults');

    const result = machine.simplifyStageThree();
    
    semanticAnalizerResults.innerHTML = `<pre class="semantic-output">${result}</pre>`;
    semanticAnalizerResults.classList.remove('empty-state');
}

// Función para actualizar con nuevos resultados
function updateCompilerResults() {
    renderLexerResults();
    renderParserResults();
    renderSemanticResults();
    renderCompilerResults();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    inicializarEditor();
    
    // Configurar toggle para código ejecutable
    document.getElementById('toggleExecutable').addEventListener('click', function() {
        const codeBlock = document.getElementById('executableCode');
        const toggleButton = document.getElementById('toggleExecutable');
        
        if (codeBlock.classList.contains('hidden')) {
            codeBlock.classList.remove('hidden');
            toggleButton.innerHTML = '<span>Ocultar</span> <i>▲</i>';
        } else {
            codeBlock.classList.add('hidden');
            toggleButton.innerHTML = '<span>Mostrar</span> <i>▼</i>';
        }
    });
});

/*
    Funciones de compilación y manejo de archivos.
*/

// Funciones de compilación
function compilar() {
    const sourceCode = codeEditor.getValue();
    
    machine.reset(sourceCode);

    machine.runAllStages();
    /*
    // 1. Análisis Léxico
    const result1 = machine.stageOne();
    console.log(result1);
        
    // 2. Proceso de Parsing
    const result2 = machine.stageTwo();
    console.log(result2);
        
    // 3. Análisis Semántico
    const result3 = machine.stageThree();
    console.log(result3);
    */

    if (machine.hasErrors()) {
        alert(machine.reportErrors()); 
    }else{
        alert("Compilacion terminada");
        updateCompilerResults();
    }
}

// Funciones de archivo (placeholders)
function guardarCodigo() {
    const codigo = codeEditor.getValue();
    const nombre = document.getElementById('nombre-programa').value || 'programa';
    
    if ('showSaveFilePicker' in window) {
        guardarConFileSystemAPI(codigo, nombre);
    } else {
        // Fallback para navegadores antiguos
        guardarConDescarga(codigo, nombre);
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
