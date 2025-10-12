// Variables globales
let codeEditor;

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
            },
            "Ctrl-F": function(cm) {
                // autoFormatear();
            },
            "Ctrl-/": function(cm) {
                // toggleComment();
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

// Funciones de compilación
function compilar() {
    const sourceCode = codeEditor.getValue();
    
    try {
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
            console.log(semanticResult);
            alert('Compilación exitosa sin errores.');
        }

        /*
        // Por ahora usamos datos de ejemplo
        const result = {
            symbolTable: [
                { name: "R_info", type: "robot1", scope: "global", initialized: true }
            ],
            processes: [
                {
                    name: "recorrerAvenida",
                    parameters: [
                        { direction: "E", name: "numAv", type: "numero" }
                    ],
                    variables: [],
                    bodyStatements: 3,
                    scope: "proceso:recorrerAvenida"
                }
            ],
            processCalls: [
                {
                    name: "recorrerAvenida",
                    parameters: ["1"],
                    line: 19,
                    isValid: true
                }
            ],
            executable: {
                programa: "ejemplo",
                areas: [
                    {
                        name: "ciudad",
                        type: "AreaC",
                        dimensions: ["1", "1", "100", "100"],
                        bounds: { x1: 1, y1: 1, x2: 100, y2: 100 }
                    }
                ],
                robots: [
                    {
                        name: "robot1",
                        instructions: [
                            {
                                type: "process_call",
                                processName: "recorrerAvenida",
                                parameters: ["1"],
                                line: 0
                            }
                        ],
                        position: { x: 0, y: 0 },
                        direction: "este",
                        bag: { flores: 0, papeles: 0 },
                        active: false
                    }
                ],
                procesos: [
                    {
                        name: "recorrerAvenida",
                        parameters: [
                            { direction: "E", name: "numAv", type: "numero" }
                        ],
                        instructions: [
                            {
                                type: "instruction",
                                instruction: "Pos",
                                parameters: ["numAv", "1"],
                                line: 0
                            },
                            {
                                type: "repeat",
                                count: 99,
                                body: [
                                    {
                                        type: "instruction",
                                        instruction: "mover",
                                        parameters: [],
                                        line: 0
                                    }
                                ],
                                line: 0
                            }
                        ]
                    }
                ],
                main: [
                    {
                        type: "instruction",
                        instruction: "AsignarArea",
                        parameters: ["R_info", "ciudad"],
                        line: 0
                    },
                    {
                        type: "instruction",
                        instruction: "Iniciar",
                        parameters: ["R_info", "1", "1"],
                        line: 0
                    }
                ],
                variables: new Map([
                    ["R_info", { name: "R_info", type: "robot1", value: null }]
                ])
            },
            errors: [],
            success: true,
            summary: {
                totalProcesses: 1,
                totalProcessCalls: 1,
                validProcessCalls: 1,
                totalErrors: 0,
                totalVariables: 1,
                totalRobots: 1,
                totalAreas: 1
            }
        };
        
        // Actualizar el panel de resultados
        updateCompilerResults(result);
        */
    } catch (error) {
        alert('Error durante la compilación: ' + error.message);
        //updateCompilerResults(errorResult);
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
// Función para actualizar el nombre en el header del editor
function actualizarNombreArchivo(nombre) {
    const nombreInput = document.getElementById('nombre-programa');
    if (nombreInput) {
        nombreInput.value = nombre;
    }
}

// Función para renderizar los resultados
function renderCompilerResults(result) {
    // Actualizar estado
    const statusIndicator = document.getElementById('statusIndicator');
    if (result.success && result.errors.length === 0) {
        statusIndicator.className = 'status-indicator status-success';
        statusIndicator.innerHTML = '<div class="status-icon"></div><span>Compilación Exitosa</span>';
    } else {
        statusIndicator.className = 'status-indicator status-error';
        statusIndicator.innerHTML = '<div class="status-icon"></div><span>Errores de Compilación</span>';
    }

    // Actualizar resumen
    document.getElementById('totalProcesses').textContent = result.summary.totalProcesses;
    document.getElementById('totalProcessCalls').textContent = result.summary.totalProcessCalls;
    document.getElementById('totalVariables').textContent = result.summary.totalVariables;
    document.getElementById('totalErrors').textContent = result.summary.totalErrors;

    // Renderizar procesos
    const processList = document.getElementById('processList');
    if (result.processes && result.processes.length > 0) {
        processList.innerHTML = result.processes.map(process => `
            <div class="process-item">
                <div class="process-name">
                    <i>⚙️</i> ${process.name}
                </div>
                <div class="process-details">
                    <div><strong>Parámetros:</strong> ${process.parameters.length}</div>
                    <div><strong>Instrucciones:</strong> ${process.bodyStatements}</div>
                    <div><strong>Ámbito:</strong> ${process.scope}</div>
                    ${process.parameters.length > 0 ? `
                        <div class="param-list">
                            ${process.parameters.map(param => `
                                <div class="param-item">
                                    <span>${typeof param === 'string' ? param : param.name}</span>
                                    <span>${typeof param === 'object' ? param.type : 'numero'}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } else {
        processList.innerHTML = '<div class="empty-state">No se declararon procesos</div>';
    }

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
}

// Función para actualizar con nuevos resultados
function updateCompilerResults(newResult) {
    renderCompilerResults(newResult);
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