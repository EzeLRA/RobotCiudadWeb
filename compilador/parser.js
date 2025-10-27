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

    parseVariablesSection() {
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD3') );
        const declarations = [];
        
        while (!this.isAtEnd() && !this.isNextSection()) {
            if (this.match(TOKEN_TYPES.IDENTIFIER)) {
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
        const name = this.consume(TOKEN_TYPES.IDENTIFIER).value;
        this.consume(TOKEN_TYPES.OPERATOR,':');
        
        const type = this.match(TOKEN_TYPES.IDENTIFIER) ? this.consume(TOKEN_TYPES.IDENTIFIER).value : this.consume('KEYWORD').value;
        
        return {
            type: 'VariableDeclaration',
            name: name,
            variableType: type
        };
    }

    parseMainBlock() {
        const body = [];
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD4'));
        //const body = this.parseBlock();
        while (!this.isAtEnd() && !this.match(TOKEN_TYPES.KEYWORD , keywords.get('KEYWORD5') )) {
            body.push(this.parseStatement());
        }
        this.consume(TOKEN_TYPES.KEYWORD , keywords.get('KEYWORD5') );

        return {
            type: 'MainBlock',
            body: body
        };
    }

    parseBlock() {
        const statements = [];
        
        // Esperar INDENT para bloques
        if (this.match(TOKEN_TYPES.INDENT)) {
            this.consume(TOKEN_TYPES.INDENT);
            this.indentLevel++;
            
            while (!this.isAtEnd() && !this.match(TOKEN_TYPES.DEDENT)) {
                statements.push(this.parseStatement());
            }
            
            if (this.match(TOKEN_TYPES.DEDENT)) {
                this.consume(TOKEN_TYPES.DEDENT);
            }
            this.indentLevel--;
        } else {
            // Bloque de una sola línea
            statements.push(this.parseStatement());
        }

        return statements;
    }

    parseStatement() {
        if (this.match(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE1'))) {
            return this.parseIfStatement();
        } else if (this.match(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE3'))) {
            return this.parseWhileStatement();
        } else if (this.match(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE4'))) {
            return this.parseRepeatStatement();
        } else if (this.match(TOKEN_TYPES.ELEMENTAL_INSTRUCTION)) {
            return this.parseElementalInstruction();
        // Revisar esta parte
        } else if (this.match(TOKEN_TYPES.IDENTIFIER)) {
            return this.parseProcessCall();
        } else if (this.match(TOKEN_TYPES.OPERATOR)) {
            return this.parseOperator();
        } else{
            throw new Error(`Declaración no esperada: ${this.currentToken.type} "${this.currentToken.value} ${this.currentToken.line} "`);
        }
    }

    /*
         Revisar a futuro
    */
    parseOperator(){
        const operator = this.consume(TOKEN_TYPES.OPERATOR).value;
        if (operator == ":="){
            const operator2 = this.consume(TOKEN_TYPES.NUM).value ;
            return {
                type: 'Assignment',
                operator: operator,
                value: operator2
            };
        }
        return {
            type: 'Operator',
            operator: operator
        };
    }

    parseIfStatement() {
        this.consume(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE1'));
        
        // Parsear condición (puede ser una expresión simple o compleja)
        const condition = this.parseCondition();
        
        // Parsear bloque THEN
        const consequent = this.parseBlock();
        
        let alternate = null;
        
        // Verificar si hay un bloque SINO
        if (this.match(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE2'))) {
            this.consume(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE2'));
            alternate = this.parseBlock();
        }

        return {
            type: 'IfStatement',
            condition: condition,
            consequent: consequent,
            alternate: alternate
        };
    }

    /*
       Revisar a futuro
    */

    parseWhileStatement() {
        this.consume(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE3'));
        
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

    /*
       Revisar a futuro
    */
    parseRepeatStatement() {
        this.consume(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE4'));
        const count = this.consume(TOKEN_TYPES.NUM).value;
        const body = this.parseBlock();

        return {
            type: 'RepeatStatement',
            count: count,
            body: body
        };
    }

    /*
         Revisar a futuro
    */

    parseCondition() {
        // Para condiciones simples, podemos leer hasta el final de línea o parámetro
        // En una implementación más avanzada, esto sería un parser de expresiones
        
        let condition = '';
        
        // Leer la condición hasta encontrar un token que indique el fin
        while (!this.isAtEnd() && 
               !this.match(TOKEN_TYPES.INDENT) && 
               !this.match(TOKEN_TYPES.CONTROL_SENTENCE) && 
               !this.match(TOKEN_TYPES.ELEMENTAL_INSTRUCTION) && 
               !this.match(TOKEN_TYPES.IDENTIFIER)) {
            
            condition += this.currentToken.value + ' ';
            this.advance();
        }
        
        // Limpiar espacios extra
        condition = condition.trim();
        
        // Si no hay condición, lanzar error
        if (!condition) {
            throw new Error(`Condición esperada después de Si o Sino `);
        }
        
        return {
            type: 'Condition',
            expression: condition
        };
    }

    parseElementalInstruction() {
        const instruction = this.consume(TOKEN_TYPES.ELEMENTAL_INSTRUCTION).value;
        let parameters = [];
        
        if (this.match(TOKEN_TYPES.PARAMETER)) {
            parameters = this.parseParameterList();
        }

        return {
            type: 'ElementalInstruction',
            instruction: instruction,
            parameters: parameters
        };
    }

    parseProcessCall() {
        const processName = this.consume(TOKEN_TYPES.IDENTIFIER).value;
        let parameters = [];
        
        if (this.match(TOKEN_TYPES.PARAMETER)) {
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
        if (this.match(TOKEN_TYPES.PARAMETER)) {
            const paramToken = this.consume(TOKEN_TYPES.PARAMETER);
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
        const nextTokens = [keywords.get('KEYWORD7'), keywords.get('KEYWORD8'), keywords.get('KEYWORD9'), keywords.get('KEYWORD3') , keywords.get('KEYWORD4') ];
        return nextTokens.includes(this.currentToken.value);
    }

    advance() {
        this.position++;
        if (!this.isAtEnd()) {
            this.currentToken = this.tokens[this.position];
        }
    }

    isAtEnd() {
        return this.position >= this.tokens.length || this.currentToken.type === TOKEN_TYPES.EOF;
    }
}