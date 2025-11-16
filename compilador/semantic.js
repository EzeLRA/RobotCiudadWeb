class SemanticAnalyzer {
    constructor() {
        this.resetState();
    }

    resetState() {
        this.symbolTable = new Map();
        this.scopeStack = [new Map()];
        this.errors = [];
        this.currentScope = 'global';
        this.processesInfo = [];
        this.processCalls = [];
        this.executableCode = {
            programa: '',
            areas: [],
            robots: [],
            procesos: [],
            main: [],
            variables: new Map()
        };
        
        this.messageCommunications = {
            senders: new Map(),
            receivers: new Map(),
            connections: new Set(),
            robotCommunications: new Map()
        };
    }

    analyze(ast) {
        this.resetState();
        this.visitProgram(ast);
        
        return {
            symbolTable: this.getFormattedSymbolTable(),
            processes: this.processesInfo,
            processCalls: this.processCalls,
            executable: {
                ...this.executableCode,
                variables: this.mapToObject(this.executableCode.variables)
            },
            errors: this.errors,
            success: this.errors.length === 0,
            summary: this.getAnalysisSummary(),
            communicationStats: this.getCommunicationStats()
        };
    }

    // ========== MÉTODOS PRINCIPALES DE ANÁLISIS ==========

    visitProgram(node) {
        this.enterScope('global');
        this.executableCode.programa = node.name;
        
        const sectionHandlers = {
            'VariablesSection': (section) => this.visitVariablesSection(section),
            'ProcesosSection': (section) => this.visitProcesosSection(section),
            'RobotsSection': (section) => this.visitRobotsSection(section),
            'MainBlock': (section) => this.visitMainBlock(section),
            'AreasSection': (section) => this.visitAreasSection(section)
        };

        node.body.forEach(section => {
            const handler = sectionHandlers[section.type];
            if (handler) {
                handler(section);
            } else {
                this.errors.push(`Sección no reconocida: ${section.type}`);
            }
        });
        
        this.exitScope();
    }

    visitVariablesSection(node) {
        node.declarations.forEach(decl => {
            this.declareVariable(decl.name, decl.variableType || decl.type, 'global');
            
            const variableInfo = {
                name: decl.name,
                type: decl.variableType || decl.type,
                value: null,
                initialized: false
            };
            
            if (variableInfo.type === 'robot') {
                this.processRobotVariable(decl.name, variableInfo);
            }
            
            this.executableCode.variables.set(decl.name, variableInfo);
        });
    }

    visitAreasSection(node) {
        node.areas.forEach(area => {
            this.declareVariable(area.name, 'area', 'global');
            
            this.executableCode.areas.push({
                name: area.name,
                type: area.areaType,
                dimensions: area.dimensions || [],
                bounds: this.calculateAreaBounds(area.dimensions)
            });
        });
    }

    visitProcesosSection(node) {
        node.procesos.forEach(proceso => {
            this.declareProcess(proceso.name, proceso.parameters);
            
            this.processesInfo.push({
                name: proceso.name,
                parameters: proceso.parameters || [],
                variables: proceso.variables || [],
                bodyStatements: proceso.body ? proceso.body.length : 0,
                scope: `proceso:${proceso.name}`
            });

            const executableProceso = {
                name: proceso.name,
                parameters: proceso.parameters || [],
                variables: proceso.variables || [],
                instructions: this.compileInstructions(proceso.body)
            };
            
            this.executableCode.procesos.push(executableProceso);
            this.visitProceso(proceso);
        });
    }

    visitProceso(node) {
        this.enterScope(`proceso:${node.name}`);
        
        node.parameters.forEach(param => {
            const paramName = typeof param === 'string' ? param : param.name;
            this.declareVariable(paramName, 'numero', `proceso:${node.name}`);
        });

        this.visitBlock(node.body);
        this.exitScope();
    }

    visitRobotsSection(node) {
        node.robots.forEach(robot => {
            this.declareVariable(robot.name, 'robot', 'global');
            
            const robotInfo = {
                name: robot.name,
                instructions: this.compileInstructions(robot.body),
                position: { x: 0, y: 0 },
                direction: 'este',
                bag: { flores: 0, papeles: 0 },
                active: false,
                variableName: null,
                area: null
            };
            
            this.executableCode.robots.push(robotInfo);
            
            this.enterScope(`robot:${robot.name}`);
            this.visitBlock(robot.body);
            this.exitScope();
        });
    }

    visitMainBlock(node) {
        this.enterScope('main');
        this.executableCode.main = this.compileInstructions(node.body);
        
        this.processMainInstructions();
        this.visitBlock(node.body);
        this.exitScope();
    }

    // ========== MÉTODOS DE VISITACIÓN DE STATEMENTS ==========

    visitBlock(statements) {
        statements.forEach(stmt => this.visitStatement(stmt));
    }

    visitStatement(node) {
        const statementHandlers = {
            'VariableDeclaration': () => this.visitVariableDeclaration(node),
            'IfStatement': () => this.visitIfStatement(node),
            'WhileStatement': () => this.visitWhileStatement(node),
            'RepeatStatement': () => this.visitRepeatStatement(node),
            'Assignment': () => this.visitAssignment(node),
            'ProcessCall': () => this.visitProcessCall(node),
            'ElementalInstruction': () => this.visitElementalInstruction(node),
            'AreaDefinition': () => this.visitAreaDefinition(node)
        };

        const handler = statementHandlers[node.type];
        if (handler) {
            handler();
        } else {
            this.errors.push(`Tipo de statement no reconocido: ${node.type}`);
        }
    }

    visitVariableDeclaration(node) {
        const declarations = node.declarations || [node];
        declarations.forEach(decl => {
            this.declareVariable(decl.name, decl.type || decl.variableType, this.currentScope);
        });
    }

    visitIfStatement(node) {
        this.visitCondition(node.condition || node.test);
        this.enterScope('if');
        this.visitBlock(node.consequent);
        this.exitScope();
        
        if (node.alternate) {
            this.enterScope('else');
            this.visitBlock(node.alternate);
            this.exitScope();
        }
    }

    visitWhileStatement(node) {
        this.visitCondition(node.condition || node.test);
        this.enterScope('while');
        this.visitBlock(node.body);
        this.exitScope();
    }

    visitRepeatStatement(node) {
        if (node.count?.value !== undefined && node.count.value <= 0) {
            this.errors.push(`El contador de repetición debe ser mayor a 0`);
        }
        
        this.enterScope('repeat');
        this.visitBlock(node.body);
        this.exitScope();
    }

    visitAssignment(node) {
        if (node.left?.name) {
            const variable = this.lookupVariable(node.left.name);
            if (!variable) {
                this.errors.push(`Variable '${node.left.name}' no declarada`);
            } else {
                variable.initialized = true;
            }
        }
        
        if (node.right) {
            this.visitExpression(node.right);
        }
    }

    visitProcessCall(node) {
        const processCall = {
            name: node.name,
            parameters: node.parameters || [],
            line: node.line || 'desconocida',
            isValid: false
        };

        this.processCalls.push(processCall);

        const process = this.lookupProcess(node.name);
        if (!process) {
            this.errors.push(`Proceso '${node.name}' no declarado`);
            return;
        }

        processCall.isValid = true;
        this.validateProcessCallParameters(node, process);
    }

    visitElementalInstruction(node) {
        const validInstructions = new Set([
            'Iniciar', 'derecha', 'mover', 'tomarFlor', 'tomarPapel',
            'depositarFlor', 'depositarPapel', 'PosAv', 'PosCa',
            'HayFlorEnLaBolsa', 'HayPapelEnLaBolsa', 'HayFlorEnLaEsquina', 
            'HayPapelEnLaEsquina', 'Pos', 'Informar', 'AsignarArea',
            'Random', 'BloquearEsquina', 'LiberarEsquina',
            'EnviarMensaje', 'RecibirMensaje'
        ]);

        if (!validInstructions.has(node.instruction)) {
            this.errors.push(`Instrucción elemental no reconocida: '${node.instruction}'`);
        }

        if (node.instruction === 'EnviarMensaje' || node.instruction === 'RecibirMensaje') {
            this.analyzeMessageCommunication(node);
        }

        if (node.parameters) {
            node.parameters.forEach(param => {
                this.visitParameter(param, node.instruction);
            });
        }
    }

    visitAreaDefinition(node) {
        const validAreaTypes = new Set(['AreaC', 'AreaPC', 'AreaP']);
        
        if (!validAreaTypes.has(node.areaType)) {
            this.errors.push(`Tipo de área no reconocido: '${node.areaType}'`);
        }

        if (node.dimensions?.length !== 4) {
            this.errors.push(`El área '${node.name}' debe tener exactamente 4 dimensiones`);
        }

        if (node.dimensions) {
            node.dimensions.forEach(dim => {
                if (isNaN(dim) && !this.lookupVariable(dim)) {
                    this.errors.push(`Dimensión inválida en área '${node.name}': ${dim}`);
                }
            });
        }
    }

    // ========== MÉTODOS DE VISITACIÓN DE EXPRESIONES ==========

    visitCondition(node) {
        if (node?.expression) {
            const words = node.expression.split(/\s+/);
            words.forEach(word => {
                if (this.isIdentifier(word) && !this.isOperator(word) && !this.isKeyword(word) && 
                    !this.isNumber(word) && !this.lookupVariable(word)) {
                    this.errors.push(`Variable '${word}' no declarada en condición`);
                }
            });
        }
    }

    visitExpression(node) {
        if (!node) return;
        
        const expressionHandlers = {
            'Identifier': () => this.visitIdentifier(node),
            'Literal': () => this.visitLiteral(node),
            'BinaryExpression': () => this.visitBinaryExpression(node),
            'UnaryExpression': () => this.visitUnaryExpression(node)
        };

        const handler = expressionHandlers[node.type];
        if (handler) {
            handler();
        } else if (node.value !== undefined) {
            this.visitLiteral(node);
        }
    }

    visitIdentifier(node) {
        const variable = this.lookupVariable(node.name);
        if (!variable) {
            this.errors.push(`Variable '${node.name}' no declarada`);
        } else if (!variable.initialized) {
            this.errors.push(`Variable '${node.name}' no inicializada`);
        }
    }

    visitLiteral(node) {
        if (node.value === undefined) {
            this.errors.push(`Literal sin valor`);
        }
    }

    visitBinaryExpression(node) {
        this.visitExpression(node.left);
        this.visitExpression(node.right);
        
        const validOperators = new Set(['+', '-', '*', '/', '==', '!=', '<', '>', '<=', '>=', '&', '|']);
        if (!validOperators.has(node.operator)) {
            this.errors.push(`Operador no válido: '${node.operator}'`);
        }
    }

    visitUnaryExpression(node) {
        this.visitExpression(node.argument);
        
        const validOperators = new Set(['-', '!', '~']);
        if (!validOperators.has(node.operator)) {
            this.errors.push(`Operador unario no válido: '${node.operator}'`);
        }
    }

    visitParameter(param, context, index = -1) {
        if (typeof param === 'string') {
            if (isNaN(param) && !this.lookupVariable(param)) {
                const contextStr = index >= 0 ? `parámetro ${index + 1} de ${context}` : context;
                this.errors.push(`Variable '${param}' no declarada (en ${contextStr})`);
            }
        } else if (typeof param === 'object') {
            this.visitExpression(param);
        }
    }

    // ========== MÉTODOS DE COMUNICACIÓN DE MENSAJES ==========

    analyzeMessageCommunication(node) {
        const currentEntity = this.getCurrentEntityName();
        
        if (node.instruction === 'EnviarMensaje') {
            const target = node.parameters?.[0] ? this.extractParameterValue(node.parameters[0]) : null;
            this.registerMessageSend(currentEntity, target);
        } else if (node.instruction === 'RecibirMensaje') {
            const source = node.parameters?.[0] ? this.extractParameterValue(node.parameters[0]) : null;
            this.registerMessageReceive(currentEntity, source);
        }
    }

    registerMessageSend(sender, target = null) {
        const senderName = this.getCurrentEntityName();
        
        const currentSends = this.messageCommunications.senders.get(senderName) || 0;
        this.messageCommunications.senders.set(senderName, currentSends + 1);
        
        if (target) {
            const connectionKey = `${senderName}->${target}`;
            this.messageCommunications.connections.add(connectionKey);
        }
        
        this.updateRobotCommunicationStats(senderName, 'send');
    }

    registerMessageReceive(receiver, source = null) {
        const receiverName = this.getCurrentEntityName();
        
        const currentReceives = this.messageCommunications.receivers.get(receiverName) || 0;
        this.messageCommunications.receivers.set(receiverName, currentReceives + 1);
        
        if (source) {
            const connectionKey = `${source}->${receiverName}`;
            this.messageCommunications.connections.add(connectionKey);
        }
        
        this.updateRobotCommunicationStats(receiverName, 'receive');
    }

    updateRobotCommunicationStats(entityName, type) {
        if (!this.messageCommunications.robotCommunications.has(entityName)) {
            this.messageCommunications.robotCommunications.set(entityName, {
                sends: 0,
                receives: 0,
                total: 0
            });
        }
        
        const stats = this.messageCommunications.robotCommunications.get(entityName);
        if (type === 'send') stats.sends++;
        else if (type === 'receive') stats.receives++;
        stats.total = stats.sends + stats.receives;
    }

    // ========== MÉTODOS DE COMPILACIÓN ==========

    compileInstructions(statements) {
        return statements.map(statement => {
            const instructionHandlers = {
                'ElementalInstruction': () => this.compileElementalInstruction(statement),
                'ProcessCall': () => this.compileProcessCall(statement),
                'IfStatement': () => this.compileIfStatement(statement),
                'WhileStatement': () => this.compileWhileStatement(statement),
                'RepeatStatement': () => this.compileRepeatStatement(statement)
            };

            const handler = instructionHandlers[statement.type];
            return handler ? handler() : { type: 'unknown', original: statement };
        });
    }

    compileElementalInstruction(node) {
        return {
            type: 'instruction',
            instruction: node.instruction,
            parameters: node.parameters || [],
            line: node.line || 0
        };
    }

    compileProcessCall(node) {
        return {
            type: 'process_call',
            processName: node.name,
            parameters: node.parameters || [],
            line: node.line || 0
        };
    }

    compileIfStatement(node) {
        return {
            type: 'if',
            condition: node.condition || node.test,
            consequent: this.compileInstructions(node.consequent),
            alternate: node.alternate ? this.compileInstructions(node.alternate) : [],
            line: node.line || 0
        };
    }

    compileWhileStatement(node) {
        return {
            type: 'while',
            condition: node.condition || node.test,
            body: this.compileInstructions(node.body),
            line: node.line || 0
        };
    }

    compileRepeatStatement(node) {
        return {
            type: 'repeat',
            count: node.count?.value || node.count,
            body: this.compileInstructions(node.body),
            line: node.line || 0
        };
    }

    // ========== MÉTODOS AUXILIARES ==========

    processRobotVariable(variableName, variableInfo) {
        const robotName = this.findRobotNameForVariable(variableName);
        if (robotName) {
            variableInfo.value = robotName;
            variableInfo.initialized = true;
            
            const robot = this.executableCode.robots.find(r => r.name === robotName);
            if (robot) {
                robot.variableName = variableName;
            }
        }
    }

    findRobotNameForVariable(variableName) {
        const robots = this.executableCode.robots;
        
        // Coincidencia directa
        const directMatch = robots.find(robot => robot.name === variableName);
        if (directMatch) return directMatch.name;
        
        // Estrategias de búsqueda
        const possibleNames = [
            variableName,
            variableName.replace('R_', 'robot'),
            variableName.toLowerCase(),
            `robot${variableName}`
        ];
        
        for (const name of possibleNames) {
            const match = robots.find(robot => 
                robot.name.toLowerCase() === name.toLowerCase()
            );
            if (match) return match.name;
        }
        
        // Único robot disponible
        return robots.length === 1 ? robots[0].name : null;
    }

    processMainInstructions() {
        this.executableCode.main.forEach(instruction => {
            if (instruction.instruction === 'AsignarArea' && instruction.parameters?.length >= 2) {
                this.processAreaAssignment(instruction);
            } else if (instruction.instruction === 'Iniciar' && instruction.parameters?.length >= 3) {
                this.processRobotInitialization(instruction);
            }
        });
    }

    processAreaAssignment(instruction) {
        const [variableRobot, areaName] = instruction.parameters;
        const variableInfo = this.executableCode.variables.get(variableRobot);
        
        if (variableInfo && variableInfo.value) {
            const robot = this.executableCode.robots.find(r => r.name === variableInfo.value);
            if (robot) {
                robot.area = areaName;
                variableInfo.assignedArea = areaName;
            }
        }
    }

    processRobotInitialization(instruction) {
        const [variableRobot, x, y] = instruction.parameters;
        const variableInfo = this.executableCode.variables.get(variableRobot);
        
        if (variableInfo && variableInfo.value) {
            const robot = this.executableCode.robots.find(r => r.name === variableInfo.value);
            if (robot) {
                robot.position = { 
                    x: parseInt(x) || 0, 
                    y: parseInt(y) || 0 
                };
                robot.active = true;
                variableInfo.initialPosition = { x: parseInt(x) || 0, y: parseInt(y) || 0 };
            }
        }
    }

    validateProcessCallParameters(node, process) {
        const expectedParams = process.parameters?.length || 0;
        const actualParams = node.parameters?.length || 0;
        
        if (actualParams !== expectedParams) {
            this.errors.push(`Número incorrecto de parámetros para '${node.name}'. Esperados: ${expectedParams}, obtenidos: ${actualParams}`);
            this.processCalls[this.processCalls.length - 1].isValid = false;
        }

        node.parameters?.forEach((param, index) => {
            this.visitParameter(param, node.name, index);
        });
    }

    extractParameterValue(param) {
        if (typeof param === 'string') return param;
        if (param?.value !== undefined) return param.value.toString();
        if (param?.name) return param.name;
        return null;
    }

    calculateAreaBounds(dimensions) {
        if (!dimensions || dimensions.length !== 4) {
            return { x1: 0, y1: 0, x2: 99, y2: 99 };
        }
        
        return {
            x1: parseInt(dimensions[0]) || 0,
            y1: parseInt(dimensions[1]) || 0,
            x2: parseInt(dimensions[2]) || 99,
            y2: parseInt(dimensions[3]) || 99
        };
    }

    // ========== MÉTODOS DE GESTIÓN DE ÁMBITOS Y VARIABLES ==========

    enterScope(scopeName) {
        this.scopeStack.push(new Map());
        this.currentScope = scopeName;
    }

    exitScope() {
        if (this.scopeStack.length > 1) {
            this.scopeStack.pop();
            this.currentScope = this.scopeStack[this.scopeStack.length - 1].get('_scopeName') || 'global';
        }
    }

    declareVariable(name, type, scope) {
        const currentScope = this.scopeStack[this.scopeStack.length - 1];
        
        if (currentScope.has(name)) {
            this.errors.push(`Variable '${name}' ya declarada en este ámbito`);
        } else {
            currentScope.set(name, { 
                type, 
                scope, 
                initialized: type !== 'robot'
            });
            
            if (!currentScope.has('_scopeName')) {
                currentScope.set('_scopeName', scope);
            }
        }
    }

    lookupVariable(name) {
        for (let i = this.scopeStack.length - 1; i >= 0; i--) {
            if (this.scopeStack[i].has(name)) {
                return this.scopeStack[i].get(name);
            }
        }
        return null;
    }

    declareProcess(name, parameters) {
        const globalScope = this.scopeStack[0];
        globalScope.set(`process:${name}`, { 
            parameters: parameters || [],
            scope: 'global'
        });
    }

    lookupProcess(name) {
        return this.scopeStack[0].get(`process:${name}`);
    }

    // ========== MÉTODOS DE INFORMES Y ESTADÍSTICAS ==========

    getCurrentEntityName() {
        if (this.currentScope.startsWith('robot:')) {
            return this.currentScope.replace('robot:', '');
        } else if (this.currentScope.startsWith('proceso:')) {
            return this.currentScope.replace('proceso:', '');
        } else if (this.currentScope === 'main') {
            return 'main';
        }
        return 'global';
    }

    getFormattedSymbolTable() {
        const result = [];
        this.scopeStack.forEach(scope => {
            scope.forEach((value, key) => {
                if (!key.startsWith('process:') && key !== '_scopeName') {
                    result.push({
                        name: key,
                        type: value.type,
                        scope: value.scope,
                        initialized: value.initialized || false
                    });
                }
            });
        });
        return result;
    }

    getTotalInstructionsProcesos() {
        return this.processesInfo.reduce((total, p) => total + p.bodyStatements, 0);
    }

    getTotalInstructionsRobots() {
        return this.executableCode.robots.reduce((total, r) => {
            return total + r.instructions.filter(instr => instr.type !== 'process_call').length;
        }, 0);
    }

    getTotalInstructions() {
        return this.getTotalInstructionsProcesos() + this.getTotalInstructionsRobots();
    }

    getAnalysisSummary() {
        const robotVariables = Array.from(this.executableCode.variables.values())
            .filter(v => v.type === 'robot').length;

        return {
            totalInstructions: this.getTotalInstructions(),
            totalProcesses: this.processesInfo.length,
            totalProcessCalls: this.processCalls.length,
            validProcessCalls: this.processCalls.filter(call => call.isValid).length,
            totalErrors: this.errors.length,
            totalVariables: this.getFormattedSymbolTable().length,
            totalRobots: this.executableCode.robots.length,
            totalRobotVariables: robotVariables,
            totalAreas: this.executableCode.areas.length,
            totalConexiones: this.calculateTotalConexiones()
        };
    }

    getCommunicationStats() {
        const totalSends = Array.from(this.messageCommunications.senders.values())
            .reduce((sum, count) => sum + count, 0);
        const totalReceives = Array.from(this.messageCommunications.receivers.values())
            .reduce((sum, count) => sum + count, 0);
        
        const communicatingRobots = new Set([
            ...this.messageCommunications.senders.keys(),
            ...this.messageCommunications.receivers.keys()
        ]);

        const effectiveConnections = Array.from(this.messageCommunications.connections)
            .filter(conn => {
                const [, receiver] = conn.split('->');
                return this.messageCommunications.receivers.has(receiver) && 
                       this.messageCommunications.receivers.get(receiver) > 0;
            });

        return {
            totalSends,
            totalReceives,
            totalConnections: this.messageCommunications.connections.size,
            effectiveConnections: effectiveConnections.length,
            communicatingEntities: Array.from(communicatingRobots),
            totalCommunicatingRobots: communicatingRobots.size,
            byRobot: Array.from(this.messageCommunications.robotCommunications.entries()).map(([name, stats]) => ({
                name,
                sends: stats.sends,
                receives: stats.receives,
                total: stats.total,
                isCommunicating: stats.total > 0
            })),
            totalConexiones: this.calculateTotalConexiones()
        };
    }

    calculateTotalConexiones() {
        const communicatingEntities = new Set();
        
        this.messageCommunications.robotCommunications.forEach((stats, entity) => {
            if (stats.sends > 0) {
                let hasReceiver = false;
                this.messageCommunications.connections.forEach(conn => {
                    if (conn.startsWith(`${entity}->`)) {
                        const receiver = conn.split('->')[1];
                        if (this.messageCommunications.receivers.has(receiver) && 
                            this.messageCommunications.receivers.get(receiver) > 0) {
                            hasReceiver = true;
                        }
                    }
                });
                
                if (hasReceiver) {
                    communicatingEntities.add(entity);
                }
            }
        });
        
        return communicatingEntities.size;
    }

    mapToObject(map) {
        const obj = {};
        for (let [key, value] of map) {
            obj[key] = value;
        }
        return obj;
    }

    // ========== MÉTODOS DE VALIDACIÓN ==========

    isOperator(word) {
        return /^[+\-*/=<>!&|,:~]$/.test(word);
    }

    isKeyword(word) {
        const keywords = new Set([
            'si', 'sino', 'mientras', 'repetir', 'proceso', 'robot', 'variables', 
            'numero', 'booleano', 'comenzar', 'fin', 'programa', 'procesos', 
            'areas', 'robots', 'V', 'F'
        ]);
        return keywords.has(word);
    }

    isNumber(word) {
        return /^\d+$/.test(word);
    }

    isIdentifier(word) {
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(word);
    }
}