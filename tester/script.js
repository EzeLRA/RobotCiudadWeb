// Variables globales
let codeEditor;
let file = new FileManager();

//Compiler
let machine = new Machine();

/*
    Funciones para inicializar y manejar el editor de código. "Mini interprete"
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




/*
     Funciones para renderizar resultados
*/


//Revisar
function vincularRobotsConAreas(result) {
    if (!result || !result.executable) {
        return [];
    }

    const { areas, robots, main } = result.executable;
    const relaciones = [];

    // Buscar instrucciones AsignarArea en el main
    const instruccionesAsignarArea = main.filter(instruccion => 
        instruccion.instruction === 'AsignarArea' && 
        instruccion.parameters && 
        instruccion.parameters.length >= 2
    );

    // Para cada instrucción AsignarArea encontrada
    instruccionesAsignarArea.forEach(instruccion => {
        const [nombreRobot, nombreArea] = instruccion.parameters;

        // Buscar el robot por nombre
        const robot = robots.find(r => r.name === nombreRobot);
        
        // Buscar el área por nombre
        const area = areas.find(a => a.name === nombreArea);

        if (robot && area) {
            relaciones.push({
                robot: nombreRobot,
                area: nombreArea,
                robotInfo: robot,
                areaInfo: area,
                instruccionLinea: instruccion.line || 0,
                instruccionCompleta: `AsignarArea(${nombreRobot}, ${nombreArea})`
            });
        } else if (robot && !area) {
            // Robot encontrado pero área no existe
            relaciones.push({
                robot: nombreRobot,
                area: nombreArea,
                robotInfo: robot,
                areaInfo: null,
                instruccionLinea: instruccion.line || 0,
                instruccionCompleta: `AsignarArea(${nombreRobot}, ${nombreArea})`,
                error: `Área "${nombreArea}" no encontrada`
            });
        } else if (!robot && area) {
            // Área encontrada pero robot no existe
            relaciones.push({
                robot: nombreRobot,
                area: nombreArea,
                robotInfo: null,
                areaInfo: area,
                instruccionLinea: instruccion.line || 0,
                instruccionCompleta: `AsignarArea(${nombreRobot}, ${nombreArea})`,
                error: `Robot "${nombreRobot}" no encontrado`
            });
        }
    });

    // También buscar robots que no tengan área asignada
    robots.forEach(robot => {
        const tieneAsignacion = relaciones.some(rel => rel.robot === robot.name);
        if (!tieneAsignacion) {
            relaciones.push({
                robot: robot.name,
                area: null,
                robotInfo: robot,
                areaInfo: null,
                instruccionLinea: null,
                instruccionCompleta: null,
                error: 'No tiene área asignada'
            });
        }
    });

    return relaciones;
}

function renderRobotAreaRelations(result) {
    const areasList = document.getElementById('areaList');
    const relaciones = vincularRobotsConAreas(result);

    if (relaciones.length > 0) {
        areasList.innerHTML = `
            <div class="relations-header">
                <h3>Relaciones Robot-Área (${relaciones.length})</h3>
            </div>
            <div class="relations-list">
                ${relaciones.map((relacion, index) => `
                    <div class="relation-item ${relacion.error ? 'relation-error' : 'relation-success'}">
                        <div class="relation-header">
                            <div class="relation-title">
                                <i class="relation-icon">${relacion.error ? '⚠️' : '🔗'}</i>
                                <span class="robot-name">${relacion.robot}</span>
                                <span class="relation-arrow">→</span>
                                <span class="area-name ${!relacion.area ? 'area-missing' : ''}">
                                    ${relacion.area || 'Sin área'}
                                </span>
                            </div>
                            <div class="relation-status ${relacion.error ? 'status-error' : 'status-success'}">
                                ${relacion.error ? 'Error' : 'Asignado'}
                            </div>
                        </div>
                        
                        <div class="relation-details">
                            ${relacion.robotInfo ? `
                                <div class="robot-details">
                                    <h4>Información del Robot</h4>
                                    <div class="detail-grid">
                                        <div class="detail-item">
                                            <label>Nombre:</label>
                                            <span>${relacion.robotInfo.name}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Instrucciones:</label>
                                            <span>${relacion.robotInfo.instructions.length}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Posición:</label>
                                            <span>(${relacion.robotInfo.position.x}, ${relacion.robotInfo.position.y})</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Dirección:</label>
                                            <span>${relacion.robotInfo.direction}</span>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${relacion.areaInfo ? `
                                <div class="area-details">
                                    <h4>Información del Área</h4>
                                    <div class="detail-grid">
                                        <div class="detail-item">
                                            <label>Nombre:</label>
                                            <span>${relacion.areaInfo.name}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Tipo:</label>
                                            <span>${relacion.areaInfo.type}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Dimensiones:</label>
                                            <span>${relacion.areaInfo.dimensions.join(' x ')}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Límites:</label>
                                            <span>(${relacion.areaInfo.bounds.x1}, ${relacion.areaInfo.bounds.y1}) a (${relacion.areaInfo.bounds.x2}, ${relacion.areaInfo.bounds.y2})</span>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${relacion.instruccionCompleta ? `
                                <div class="instruction-details">
                                    <h4>Instrucción de Asignación</h4>
                                    <div class="instruction-code">
                                        <code>${relacion.instruccionCompleta}</code>
                                        ${relacion.instruccionLinea !== null ? 
                                            `<span class="instruction-line">Línea ${relacion.instruccionLinea}</span>` : 
                                            ''}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${relacion.error ? `
                                <div class="error-details">
                                    <h4>⚠️ Problema de Asignación</h4>
                                    <div class="error-message">${relacion.error}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        areasList.innerHTML = `
            <div class="empty-state">
                <div>No se encontraron areas definidas</div>
                <small>Los robots deben ser asignados a áreas usando AsignarArea()</small>
            </div>
        `;
    }
}

function updateProcesosList(result){
    const procesosResults = document.getElementById('processList');
        
        if (result.executable.procesos.length > 0) {
            procesosResults.innerHTML = `
                <div class="processes-header">
                    <h3>Procesos Declarados (${result.executable.procesos.length})</h3>
                    <div class="process-controls">
                        <button class="btn-expand-all" onclick="expandAllProcesses()">Expandir Todos</button>
                        <button class="btn-collapse-all" onclick="collapseAllProcesses()">Minimizar Todos</button>
                    </div>
                </div>
                <div class="processes-list">
                    ${result.executable.procesos.map((proceso, index) => `
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

function renderCompilerResults() {
    const errorList = document.getElementById('errorList');

    if(!machine.hasErrors()){
        alert('Compilación exitosa sin errores');
        let result = machine.getResultThree();
        // Actualiza el resumen
        
        document.getElementById('totalProcesses').textContent = result.summary.totalProcesses;
        document.getElementById('totalInstructions').textContent = result.summary.totalInstructions;
        //document.getElementById('totalConexiones').textContent = result.summary.totalConexiones;
        document.getElementById('totalAreas').textContent = result.summary.totalAreas;
        document.getElementById('totalRobots').textContent = result.summary.totalRobots;
        document.getElementById('totalErrors').textContent = 0;

        errorList.innerHTML = '<div class="empty-state">No se encontraron errores</div>';

        //Actualiza el apartado de informacion del programa
        updateProcesosList(result); // Procesos
        renderRobotAreaRelations(result); // Areas

    }else{
        alert('La compilación terminó con errores');
        
        const erroresReport = machine.reportErrors();

        document.getElementById('totalErrors').textContent = erroresReport.length;

        // Renderizar errores
        errorList.innerHTML = erroresReport.map(error => `
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


/*
    Funciones mecanicas
*/

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
