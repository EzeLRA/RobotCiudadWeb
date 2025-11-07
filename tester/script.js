// Variables globales
let codeEditor;
let file = new FileManager();

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
    const errorList = document.getElementById('errorList');

    if(!machine.hasErrors()){
        alert('Compilación exitosa sin errores');
        let result = machine.getResultThree();
        // Actualizar resumen
        document.getElementById('totalProcesses').textContent = result.summary.totalProcesses;
        document.getElementById('totalInstructions').textContent = result.summary.totalInstructions;
        //document.getElementById('totalConexiones').textContent = result.summary.totalConexiones;
        document.getElementById('totalAreas').textContent = result.summary.totalAreas;
        document.getElementById('totalRobots').textContent = result.summary.totalRobots;
        document.getElementById('totalErrors').textContent = result.summary.totalErrors;

        errorList.innerHTML = '<div class="empty-state">No se encontraron errores</div>';
    }else{
        alert('La compilación terminó con errores');
        
        // Renderizar errores
        errorList.innerHTML = machine.reportErrors().map(error => `
            <div class="error-item">
                <div class="error-message">${error}</div>
            </div>
        `).join('');
        
    }
    
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
    const procesosResults = document.getElementById('processList');

    const result = machine.simplifyStageThree();
    
    semanticAnalizerResults.innerHTML = `<pre class="semantic-output">${result}</pre>`;
    semanticAnalizerResults.classList.remove('empty-state');

    const result2 = machine.getResultThree();
    
    /*
        Agregar el apartado de variables usados en los procesos
    */

    if (result2.executable.procesos.length > 0) {
        procesosResults.innerHTML = `
            <div class="processes-header">
                <h3>Procesos Declarados (${result2.executable.procesos.length})</h3>
                <div class="process-controls">
                    <button class="btn-expand-all" onclick="expandAllProcesses()">Expandir Todos</button>
                    <button class="btn-collapse-all" onclick="collapseAllProcesses()">Minimizar Todos</button>
                </div>
            </div>
            <div class="processes-list">
                ${result2.executable.procesos.map((proceso, index) => `
                    <div class="process-item" data-process-index="${index}">
                        <div class="process-header" onclick="toggleProcessDetails(${index})">
                            <div class="process-name">
                                <i class="process-icon">⚙️</i> 
                                <span class="process-title">${proceso.name}</span>
                                <span class="process-badge">${proceso.instructions.length} instr.</span>
                            </div>
                            <div class="process-toggle">
                                <i class="toggle-icon">▼</i>
                            </div>
                        </div>
                        <div class="process-details">
                            <div class="detail-section">
                                <h4>Información del Proceso</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>Nombre:</label>
                                        <span>${proceso.name}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Parámetros:</label>
                                        <span>${proceso.parameters && proceso.parameters.length > 0 ? 
                                            proceso.parameters.map(p => 
                                                typeof p === 'object' ? p.name || p : p
                                            ).join(', ') : 
                                            'Ninguno'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Total Instrucciones:</label>
                                        <span>${proceso.instructions.length}</span>
                                    </div>
                                    ${proceso.instructionCount ? `
                                    <div class="detail-item">
                                        <label>Instrucciones Ejecutables:</label>
                                        <span>${proceso.instructionCount}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4>Variables del Proceso</h4>
                                ${proceso.variables ? 
                                    proceso.variables.map(seccion =>
                                        seccion.declarations.map(variable =>
                                    `
                                        <div class="detail-item">
                                            <span>${variable.name + " : " + variable.variableType}</span>
                                        </div>
                                    `).join('')
                                    )
                                    : 'No se declararon variables en este proceso'}
                            </div>
                            
                            <div class="detail-section">
                                <h4>Instrucciones del Proceso</h4>
                                <div class="instructions-list">
                                    ${proceso.instructions.map((instruccion, instIndex) => `
                                        <div class="instruction-item">
                                            <span class="instruction-number">${instIndex + 1}.</span>
                                            <span class="instruction-type">${instruccion.type}</span>
                                            <span class="instruction-content">
                                                ${instruccion.instruction || instruccion.processName || 'N/A'}
                                                ${instruccion.parameters && instruccion.parameters.length > 0 ? 
                                                    `(${instruccion.parameters.join(', ')})` : 
                                                    ''}
                                            </span>
                                            ${instruccion.line !== undefined ? 
                                                `<span class="instruction-line">Línea ${instruccion.line}</span>` : 
                                                ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Inicializar todos los procesos como minimizados
        setTimeout(() => {
            collapseAllProcesses();
        }, 100);
        
    } else {
        procesosResults.innerHTML = '<div class="empty-state">No se declararon procesos</div>';
    }
}

// Función para expandir todos los procesos
function expandAllProcesses() {
    const processItems = document.querySelectorAll('.process-item');
    processItems.forEach(item => {
        const details = item.querySelector('.process-details');
        const toggleIcon = item.querySelector('.toggle-icon');
        details.style.display = 'block';
        toggleIcon.textContent = '▼';
        item.classList.add('expanded');
    });
}

// Función para minimizar todos los procesos
function collapseAllProcesses() {
    const processItems = document.querySelectorAll('.process-item');
    processItems.forEach(item => {
        const details = item.querySelector('.process-details');
        const toggleIcon = item.querySelector('.toggle-icon');
        details.style.display = 'none';
        toggleIcon.textContent = '▶';
        item.classList.remove('expanded');
    });
}

// Función para alternar la visibilidad de los detalles de un proceso
function toggleProcessDetails(index) {
    const processItem = document.querySelector(`[data-process-index="${index}"]`);
    const processDetails = processItem.querySelector('.process-details');
    const toggleIcon = processItem.querySelector('.toggle-icon');
    
    if (processDetails.style.display === 'none' || processDetails.style.display === '') {
        processDetails.style.display = 'block';
        toggleIcon.textContent = '▼';
        processItem.classList.add('expanded');
    } else {
        processDetails.style.display = 'none';
        toggleIcon.textContent = '▶';
        processItem.classList.remove('expanded');
    }
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
    
    updateCompilerResults();
}

// Funciones de archivo
function guardarCodigo() {
    file.guardarCodigo(codeEditor.getValue(), 'programa', document.getElementById('nombre-programa'));
}

function cargarCodigo() {
    file.cargarCodigo(document.createElement('input'), codeEditor, document.getElementById('nombre-programa'));
}