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
            }
        });
        
        this.exitScope();
    }

    visitVariablesSection(node) {
        node.declarations.forEach(decl => {
            this.declareVariable(decl.name, decl.type, 'global');
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
            this.declareVariable(param, 'numero', `proceso:${node.name}`);
        });

        // Analizar cuerpo
        node.body.forEach(stmt => {
            this.visitStatement(stmt);
        });
        
        this.exitScope();
    }

    visitRobotsSection(node) {
        node.robots.forEach(robot => {
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
        }
    }

    visitVariableDeclaration(node) {
        node.declarations.forEach(decl => {
            this.declareVariable(decl.name, decl.type, this.currentScope);
        });
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

    visitAssignment(node) {
        // Verificar que la variable existe
        if (!this.lookupVariable(node.left.name)) {
            this.errors.push(`Variable '${node.left.name}' no declarada`);
        }
        
        this.visitExpression(node.right);
    }

    visitProcessCall(node) {
        // Verificar que el proceso existe
        const process = this.lookupProcess(node.name);
        if (!process) {
            this.errors.push(`Proceso '${node.name}' no declarado`);
            return;
        }

        // Verificar número de parámetros
        if (node.arguments.length !== process.parameters.length) {
            this.errors.push(`Número incorrecto de parámetros para '${node.name}'`);
        }

        // Verificar cada argumento
        node.arguments.forEach(arg => {
            this.visitExpression(arg);
        });
    }

    // Métodos de utilidad para manejo de ámbitos
    enterScope(scopeName) {
        this.scopeStack.push(new Map());
        this.currentScope = scopeName;
    }

    exitScope() {
        this.scopeStack.pop();
        this.currentScope = this.scopeStack.length > 0 ? 
            Array.from(this.scopeStack[this.scopeStack.length - 1].keys())[0] : 'global';
    }

    declareVariable(name, type, scope) {
        const currentScope = this.scopeStack[this.scopeStack.length - 1];
        
        if (currentScope.has(name)) {
            this.errors.push(`Variable '${name}' ya declarada en este ámbito`);
        } else {
            currentScope.set(name, { type, scope, initialized: false });
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
        // Los procesos van en el ámbito global
        const globalScope = this.scopeStack[0];
        globalScope.set(`process:${name}`, { parameters });
    }

    lookupProcess(name) {
        return this.scopeStack[0].get(`process:${name}`);
    }

    getFormattedSymbolTable() {
        const result = [];
        this.scopeStack.forEach((scope, index) => {
            scope.forEach((value, key) => {
                if (!key.startsWith('process:')) {
                    result.push({
                        name: key,
                        type: value.type,
                        scope: value.scope,
                        initialized: value.initialized
                    });
                }
            });
        });
        return result;
    }
}