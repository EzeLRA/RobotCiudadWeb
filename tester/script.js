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

function vincularRobotsConAreas(result) {
    if (!result || !result.executable) {
        return [];
    }

    const { areas, robots, main, variables } = result.executable;
    const relaciones = [];

    // 1. Mapear las variables de robots a sus tipos de robot
    const mapaVariablesRobots = new Map();
    
    // Procesar las variables para encontrar instancias de robots
    if (variables && typeof variables === 'object') {
        Object.entries(variables).forEach(([nombreVariable, infoVariable]) => {
            if (infoVariable && infoVariable.type) {
                // La clave aquí es que el TYPE de la variable indica el tipo de robot
                // No el value, ya que value suele ser null en la declaración
                const tipoRobot = infoVariable.type;
                
                // Verificar si este tipo corresponde a un robot declarado
                const robotDeclarado = robots.find(r => r.name === tipoRobot);
                
                if (robotDeclarado) {
                    mapaVariablesRobots.set(nombreVariable, {
                        tipoRobot: tipoRobot,
                        robotDeclarado: robotDeclarado,
                        variableInfo: infoVariable
                    });
                } else {
                    // Es una variable de tipo robot pero no se encontró el robot declarado
                    mapaVariablesRobots.set(nombreVariable, {
                        tipoRobot: tipoRobot,
                        robotDeclarado: null,
                        variableInfo: infoVariable,
                        error: `Tipo de robot "${tipoRobot}" no encontrado en la declaración de robots`
                    });
                }
            }
        });
    }

    // 2. Buscar instrucciones AsignarArea en el main
    const instruccionesAsignarArea = main.filter(instruccion => 
        instruccion.instruction === 'AsignarArea' && 
        instruccion.parameters && 
        instruccion.parameters.length >= 2
    );

    // 3. Para cada instrucción AsignarArea encontrada
    instruccionesAsignarArea.forEach(instruccion => {
        const [variableRobot, nombreArea] = instruccion.parameters;

        // Resolver el tipo de robot desde la variable
        const infoVariable = mapaVariablesRobots.get(variableRobot);
        
        if (infoVariable) {
            const { tipoRobot, robotDeclarado, error: errorVariable } = infoVariable;
            
            // Buscar el área por nombre
            const area = areas.find(a => a.name === nombreArea);

            if (robotDeclarado && area) {
                // Conexión exitosa: variable -> robot declarado -> área
                relaciones.push({
                    variable: variableRobot,
                    tipoRobot: tipoRobot,
                    robotDeclarado: robotDeclarado.name,
                    area: nombreArea,
                    robotInfo: robotDeclarado,
                    areaInfo: area,
                    instruccionLinea: instruccion.line || 0,
                    instruccionCompleta: `AsignarArea(${variableRobot}, ${nombreArea})`,
                    estado: 'asignado',
                    tipoConexion: 'variable_a_robot_declarado'
                });
            } else if (robotDeclarado && !area) {
                // Robot encontrado pero área no existe
                relaciones.push({
                    variable: variableRobot,
                    tipoRobot: tipoRobot,
                    robotDeclarado: robotDeclarado.name,
                    area: nombreArea,
                    robotInfo: robotDeclarado,
                    areaInfo: null,
                    instruccionLinea: instruccion.line || 0,
                    instruccionCompleta: `AsignarArea(${variableRobot}, ${nombreArea})`,
                    error: errorVariable || `Área "${nombreArea}" no encontrada`,
                    estado: 'error',
                    tipoConexion: 'variable_a_robot_declarado'
                });
            } else if (!robotDeclarado && area) {
                // Área encontrada pero el tipo de robot de la variable no existe
                relaciones.push({
                    variable: variableRobot,
                    tipoRobot: tipoRobot,
                    robotDeclarado: null,
                    area: nombreArea,
                    robotInfo: null,
                    areaInfo: area,
                    instruccionLinea: instruccion.line || 0,
                    instruccionCompleta: `AsignarArea(${variableRobot}, ${nombreArea})`,
                    error: errorVariable || `Robot declarado "${tipoRobot}" no encontrado`,
                    estado: 'error',
                    tipoConexion: 'variable_a_robot_inexistente'
                });
            } else {
                // Ni robot ni área encontrados
                relaciones.push({
                    variable: variableRobot,
                    tipoRobot: tipoRobot,
                    robotDeclarado: null,
                    area: nombreArea,
                    robotInfo: null,
                    areaInfo: null,
                    instruccionLinea: instruccion.line || 0,
                    instruccionCompleta: `AsignarArea(${variableRobot}, ${nombreArea})`,
                    error: errorVariable || `Robot "${tipoRobot}" y área "${nombreArea}" no encontrados`,
                    estado: 'error',
                    tipoConexion: 'variable_a_robot_inexistente'
                });
            }
        } else {
            // Variable no encontrada en el mapa (no declarada o no es de tipo robot)
            const area = areas.find(a => a.name === nombreArea);
            
            relaciones.push({
                variable: variableRobot,
                tipoRobot: null,
                robotDeclarado: null,
                area: nombreArea,
                robotInfo: null,
                areaInfo: area || null,
                instruccionLinea: instruccion.line || 0,
                instruccionCompleta: `AsignarArea(${variableRobot}, ${nombreArea})`,
                error: `Variable "${variableRobot}" no declarada o no es de tipo robot`,
                estado: 'error',
                tipoConexion: 'variable_no_declarada'
            });
        }
    });

    // 4. Identificar variables de robots que no tienen área asignada
    const variablesConAsignacion = new Set(relaciones.map(rel => rel.variable));
    
    mapaVariablesRobots.forEach((info, variable) => {
        if (!variablesConAsignacion.has(variable)) {
            const { tipoRobot, robotDeclarado, error: errorVariable } = info;
            
            relaciones.push({
                variable: variable,
                tipoRobot: tipoRobot,
                robotDeclarado: robotDeclarado ? robotDeclarado.name : null,
                area: null,
                robotInfo: robotDeclarado,
                areaInfo: null,
                instruccionLinea: null,
                instruccionCompleta: null,
                error: errorVariable || 'No tiene área asignada',
                estado: 'sin_asignar',
                tipoConexion: 'variable_sin_asignar'
            });
        }
    });

    // 5. Identificar robots declarados que no tienen variables asociadas
    const robotsConVariables = new Set(
        Array.from(mapaVariablesRobots.values())
            .filter(info => info.robotDeclarado)
            .map(info => info.robotDeclarado.name)
    );
    
    robots.forEach(robot => {
        if (!robotsConVariables.has(robot.name)) {
            relaciones.push({
                variable: null,
                tipoRobot: robot.name,
                robotDeclarado: robot.name,
                area: null,
                robotInfo: robot,
                areaInfo: null,
                instruccionLinea: null,
                instruccionCompleta: null,
                error: 'No tiene variables asociadas',
                estado: 'sin_variables',
                tipoConexion: 'robot_sin_variables'
            });
        }
    });

    // 6. Identificar áreas que no tienen robots asignados
    const areasConRobots = new Set(relaciones
        .filter(rel => rel.area && rel.estado === 'asignado')
        .map(rel => rel.area)
    );

    areas.forEach(area => {
        if (!areasConRobots.has(area.name)) {
            relaciones.push({
                variable: null,
                tipoRobot: null,
                robotDeclarado: null,
                area: area.name,
                robotInfo: null,
                areaInfo: area,
                instruccionLinea: null,
                instruccionCompleta: null,
                error: 'No tiene robots asignados',
                estado: 'sin_robots',
                tipoConexion: 'area_sin_robots'
            });
        }
    });

    return relaciones;
}

function renderRobotAreaRelations(result) {
    const areasList = document.getElementById('areaList');
    
    // Limpiar contenido anterior
    areasList.innerHTML = '';
    
    // Verificar si hay resultados válidos
    if (!result || !result.executable) {
        areasList.innerHTML = `
            <div class="empty-state">
                <div>Compile para ver las conexiones robot-área</div>
                <small>Los resultados se mostrarán después de la compilación</small>
            </div>
        `;
        return;
    }

    const relaciones = vincularRobotsConAreas(result);

    // Filtrar solo las relaciones que tienen áreas o son relevantes
    const relacionesRelevantes = relaciones.filter(rel => 
        rel.area !== null || 
        rel.estado === 'sin_asignar' || 
        rel.estado === 'sin_variables'
    );

    if (relacionesRelevantes.length > 0) {
        areasList.innerHTML = `
            <div class="section-header">
                <h3>Conexiones Robot-Área (${relacionesRelevantes.length})</h3>
                <div class="relations-stats">
                    ${relaciones.filter(r => r.estado === 'asignado').length} asignadas,
                    ${relaciones.filter(r => r.estado === 'error').length} con errores,
                    ${relaciones.filter(r => r.estado === 'sin_asignar').length} sin asignar
                </div>
            </div>
            <div class="relations-content">
                <div class="relations-list">
                    ${relacionesRelevantes.map((relacion, index) => `
                        <div class="relation-item ${relacion.estado === 'asignado' ? 'relation-success' : 
                                                  relacion.estado === 'error' ? 'relation-error' : 
                                                  'relation-warning'}">
                            <div class="relation-header">
                                <div class="relation-title">
                                    <i class="relation-icon">
                                        ${relacion.estado === 'asignado' ? '🔗' : 
                                          relacion.estado === 'error' ? '⚠️' : '❓'}
                                    </i>
                                    ${relacion.variable ? `<span class="variable-name">${relacion.variable}</span>` : ''}
                                    ${relacion.tipoRobot ? `
                                        <span class="relation-arrow">→</span>
                                        <span class="robot-type">${relacion.tipoRobot}</span>
                                    ` : ''}
                                    ${relacion.area ? `
                                        <span class="relation-arrow">→</span>
                                        <span class="area-name">${relacion.area}</span>
                                    ` : ''}
                                </div>
                                <div class="relation-status ${relacion.estado === 'asignado' ? 'status-success' : 
                                                             relacion.estado === 'error' ? 'status-error' : 
                                                             'status-warning'}">
                                    ${relacion.estado === 'asignado' ? 'Conectado' : 
                                      relacion.estado === 'error' ? 'Error' : 
                                      relacion.estado === 'sin_asignar' ? 'Sin asignar' : 
                                      relacion.estado === 'sin_variables' ? 'Sin variables' : 'Sin robots'}
                                </div>
                            </div>
                            
                            <div class="relation-details">
                                ${relacion.tipoConexion ? `
                                    <div class="connection-type">
                                        <small>Tipo: ${relacion.tipoConexion.replace(/_/g, ' ')}</small>
                                    </div>
                                ` : ''}
                                
                                ${relacion.variable ? `
                                    <div class="variable-details">
                                        <h4>Variable</h4>
                                        <div class="detail-grid">
                                            <div class="detail-item">
                                                <label>Nombre:</label>
                                                <span>${relacion.variable}</span>
                                            </div>
                                            ${relacion.tipoRobot ? `
                                            <div class="detail-item">
                                                <label>Tipo:</label>
                                                <span>${relacion.tipoRobot}</span>
                                            </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${relacion.robotInfo ? `
                                    <div class="robot-details">
                                        <h4>Robot Declarado</h4>
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
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${relacion.areaInfo ? `
                                    <div class="area-details">
                                        <h4>Área</h4>
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
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${relacion.instruccionCompleta ? `
                                    <div class="instruction-details">
                                        <h4>Instrucción</h4>
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
                                        <h4>⚠️ Problema</h4>
                                        <div class="error-message">${relacion.error}</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        areasList.innerHTML = `
            <div class="empty-state">
                <div>No se encontraron conexiones robot-área</div>
                <small>Define variables de tipo robot y asígnales áreas usando AsignarArea()</small>
            </div>
        `;
    }
}

function updateProcesosList(result){
    const procesosResults = document.getElementById('processList');
    
    // Limpiar contenido anterior
    procesosResults.innerHTML = '';
        
    if (result.executable.procesos.length > 0) {
        procesosResults.innerHTML = `
            <div class="section-header">
                <h3>Procesos Declarados (${result.executable.procesos.length})</h3>
            </div>
            <div class="processes-content">
                <div class="processes-list">
                    ${result.executable.procesos.map((proceso, index) => `
                        <div class="process-item">
                            <div class="process-header">
                                <div class="process-name">
                                    <i class="process-icon">⚙️</i> 
                                    <span class="process-title">${proceso.name}</span>
                                    <span class="process-badge">${proceso.instructions.length} instr.</span>
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
                                
                                ${proceso.variables ? `
                                <div class="detail-section">
                                    <h4>Variables del Proceso</h4>
                                    ${proceso.variables.map(seccion =>
                                        seccion.declarations.map(variable =>
                                    `
                                        <div class="detail-item">
                                            <span>${variable.name + " : " + variable.variableType}</span>
                                        </div>
                                    `).join('')
                                    )}
                                </div>
                                ` : ''}
                                
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
            </div>
        `;
    } else {
        procesosResults.innerHTML = `
            <div class="section-header">
                <h3>Procesos Declarados (0)</h3>
            </div>
            <div class="empty-state">No se declararon procesos</div>
        `;
    }
}

// En renderCompilerResults, asegúrate de limpiar antes de mostrar resultados:
function renderCompilerResults() {
    const errorList = document.getElementById('errorList');

    if(!machine.hasErrors()){
        alert('Compilación exitosa sin errores');
        let result = machine.getResultThree();
        
        // Actualiza el resumen
        document.getElementById('totalProcesses').textContent = result.summary.totalProcesses;
        document.getElementById('totalInstructions').textContent = result.summary.totalInstructions;
        document.getElementById('totalAreas').textContent = result.summary.totalAreas;
        document.getElementById('totalRobots').textContent = result.summary.totalRobots;
        document.getElementById('totalErrors').textContent = 0;

        // Limpiar y actualizar cada sección
        errorList.innerHTML = '<div class="empty-state">No se encontraron errores</div>';

        // Actualizar el apartado de información del programa
        updateProcesosList(result); // Procesos
        updateRobotsList(result);   // Robots
        renderRobotAreaRelations(result); // Areas

    } else {
        alert('La compilación terminó con errores');
        
        const erroresReport = machine.reportErrors();

        document.getElementById('totalErrors').textContent = erroresReport.length;

        // Limpiar y renderizar errores
        errorList.innerHTML = erroresReport.map(error => `
            <div class="error-item">
                <div class="error-message">${error}</div>
            </div>
        `).join('');
        
        // Limpiar las otras secciones cuando hay errores
        document.getElementById('processList').innerHTML = '<div class="empty-state">No se puede mostrar procesos debido a errores de compilación</div>';
        document.getElementById('robotsList').innerHTML = '<div class="empty-state">No se puede mostrar robots debido a errores de compilación</div>';
        document.getElementById('areaList').innerHTML = '<div class="empty-state">No se puede mostrar áreas debido a errores de compilación</div>';
    }
}

// En la función updateRobotsList, cambia la estructura:
function updateRobotsList(result) {
    const robotsResults = document.getElementById('robotsList');
    
    // Limpiar completamente el contenido anterior
    robotsResults.innerHTML = '';
    
    if (result.executable.robots && result.executable.robots.length > 0) {
        robotsResults.innerHTML = `
            <div class="section-header">
                <h3>Robots Declarados: ${result.executable.robots.length}</h3>
            </div>
            <div class="robots-content">
                <div class="robots-list">
                    ${result.executable.robots.map((robot, index) => `
                        <div class="robot-item">
                            <div class="robot-header">
                                <div class="robot-name">
                                    <i class="robot-icon">🤖</i> 
                                    <span class="robot-title">${robot.name}</span>
                                    <span class="robot-badge">${robot.instructions.length} instr.</span>
                                </div>
                            </div>
                            <div class="robot-details">
                                <div class="detail-section">
                                    <h4>Información del Robot</h4>
                                    <div class="detail-grid">
                                        <div class="detail-item">
                                            <label>Nombre:</label>
                                            <span>${robot.name}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Total Instrucciones:</label>
                                            <span>${robot.instructions.length}</span>
                                        </div>
                                    </div>
                                </div>
                            
                                ${robot.variables && robot.variables.length > 0 ? `
                                <div class="detail-section">
                                    <h4>Variables del Robot</h4>
                                    ${robot.variables.map(variable => `
                                        <div class="detail-item">
                                            <span class="variable-name">${variable.name}</span>
                                            <span class="variable-type">: ${variable.type}</span>
                                            ${variable.value !== undefined ? 
                                                `<span class="variable-value"> = ${variable.value}</span>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                                ` : ''}
                                
                                <div class="detail-section">
                                    <h4>Instrucciones del Robot</h4>
                                    <div class="instructions-list">
                                        ${robot.instructions.map((instruccion, instIndex) => `
                                            <div class="instruction-item ${instruccion.type === 'control' ? 'instruction-control' : 
                                                                         instruccion.type === 'action' ? 'instruction-action' : 
                                                                         'instruction-basic'}">
                                                <span class="instruction-number">${instIndex + 1}.</span>
                                                <span class="instruction-type">${instruccion.type || 'instrucción'}</span>
                                                <span class="instruction-content">
                                                    ${instruccion.instruction || instruccion.processName || 'N/A'}
                                                    ${instruccion.parameters && instruccion.parameters.length > 0 ? 
                                                        `(${instruccion.parameters.map(p => 
                                                            typeof p === 'object' ? JSON.stringify(p) : p
                                                        ).join(', ')})` : 
                                                        ''}
                                                </span>
                                                ${instruccion.line !== undefined ? 
                                                    `<span class="instruction-line">Línea ${instruccion.line}</span>` : 
                                                    ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                
                                ${robot.areaInfo ? `
                                <div class="detail-section">
                                    <h4>Información del Área Asignada</h4>
                                    <div class="detail-grid">
                                        <div class="detail-item">
                                            <label>Nombre del Área:</label>
                                            <span>${robot.areaInfo.name}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Tipo:</label>
                                            <span>${robot.areaInfo.type}</span>
                                        </div>
                                        <div class="detail-item">
                                            <label>Dimensiones:</label>
                                            <span>${robot.areaInfo.dimensions.join(' x ')}</span>
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        robotsResults.innerHTML = `
            <div class="section-header">
                <h3>Robots Declarados: 0</h3>
            </div>
            <div class="empty-state">
                <div>No se declararon robots</div>
                <small>Define robots en la sección correspondiente del programa</small>
            </div>
        `;
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
        document.getElementById('totalAreas').textContent = result.summary.totalAreas;
        document.getElementById('totalRobots').textContent = result.summary.totalRobots;
        document.getElementById('totalErrors').textContent = 0;

        errorList.innerHTML = '<div class="empty-state">No se encontraron errores</div>';

        //Actualiza el apartado de informacion del programa
        updateProcesosList(result); // Procesos
        updateRobotsList(result);   // Robots
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

// Al inicializar, limpiar todos los contenedores de resultados
document.addEventListener('DOMContentLoaded', function() {
    inicializarEditor();
    
    // Limpiar contenedores al cargar y establecer contenido inicial
    const containers = [
        { id: 'robotsList', message: 'Compile el código para ver los robots' },
        { id: 'processList', message: 'Compile el código para ver los procesos' },
        { id: 'areaList', message: 'Compile el código para ver las áreas' },
        { id: 'errorList', message: 'No hay errores' }
    ];
    
    containers.forEach(container => {
        const element = document.getElementById(container.id);
        if (element) {
            element.innerHTML = `
                <div class="empty-state">
                    <div>${container.message}</div>
                    <small>Los resultados se mostrarán después de la compilación</small>
                </div>
            `;
        }
    });
    
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