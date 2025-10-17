class SemanticAnalyzer {
    constructor() {
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
    }

    analyze(ast) {
        this.symbolTable.clear();
        this.errors = [];
        this.scopeStack = [new Map()];
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
        
        this.visitProgram(ast);
        
        return {
            symbolTable: this.getFormattedSymbolTable(),
            processes: this.getProcessesInfo(),
            processCalls: this.processCalls,
            executable: this.executableCode,
            errors: this.errors,
            success: this.errors.length === 0,
            summary: this.getAnalysisSummary()
        };
    }

    visitProgram(node) {
        this.enterScope('global');
        this.executableCode.programa = node.name;
        
        node.body.forEach(section => {
            if (section.type === 'VariablesSection') {
                this.visitVariablesSection(section);
            } else if (section.type === 'ProcesosSection') {
                this.visitProcesosSection(section);
            } else if (section.type === 'RobotsSection') {
                this.visitRobotsSection(section);
            } else if (section.type === 'MainBlock') {
                this.visitMainBlock(section);
            } else if (section.type === 'AreasSection') {
                this.visitAreasSection(section);
            }
        });
        
        this.exitScope();
    }

    visitVariablesSection(node) {
        node.declarations.forEach(decl => {
            this.declareVariable(decl.name, decl.variableType || decl.type, 'global');
            
            this.executableCode.variables.set(decl.name, {
                name: decl.name,
                type: decl.variableType || decl.type,
                value: null
            });
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
            
            this.executableCode.robots.push({
                name: robot.name,
                instructions: this.compileInstructions(robot.body),
                position: { x: 0, y: 0 },
                direction: 'este',
                bag: { flores: 0, papeles: 0 },
                active: false
            });
            
            this.enterScope(`robot:${robot.name}`);
            this.visitBlock(robot.body);
            this.exitScope();
        });
    }

    visitMainBlock(node) {
        this.enterScope('main');
        this.executableCode.main = this.compileInstructions(node.body);
        this.visitBlock(node.body);
        this.exitScope();
    }

    visitBlock(statements) {
        statements.forEach(stmt => {
            this.visitStatement(stmt);
        });
    }

    visitStatement(node) {
        switch (node.type) {
            case 'VariableDeclaration':
                this.visitVariableDeclaration(node);
                break;
            case 'IfStatement':
                this.visitIfStatement(node);
                break;
            case 'WhileStatement':
                this.visitWhileStatement(node);
                break;
            case 'RepeatStatement':
                this.visitRepeatStatement(node);
                break;
            case 'Assignment':
                this.visitAssignment(node);
                break;
            case 'ProcessCall':
                this.visitProcessCall(node);
                break;
            case 'ElementalInstruction':
                this.visitElementalInstruction(node);
                break;
            case 'AreaDefinition':
                this.visitAreaDefinition(node);
                break;
            default:
                this.errors.push(`Tipo de statement no reconocido: ${node.type}`);
        }
    }

    visitVariableDeclaration(node) {
        if (node.declarations) {
            node.declarations.forEach(decl => {
                this.declareVariable(decl.name, decl.type, this.currentScope);
            });
        } else {
            this.declareVariable(node.name, node.variableType, this.currentScope);
        }
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
        if (node.count && node.count.value !== undefined) {
            if (node.count.value <= 0) {
                this.errors.push(`El contador de repetición debe ser mayor a 0`);
            }
        }
        
        this.enterScope('repeat');
        this.visitBlock(node.body);
        this.exitScope();
    }

    visitAssignment(node) {
        if (node.left && node.left.name) {
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
        this.processCalls.push({
            name: node.name,
            parameters: node.parameters || [],
            line: node.line || 'desconocida',
            isValid: false
        });

        const process = this.lookupProcess(node.name);
        if (!process) {
            this.errors.push(`Proceso '${node.name}' no declarado`);
            return;
        }

        const callIndex = this.processCalls.length - 1;
        this.processCalls[callIndex].isValid = true;

        const expectedParams = process.parameters ? process.parameters.length : 0;
        const actualParams = node.parameters ? node.parameters.length : 0;
        
        if (actualParams !== expectedParams) {
            this.errors.push(`Número incorrecto de parámetros para '${node.name}'. Esperados: ${expectedParams}, obtenidos: ${actualParams}`);
            this.processCalls[callIndex].isValid = false;
        }

        if (node.parameters) {
            node.parameters.forEach((param, index) => {
                this.visitParameter(param, node.name, index);
            });
        }
    }

    visitElementalInstruction(node) {
        const validInstructions = [
            'Iniciar', 'derecha', 'mover', 'tomarFlor', 'tomarPapel',
            'depositarFlor', 'depositarPapel', 'PosAv', 'PosCa',
            'HayFlorEnLaBolsa', 'HayPapelEnLaBolsa', 'HayFlorEnLaEsquina', 
            'HayPapelEnLaEsquina', 'Pos', 'Informar', 'AsignarArea',
            'Random', 'BloquearEsquina', 'LiberarEsquina',
            'EnviarMensaje', 'RecibirMensaje'
        ];

        if (!validInstructions.includes(node.instruction)) {
            this.errors.push(`Instrucción elemental no reconocida: '${node.instruction}'`);
        }

        if (node.parameters) {
            node.parameters.forEach(param => {
                this.visitParameter(param, node.instruction);
            });
        }
    }

    visitAreaDefinition(node) {
        const validAreaTypes = ['AreaC', 'AreaPC', 'AreaP'];
        
        if (!validAreaTypes.includes(node.areaType)) {
            this.errors.push(`Tipo de área no reconocido: '${node.areaType}'`);
        }

        if (node.dimensions && node.dimensions.length !== 4) {
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

    visitCondition(node) {
        if (node && node.expression) {
            const expr = node.expression;
            const words = expr.split(/\s+/);
            words.forEach(word => {
                if (!this.isOperator(word) && !this.isKeyword(word) && !this.isNumber(word) && 
                    this.isIdentifier(word) && !this.lookupVariable(word)) {
                    this.errors.push(`Variable '${word}' no declarada en condición`);
                }
            });
        }
    }

    visitExpression(node) {
        if (!node) return;
        
        switch (node.type) {
            case 'Identifier':
                this.visitIdentifier(node);
                break;
            case 'Literal':
                this.visitLiteral(node);
                break;
            case 'BinaryExpression':
                this.visitBinaryExpression(node);
                break;
            case 'UnaryExpression':
                this.visitUnaryExpression(node);
                break;
            default:
                if (node.value !== undefined) {
                    this.visitLiteral(node);
                }
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
        
        const validOperators = ['+', '-', '*', '/', '==', '!=', '<', '>', '<=', '>=', '&', '|'];
        if (!validOperators.includes(node.operator)) {
            this.errors.push(`Operador no válido: '${node.operator}'`);
        }
    }

    visitUnaryExpression(node) {
        this.visitExpression(node.argument);
        
        const validOperators = ['-', '!', '~'];
        if (!validOperators.includes(node.operator)) {
            this.errors.push(`Operador unario no válido: '${node.operator}'`);
        }
    }

    visitParameter(param, context, index = -1) {
        if (typeof param === 'string') {
            if (isNaN(param)) {
                const variable = this.lookupVariable(param);
                if (!variable) {
                    const contextStr = index >= 0 ? `parámetro ${index + 1} de ${context}` : context;
                    this.errors.push(`Variable '${param}' no declarada (en ${contextStr})`);
                }
            }
        } else if (typeof param === 'object') {
            this.visitExpression(param);
        }
    }

    // Métodos de compilación para código ejecutable
    compileInstructions(statements) {
        return statements.map(statement => {
            switch (statement.type) {
                case 'ElementalInstruction':
                    return this.compileElementalInstruction(statement);
                case 'ProcessCall':
                    return this.compileProcessCall(statement);
                case 'IfStatement':
                    return this.compileIfStatement(statement);
                case 'WhileStatement':
                    return this.compileWhileStatement(statement);
                case 'RepeatStatement':
                    return this.compileRepeatStatement(statement);
                default:
                    return { type: 'unknown', original: statement };
            }
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

    // Métodos auxiliares
    isOperator(word) {
        return /^[+\-*/=<>!&|,:~]$/.test(word);
    }

    isKeyword(word) {
        const keywords = ['si', 'sino', 'mientras', 'repetir', 'proceso', 'robot', 'variables', 
                         'numero', 'booleano', 'comenzar', 'fin', 'programa', 'procesos', 
                         'areas', 'robots', 'V', 'F'];
        return keywords.includes(word);
    }

    isNumber(word) {
        return /^\d+$/.test(word);
    }

    isIdentifier(word) {
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(word);
    }

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
                type: type, 
                scope: scope, 
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

    getFormattedSymbolTable() {
        const result = [];
        this.scopeStack.forEach((scope, index) => {
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

    getProcessesInfo() {
        return this.processesInfo;
    }

    getTotalInstructionsProcesos(){
        let total = 0;
        for (let p of this.processesInfo) {
            total += p.bodyStatements;
        }
        return total;
    }

    getTotalInstructionsRobots(){
        let total = 0;
        for (let r of this.executableCode.robots) {
            for (let instr of r.instructions){
                if (instr.type != 'process_call') {
                    total += 1;
                }
            }
        }
        return total;
    }

    getTotalInstructions() {
        return this.getTotalInstructionsProcesos() + this.getTotalInstructionsRobots() ;
    }

    getAnalysisSummary() {
        return {
            totalInstructions: this.getTotalInstructions(),
            totalProcesses: this.processesInfo.length,
            totalProcessCalls: this.processCalls.length,
            validProcessCalls: this.processCalls.filter(call => call.isValid).length,
            totalErrors: this.errors.length,
            totalVariables: this.getFormattedSymbolTable().length,
            totalRobots: this.executableCode.robots.length,
            totalAreas: this.executableCode.areas.length
        };
    }
}