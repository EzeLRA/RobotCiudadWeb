class SemanticAnalyzer {
    constructor() {
        this.symbolTable = new Map();
        this.scopeStack = [new Map()]; // Pila de ámbitos
        this.errors = [];
        this.currentScope = 'global';
    }

    analyze(ast) {
        this.symbolTable.clear();
        this.errors = [];
        this.scopeStack = [new Map()];
        
        this.visitProgram(ast);
        
        return {
            symbolTable: this.getFormattedSymbolTable(),
            errors: this.errors
        };
    }

    visitProgram(node) {
        // Ámbito global
        this.enterScope('global');
        
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
        });
    }

    visitAreasSection(node) {
        node.areas.forEach(area => {
            this.declareVariable(area.name, 'area', 'global');
        });
    }

    visitProcesosSection(node) {
        node.procesos.forEach(proceso => {
            this.declareProcess(proceso.name, proceso.parameters);
            this.visitProceso(proceso);
        });
    }

    visitProceso(node) {
        this.enterScope(`proceso:${node.name}`);
        
        // Declarar parámetros
        node.parameters.forEach(param => {
            const paramName = typeof param === 'string' ? param : param.name;
            this.declareVariable(paramName, 'numero', `proceso:${node.name}`);
        });

        // Analizar cuerpo
        this.visitBlock(node.body);
        this.exitScope();
    }

    visitRobotsSection(node) {
        node.robots.forEach(robot => {
            this.declareVariable(robot.name, 'robot', 'global');
            this.enterScope(`robot:${robot.name}`);
            this.visitBlock(robot.body);
            this.exitScope();
        });
    }

    visitMainBlock(node) {
        this.enterScope('main');
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
            // Formato antiguo: { declarations: [{name, type}] }
            node.declarations.forEach(decl => {
                this.declareVariable(decl.name, decl.type, this.currentScope);
            });
        } else {
            // Formato nuevo: { name, variableType }
            this.declareVariable(node.name, node.variableType, this.currentScope);
        }
    }

    visitIfStatement(node) {
        this.visitExpression(node.test);
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
        this.visitExpression(node.test);
        this.enterScope('while');
        this.visitBlock(node.body);
        this.exitScope();
    }

    visitRepeatStatement(node) {
        // Verificar que el contador es un número válido
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
        // Verificar que la variable existe
        if (node.left && node.left.name) {
            const variable = this.lookupVariable(node.left.name);
            if (!variable) {
                this.errors.push(`Variable '${node.left.name}' no declarada`);
            } else {
                // Marcar como inicializada
                variable.initialized = true;
            }
        }
        
        if (node.right) {
            this.visitExpression(node.right);
        }
    }

    visitProcessCall(node) {
        // Verificar que el proceso existe
        const process = this.lookupProcess(node.name);
        if (!process) {
            this.errors.push(`Proceso '${node.name}' no declarado`);
            return;
        }

        // Verificar número de parámetros
        const expectedParams = process.parameters ? process.parameters.length : 0;
        const actualParams = node.parameters ? node.parameters.length : 0;
        
        if (actualParams !== expectedParams) {
            this.errors.push(`Número incorrecto de parámetros para '${node.name}'. Esperados: ${expectedParams}, obtenidos: ${actualParams}`);
        }

        // Verificar cada parámetro
        if (node.parameters) {
            node.parameters.forEach((param, index) => {
                this.visitParameter(param, node.name, index);
            });
        }
    }

    visitElementalInstruction(node) {
        // Validar instrucciones elementales del robot
        const validInstructions = [
            'Iniciar', 'derecha', 'mover', 'tomarFlor', 'tomarPapel',
            'depositarFlor', 'depositarPapel', 'PosAv', 'PosCa',
            'HayFlorEnLaBolsa', 'HayPapelEnLaBolsa', 'HayFlorEnLaEsquina', 
            'HayPapelEnLaEsquina', 'Pos', 'Informar', 'AsignarArea'
        ];

        if (!validInstructions.includes(node.instruction)) {
            this.errors.push(`Instrucción elemental no reconocida: '${node.instruction}'`);
        }

        // Validar parámetros según la instrucción
        if (node.parameters) {
            node.parameters.forEach(param => {
                this.visitParameter(param, node.instruction);
            });
        }
    }

    visitAreaDefinition(node) {
        // Validar definición de área
        const validAreaTypes = ['AreaC', 'AreaPC', 'AreaP'];
        
        if (!validAreaTypes.includes(node.areaType)) {
            this.errors.push(`Tipo de área no reconocido: '${node.areaType}'`);
        }

        // Validar dimensiones (deben ser 4 números)
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
                // Para expresiones simples (números, strings)
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
        // Los literales no necesitan validación adicional
        // Pero podemos verificar tipos si es necesario
        if (node.value === undefined) {
            this.errors.push(`Literal sin valor`);
        }
    }

    visitBinaryExpression(node) {
        this.visitExpression(node.left);
        this.visitExpression(node.right);
        
        // Validar operadores
        const validOperators = ['+', '-', '*', '/', '==', '<', '>', '<=', '>=', '&', '|'];
        if (!validOperators.includes(node.operator)) {
            this.errors.push(`Operador no válido: '${node.operator}'`);
        }
    }

    visitUnaryExpression(node) {
        this.visitExpression(node.argument);
        
        const validOperators = ['-', '~'];
        if (!validOperators.includes(node.operator)) {
            this.errors.push(`Operador unario no válido: '${node.operator}'`);
        }
    }

    visitParameter(param, context, index = -1) {
        if (typeof param === 'string') {
            // Si es un string, puede ser variable o literal
            if (isNaN(param)) {
                // Es un identificador/variable
                const variable = this.lookupVariable(param);
                if (!variable) {
                    const contextStr = index >= 0 ? `parámetro ${index + 1} de ${context}` : context;
                    this.errors.push(`Variable '${param}' no declarada (en ${contextStr})`);
                }
            }
            // Si es número, no necesita validación
        } else if (typeof param === 'object') {
            // Si es una expresión compleja
            this.visitExpression(param);
        }
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
                initialized: type !== 'robot' // Los robots se consideran inicializados
            });
            
            // Guardar nombre del scope actual
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
}