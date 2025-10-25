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
        //Busca si el primer token obtenido por el lexer es "programa" (no puede ser otra instruccion)
        this.consume(TOKEN_TYPES.KEYWORD,keywords.get('KEYWORD6'));
        //Sino hubo errores , procedera en almacenar el nombre del programa
        const programName = this.consume(TOKEN_TYPES.IDENTIFIER).value;
        
        const body = [];
        
        // Parsear secciones en el orden que aparecen
        if (this.match(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD7'))) {
            body.push(this.parseProcesos());
        } 
    
        body.push(this.parseAreas());    
        
        body.push(this.parseRobots());
        
        body.push(this.parseVariablesSection());

        body.push(this.parseMainBlock());

        return {
            type: 'Program',
            name: programName,
            body: body
        };
    }

    parseProcesos() {
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD7') );
        const procesos = [];
        
        while (!this.isAtEnd() && !this.isNextSection()) {
            if (this.match(TOKEN_TYPES.KEYWORD , keywords.get('KEYWORD1'))) {
                procesos.push(this.parseProceso());
            } else {
                this.advance();
            }
        }
        
        return {
            type: 'ProcesosSection',
            procesos: procesos
        };
    }

    parseProceso() {
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD1') );
        const name = this.consume(TOKEN_TYPES.IDENTIFIER).value;
        const varDeclarations = [];

        // Parsear parámetros (ej: "E numAv: numero")
        const parameters = [];
        while (this.match(TOKEN_TYPES.PARAMETER)) {
            const paramToken = this.consume(TOKEN_TYPES.PARAMETER);
            parameters.push(this.parseParameter(paramToken.value));
        }
        
        if (this.match(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD3') )) {
            varDeclarations.push(this.parseVariablesSection());
        }

        this.consume(TOKEN_TYPES.KEYWORD , keywords.get('KEYWORD4') );
        const body = this.parseBlock();
        this.consume(TOKEN_TYPES.KEYWORD , keywords.get('KEYWORD5') );

        return {
            type: 'Proceso',
            name: name,
            parameters: parameters,
            variables: varDeclarations,
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
        this.consume(TOKEN_TYPES.KEYWORD , keywords.get('KEYWORD8'));
        const areas = [];
        
        while (!this.isAtEnd() && !this.isNextSection()) {
            if (this.match(TOKEN_TYPES.IDENTIFIER)) {
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
        const areaName = this.consume(TOKEN_TYPES.IDENTIFIER).value;
        this.consume(TOKEN_TYPES.OPERATOR , ':');
        const areaType = this.consume(TOKEN_TYPES.ELEMENTAL_INSTRUCTION).value; // AreaC, AreaP, etc.
        const dimensions = this.parseParameterList();
        
        return {
            type: 'AreaDefinition',
            name: areaName,
            areaType: areaType,
            dimensions: dimensions
        };
    }

    parseRobots() {
        this.consume(TOKEN_TYPES.KEYWORD , keywords.get('KEYWORD9') );
        const robots = [];
        
        while (!this.isAtEnd() && !this.isNextSection()) {
            if (this.match(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD2') )) {
                robots.push(this.parseRobot());
            } else {
                this.advance();
            }
        }
        
        return {
            type: 'RobotsSection',
            robots: robots
        };
    }

    parseRobot() {
        this.consume(TOKEN_TYPES.KEYWORD , keywords.get('KEYWORD2') );
        const name = this.consume(TOKEN_TYPES.IDENTIFIER).value;
        const varDeclarations = [];

        if (this.match(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD3') )) {
            varDeclarations.push(this.parseVariableDeclaration());
        }

        this.consume(TOKEN_TYPES.KEYWORD , keywords.get('KEYWORD4'));
        const body = this.parseBlock();
        this.consume(TOKEN_TYPES.KEYWORD , keywords.get('KEYWORD5'));

        return {
            type: 'Robot',
            name: name,
            variables: varDeclarations,
            body: body
        };
    }

    /*
    CONTINUAR
    */

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
        
        const type = this.match('IDENTIFIER') ? this.consume('IDENTIFIER').value : this.consume('KEYWORD').value;
        
        return {
            type: 'VariableDeclaration',
            name: name,
            variableType: type
        };
    }

    parseMainBlock() {
        const body = [];
        this.consume('KEYWORD', 'comenzar');
        //const body = this.parseBlock();
        while (!this.isAtEnd() && !this.match('KEYWORD','fin')) {
            body.push(this.parseStatement());
        }
        this.consume('KEYWORD', 'fin');

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
        if (this.match('CONTROL_SENTENCE', 'si')) {
            return this.parseIfStatement();
        } else if (this.match('CONTROL_SENTENCE', 'mientras')) {
            return this.parseWhileStatement();
        } else if (this.match('CONTROL_SENTENCE', 'repetir')) {
            return this.parseRepeatStatement();
        } else if (this.match('ELEMENTAL_INSTRUCTION')) {
            return this.parseElementalInstruction();
        } else if (this.match('IDENTIFIER')) {
            return this.parseProcessCall();
        } else {
            throw new Error(`Declaración no esperada: ${this.currentToken.type} "${this.currentToken.value} ${this.currentToken.line} "`);
        }
    }

    parseIfStatement() {
        this.consume('CONTROL_SENTENCE', 'si');
        
        // Parsear condición (puede ser una expresión simple o compleja)
        const condition = this.parseCondition();
        
        // Parsear bloque THEN
        const consequent = this.parseBlock();
        
        let alternate = null;
        
        // Verificar si hay un bloque SINO
        if (this.match('CONTROL_SENTENCE', 'sino')) {
            this.consume('CONTROL_SENTENCE', 'sino');
            alternate = this.parseBlock();
        }

        return {
            type: 'IfStatement',
            condition: condition,
            consequent: consequent,
            alternate: alternate
        };
    }

    parseWhileStatement() {
        this.consume('CONTROL_SENTENCE', 'mientras');
        
        // Parsear condición
        const condition = this.parseCondition();
        
        // Parsear cuerpo del bucle
        const body = this.parseBlock();

        return {
            type: 'WhileStatement',
            condition: condition,
            body: body
        };
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

    parseCondition() {
        // Para condiciones simples, podemos leer hasta el final de línea o parámetro
        // En una implementación más avanzada, esto sería un parser de expresiones
        
        let condition = '';
        
        // Leer la condición hasta encontrar un token que indique el fin
        while (!this.isAtEnd() && 
               !this.match('INDENT') && 
               !this.match('CONTROL_SENTENCE') && 
               !this.match('ELEMENTAL_INSTRUCTION') && 
               !this.match('IDENTIFIER')) {
            
            condition += this.currentToken.value + ' ';
            this.advance();
        }
        
        // Limpiar espacios extra
        condition = condition.trim();
        
        // Si no hay condición, lanzar error
        if (!condition) {
            throw new Error(`Condición esperada después de 'si' o 'mientras'`);
        }
        
        return {
            type: 'Condition',
            expression: condition
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