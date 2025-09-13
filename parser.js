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
        
        // Parsear secciones principales
        while (!this.isAtEnd()) {
            if (this.match('KEYWORD', 'areas')) {
                body.push(this.parseAreas());
            } else if (this.match('KEYWORD', 'variables')) {
                body.push(this.parseVariablesSection());
            } else if (this.match('KEYWORD', 'procesos')) {
                body.push(this.parseProcesos());
            } else if (this.match('KEYWORD', 'robots')) {
                body.push(this.parseRobots());
            } else if (this.match('KEYWORD', 'comenzar')) {
                body.push(this.parseMainBlock());
            } else {
                this.advance();
            }
        }

        return {
            type: 'Program',
            name: programName,
            body: body
        };
    }

    parseAreas() {
        this.consume('KEYWORD', 'areas');
        const areas = [];
        
        while (!this.isAtEnd() && !this.isNextKeyword()) {
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
        this.consume('OPERATOR', '=');
        const dimensions = this.parseExpression();
        this.consume('OPERATOR', ';');

        return {
            type: 'AreaDefinition',
            name: areaName,
            dimensions: dimensions
        };
    }

    parseVariablesSection() {
        this.consume('KEYWORD', 'variables');
        const declarations = [];
        
        while (!this.isAtEnd() && !this.isNextKeyword()) {
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

    parseProcesos() {
        this.consume('KEYWORD', 'procesos');
        const procesos = [];
        
        while (!this.isAtEnd() && !this.isNextKeyword()) {
            if (this.match('KEYWORD', 'proceso')) {
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
        this.consume('KEYWORD', 'proceso');
        const name = this.consume('IDENTIFIER').value;
        this.consume('OPERATOR', '(');
        
        const params = [];
        if (!this.match('OPERATOR', ')')) {
            params.push(this.consume('IDENTIFIER').value);
            while (this.match('OPERATOR', ',')) {
                this.consume('OPERATOR', ',');
                params.push(this.consume('IDENTIFIER').value);
            }
        }
        
        this.consume('OPERATOR', ')');
        const body = this.parseBlock();

        return {
            type: 'Proceso',
            name: name,
            parameters: params,
            body: body
        };
    }

    parseRobots() {
        this.consume('KEYWORD', 'robots');
        const robots = [];
        
        while (!this.isAtEnd() && !this.isNextKeyword()) {
            if (this.match('KEYWORD', 'robot')) {
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
        this.consume('KEYWORD', 'robot');
        const name = this.consume('IDENTIFIER').value;
        const body = this.parseBlock();

        return {
            type: 'Robot',
            name: name,
            body: body
        };
    }

    parseMainBlock() {
        this.consume('KEYWORD', 'comenzar');
        const body = this.parseBlock();
        this.expect('KEYWORD', 'fin');
        this.expect('KEYWORD', 'programa');

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
            
            this.consume('DEDENT');
            this.indentLevel--;
        } else {
            // Bloque de una sola línea
            statements.push(this.parseStatement());
        }

        return statements;
    }

    parseStatement() {
        if (this.match('KEYWORD', 'si')) {
            return this.parseIfStatement();
        } else if (this.match('KEYWORD', 'mientras')) {
            return this.parseWhileStatement();
        } else if (this.match('KEYWORD', 'repetir')) {
            return this.parseRepeatStatement();
        } else if (this.match('KEYWORD', 'variables')) {
            return this.parseVariableDeclaration();
        } else if (this.match('IDENTIFIER')) {
            // Puede ser asignación o llamada a proceso
            const lookahead = this.tokens[this.position + 1];
            if (lookahead && lookahead.type === 'OPERATOR' && lookahead.value === '(') {
                return this.parseProcessCall();
            } else {
                return this.parseAssignment();
            }
        } else {
            throw new Error(`Declaración no esperada: ${this.currentToken.type}`);
        }
    }

    parseIfStatement() {
        this.consume('KEYWORD', 'si');
        const test = this.parseExpression();
        const consequent = this.parseBlock();
        let alternate = null;

        if (this.match('KEYWORD', 'sino')) {
            this.consume('KEYWORD', 'sino');
            alternate = this.parseBlock();
        }

        return {
            type: 'IfStatement',
            test: test,
            consequent: consequent,
            alternate: alternate
        };
    }

    parseWhileStatement() {
        this.consume('KEYWORD', 'mientras');
        const test = this.parseExpression();
        const body = this.parseBlock();

        return {
            type: 'WhileStatement',
            test: test,
            body: body
        };
    }

    parseRepeatStatement() {
        this.consume('KEYWORD', 'repetir');
        const count = this.parseExpression();
        const body = this.parseBlock();

        return {
            type: 'RepeatStatement',
            count: count,
            body: body
        };
    }

    parseVariableDeclaration() {
        this.consume('KEYWORD', 'variables');
        const declarations = [];
        
        do {
            const name = this.consume('IDENTIFIER').value;
            this.consume('OPERATOR', ':');
            const type = this.consume('KEYWORD').value; // numero, booleano
            declarations.push({ name, type });
            
            if (this.match('OPERATOR', ';')) break;
            this.consume('OPERATOR', ',');
        } while (!this.isAtEnd());

        this.consume('OPERATOR', ';');

        return {
            type: 'VariableDeclaration',
            declarations: declarations
        };
    }

    // Métodos auxiliares
    consume(expectedType = null, expectedValue = null) {
        if (expectedType && this.currentToken.type !== expectedType) {
            throw new Error(`Se esperaba ${expectedType}, se obtuvo ${this.currentToken.type}`);
        }
        
        if (expectedValue && this.currentToken.value !== expectedValue) {
            throw new Error(`Se esperaba ${expectedValue}, se obtuvo ${this.currentToken.value}`);
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