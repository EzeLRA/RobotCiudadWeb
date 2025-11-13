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
    const relaciones = vincularRobotsConAreas(result);

    // Filtrar solo las relaciones que tienen áreas o son relevantes
    const relacionesRelevantes = relaciones.filter(rel => 
        rel.area !== null || 
        rel.estado === 'sin_asignar' || 
        rel.estado === 'sin_variables'
    );

    if (relacionesRelevantes.length > 0) {
        areasList.innerHTML = `
            <div class="relations-header">
                <h3>Conexiones Robot-Área (${relacionesRelevantes.length})</h3>
                <div class="relations-stats">
                    ${relaciones.filter(r => r.estado === 'asignado').length} asignadas,
                    ${relaciones.filter(r => r.estado === 'error').length} con errores,
                    ${relaciones.filter(r => r.estado === 'sin_asignar').length} sin asignar
                </div>
            </div>
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
                                        <div class="detail-item">
                                            <label>Dirección:</label>
                                            <span>${relacion.robotInfo.direction}</span>
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

function updateRobotsList(result) {
    const robotsResults = document.getElementById('robotsList');
    
    if (result.executable.robots && result.executable.robots.length > 0) {
        robotsResults.innerHTML = `
            <div class="robots-header">
                <h3>Robots Declarados : ${result.executable.robots.length}</h3>
                <div class="robot-controls">
                    <button class="btn-expand-all" onclick="expandAllRobots()">Expandir Todos</button>
                    <button class="btn-collapse-all" onclick="collapseAllRobots()">Minimizar Todos</button>
                </div>
            </div>
            <div class="robots-list">
                ${result.executable.robots.map((robot, index) => `
                    <div class="robot-item" data-robot-index="${index}">
                        <div class="robot-header" onclick="toggleRobotDetails(${index})">
                            <div class="robot-name">
                                <i class="robot-icon">🤖</i> 
                                <span class="robot-title">${robot.name}</span>
                                <span class="robot-badge">${robot.instructions.length} instr.</span>
                            </div>
                            <div class="robot-toggle">
                                <i class="toggle-icon">▼</i>
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
                                    <div class="detail-item">
                                        <label>Posición:</label>
                                        <span>(${robot.position.x}, ${robot.position.y})</span>
                                    </div>
                                </div>
                            </div>
                        
                            <div class="detail-section">
                                <h4>Variables del Robot</h4>
                                ${robot.variables && robot.variables.length > 0 ? 
                                    robot.variables.map(variable => `
                                        <div class="detail-item">
                                            <span class="variable-name">${variable.name}</span>
                                            <span class="variable-type">: ${variable.type}</span>
                                            ${variable.value !== undefined ? 
                                                `<span class="variable-value"> = ${variable.value}</span>` : ''}
                                        </div>
                                    `).join('') 
                                    : '<div class="detail-item">No se declararon variables específicas para este robot</div>'
                                }
                            </div>
                            
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
        `;
        
        // Inicializar todos los robots como minimizados
        setTimeout(() => {
            collapseAllRobots();
        }, 100);
        
    } else {
        robotsResults.innerHTML = `
            <div class="empty-state">
                <div>No se declararon robots</div>
                <small>Define robots en la sección correspondiente del programa</small>
            </div>
        `;
    }
}

// Funciones para manejar la expansión/colapso de robots
function expandAllRobots() {
    const robotItems = document.querySelectorAll('.robot-item');
    robotItems.forEach(item => {
        const details = item.querySelector('.robot-details');
        const toggleIcon = item.querySelector('.toggle-icon');
        details.style.display = 'block';
        toggleIcon.textContent = '▼';
        item.classList.add('expanded');
    });
}

function collapseAllRobots() {
    const robotItems = document.querySelectorAll('.robot-item');
    robotItems.forEach(item => {
        const details = item.querySelector('.robot-details');
        const toggleIcon = item.querySelector('.toggle-icon');
        details.style.display = 'none';
        toggleIcon.textContent = '▶';
        item.classList.remove('expanded');
    });
}

function toggleRobotDetails(index) {
    const robotItem = document.querySelector(`[data-robot-index="${index}"]`);
    const robotDetails = robotItem.querySelector('.robot-details');
    const toggleIcon = robotItem.querySelector('.toggle-icon');
    
    if (robotDetails.style.display === 'none' || robotDetails.style.display === '') {
        robotDetails.style.display = 'block';
        toggleIcon.textContent = '▼';
        robotItem.classList.add('expanded');
    } else {
        robotDetails.style.display = 'none';
        toggleIcon.textContent = '▶';
        robotItem.classList.remove('expanded');
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
