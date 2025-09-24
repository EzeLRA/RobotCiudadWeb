class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
        this.currentToken = this.tokens[0];
        this.indentLevel = 0;
    }

    parse() {
        return this.parseProgram();
    }

    parseProgram() {
        this.expect('KEYWORD', 'programa');
        const programName = this.consume('IDENTIFIER').value;
        
        const body = [];
        
        // Parsear secciones en el orden que aparecen
        while (!this.isAtEnd() && !this.match('KEYWORD', 'comenzar')) {
            if (this.match('KEYWORD', 'procesos')) {
                body.push(this.parseProcesos());
            } else if (this.match('KEYWORD', 'areas')) {
                body.push(this.parseAreas());
            } else if (this.match('KEYWORD', 'robots')) {
                body.push(this.parseRobots());
            } else if (this.match('KEYWORD', 'variables')) {
                body.push(this.parseVariablesSection());
            } else {
                this.advance();
            }
        }

        // Parsear bloque principal
        if (this.match('KEYWORD', 'comenzar')) {
            body.push(this.parseMainBlock());
        }

        return {
            type: 'Program',
            name: programName,
            body: body
        };
    }

    parseProcesos() {
        this.consume('KEYWORD', 'procesos');
        const procesos = [];
        
        // Esperar INDENT después de 'procesos'
        this.expect('INDENT');
        
        while (!this.isAtEnd() && !this.match('DEDENT')) {
            if (this.match('KEYWORD', 'proceso')) {
                procesos.push(this.parseProceso());
            } else {
                this.advance();
            }
        }
        
        this.consume('DEDENT'); // Fin de sección procesos

        return {
            type: 'ProcesosSection',
            procesos: procesos
        };
    }

    parseProceso() {
        this.consume('KEYWORD', 'proceso');
        const name = this.consume('IDENTIFIER').value;
        
        // Parsear parámetros (ej: "E numAv: numero")
        const parameters = [];
        while (this.match('PARAMETER')) {
            const paramToken = this.consume('PARAMETER');
            parameters.push(this.parseParameter(paramToken.value));
        }
        
        this.expect('KEYWORD', 'comenzar');
        const body = this.parseBlock();
        this.expect('KEYWORD', 'fin');

        return {
            type: 'Proceso',
            name: name,
            parameters: parameters,
            body: body
        };
    }

    parseParameter(paramString) {
        // Ejemplo: "E numAv: numero" → {direction: 'E', name: 'numAv', type: 'numero'}
        const parts = paramString.split(' ');
        return {
            direction: parts[0], // E = entrada, S = salida, etc.
            name: parts[1].split(':')[0],
            type: parts[1].split(':')[1] || 'numero'
        };
    }

    parseAreas() {
        this.consume('KEYWORD', 'areas');
        const areas = [];
        
        while (!this.isAtEnd() && !this.isNextSection()) {
            if (this.match('IDENTIFIER')) {
                areas.push(this.parseAreaDefinition());
            } else {
                this.advance();
            }
        }

        return {
            type: 'AreasSection',
            areas: areas
        };
    }

    parseAreaDefinition() {
        const areaName = this.consume('IDENTIFIER').value;
        this.consume('OPERATOR', ':');
        const areaType = this.consume('ELEMENTAL_INSTRUCTION').value; // AreaC, AreaP, etc.
        const dimensions = this.parseParameterList();
        
        return {
            type: 'AreaDefinition',
            name: areaName,
            areaType: areaType,
            dimensions: dimensions
        };
    }

    parseRobots() {
        this.consume('KEYWORD', 'robots');
        const robots = [];
        
        // Esperar INDENT después de 'robots'
        this.expect('INDENT');
        
        while (!this.isAtEnd() && !this.match('DEDENT')) {
            if (this.match('KEYWORD', 'robot')) {
                robots.push(this.parseRobot());
            } else {
                this.advance();
            }
        }
        
        this.consume('DEDENT');

        return {
            type: 'RobotsSection',
            robots: robots
        };
    }

    parseRobot() {
        this.consume('KEYWORD', 'robot');
        const name = this.consume('IDENTIFIER').value;
        this.expect('KEYWORD', 'comenzar');
        const body = this.parseBlock();
        this.expect('KEYWORD', 'fin');

        return {
            type: 'Robot',
            name: name,
            body: body
        };
    }

    parseVariablesSection() {
        this.consume('KEYWORD', 'variables');
        const declarations = [];
        
        while (!this.isAtEnd() && !this.isNextSection()) {
            if (this.match('IDENTIFIER')) {
                declarations.push(this.parseVariableDeclaration());
            } else {
                this.advance();
            }
        }

        return {
            type: 'VariablesSection',
            declarations: declarations
        };
    }

    parseVariableDeclaration() {
        const name = this.consume('IDENTIFIER').value;
        this.consume('OPERATOR', ':');
        const type = this.consume('IDENTIFIER').value; // robot1, numero, etc.
        
        return {
            type: 'VariableDeclaration',
            name: name,
            variableType: type
        };
    }

    parseMainBlock() {
        this.consume('KEYWORD', 'comenzar');
        const body = this.parseBlock();
        this.expect('KEYWORD', 'fin');

        return {
            type: 'MainBlock',
            body: body
        };
    }

    parseBlock() {
        const statements = [];
        
        // Esperar INDENT para bloques
        if (this.match('INDENT')) {
            this.consume('INDENT');
            this.indentLevel++;
            
            while (!this.isAtEnd() && !this.match('DEDENT')) {
                statements.push(this.parseStatement());
            }
            
            if (this.match('DEDENT')) {
                this.consume('DEDENT');
            }
            this.indentLevel--;
        } else {
            // Bloque de una sola línea
            statements.push(this.parseStatement());
        }

        return statements;
    }

    parseStatement() {
        if (this.match('CONTROL_SENTENCE', 'repetir')) {
            return this.parseRepeatStatement();
        } else if (this.match('ELEMENTAL_INSTRUCTION')) {
            return this.parseElementalInstruction();
        } else if (this.match('IDENTIFIER')) {
            return this.parseProcessCall();
        } else {
            throw new Error(`Declaración no esperada: ${this.currentToken.type} "${this.currentToken.value}"`);
        }
    }

    parseRepeatStatement() {
        this.consume('CONTROL_SENTENCE', 'repetir');
        const count = this.consume('NUMBER').value;
        const body = this.parseBlock();

        return {
            type: 'RepeatStatement',
            count: count,
            body: body
        };
    }

    parseElementalInstruction() {
        const instruction = this.consume('ELEMENTAL_INSTRUCTION').value;
        let parameters = [];
        
        if (this.match('PARAMETER')) {
            parameters = this.parseParameterList();
        }

        return {
            type: 'ElementalInstruction',
            instruction: instruction,
            parameters: parameters
        };
    }

    parseProcessCall() {
        const processName = this.consume('IDENTIFIER').value;
        let parameters = [];
        
        if (this.match('PARAMETER')) {
            parameters = this.parseParameterList();
        }

        return {
            type: 'ProcessCall',
            name: processName,
            parameters: parameters
        };
    }

    parseParameterList() {
        const parameters = [];
        if (this.match('PARAMETER')) {
            const paramToken = this.consume('PARAMETER');
            // Dividir parámetros por comas: "1,1,100,100" → ['1', '1', '100', '100']
            parameters.push(...paramToken.value.split(',').map(p => p.trim()));
        }
        return parameters;
    }

    // Métodos auxiliares mejorados
    expect(type, value = null) {
        if (this.isAtEnd()) {
            throw new Error(`Se esperaba ${type} pero se alcanzó el final`);
        }
        
        if (this.currentToken.type !== type) {
            throw new Error(`Se esperaba ${type}, se obtuvo ${this.currentToken.type} en línea ${this.currentToken.line}`);
        }
        
        if (value !== null && this.currentToken.value !== value) {
            throw new Error(`Se esperaba "${value}", se obtuvo "${this.currentToken.value}" en línea ${this.currentToken.line}`);
        }
    }

    consume(expectedType = null, expectedValue = null) {
        if (expectedType) {
            this.expect(expectedType, expectedValue);
        }

        const token = this.currentToken;
        this.advance();
        return token;
    }

    match(type, value = null) {
        if (this.isAtEnd()) return false;
        if (this.currentToken.type !== type) return false;
        if (value !== null && this.currentToken.value !== value) return false;
        return true;
    }

    isNextSection() {
        const nextTokens = ['procesos', 'areas', 'robots', 'variables', 'comenzar'];
        return nextTokens.includes(this.currentToken.value);
    }

    advance() {
        this.position++;
        if (!this.isAtEnd()) {
            this.currentToken = this.tokens[this.position];
        }
    }

    isAtEnd() {
        return this.position >= this.tokens.length || this.currentToken.type === 'EOF';
    }
}