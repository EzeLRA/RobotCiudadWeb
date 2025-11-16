class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
        this.currentToken = this.tokens[0];
        this.indentLevel = 0;
        this.procesosNames = new Set();
        
        // Cache de palabras elementales para búsquedas 
        this.elementalValues = new Set([
            'PosAv', 'PosCa', 'HayFlorEnLaBolsa', 'HayPapelEnLaBolsa',
            'HayFlorEnLaEsquina', 'HayPapelEnLaEsquina', 'Random'
        ]);

        // Cache de operadores
        this.comparators = new Set(['==', '!=', '<', '>', '<=', '>=']);
        this.additiveOps = new Set(['+', '-']);
        this.multiplicativeOps = new Set(['*', '/']);
        this.logicalOps = new Set(['&', '|']);

        // Cache de keywords de secciones
        this.sectionKeywords = new Set([
            keywords.get('KEYWORD7'), keywords.get('KEYWORD8'), 
            keywords.get('KEYWORD9'), keywords.get('KEYWORD3'), 
            keywords.get('KEYWORD4')
        ]);
    }

    parse() {
        return this.parseProgram();
    }

    parseProgram() {
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD6'));
        const programName = this.consume(TOKEN_TYPES.IDENTIFIER).value;
        
        const body = [];
        
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
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD7'));
        const procesos = [];
        
        while (!this.isAtEnd() && !this.isNextSection()) {
            if (this.match(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD1'))) {
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
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD1'));
        const name = this.consume(TOKEN_TYPES.IDENTIFIER).value;
        this.procesosNames.add(name); // Usar add() en lugar de push()
        
        const parameters = this.parseParameters();
        const varDeclarations = this.parseOptionalVariables();
        
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD4'));
        const body = this.parseBlock();
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD5'));

        return {
            type: 'Proceso',
            name: name,
            parameters: parameters,
            variables: varDeclarations,
            body: body
        };
    }

    parseParameters() {
        const parameters = [];
        while (this.match(TOKEN_TYPES.PARAMETER)) {
            const paramToken = this.consume(TOKEN_TYPES.PARAMETER);
            parameters.push(this.parseParameter(paramToken.value));
        }
        return parameters;
    }

    parseOptionalVariables() {
        return this.match(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD3')) 
            ? [this.parseVariablesSection()] 
            : [];
    }

    parseAreas() {
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD8'));
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
        this.consume(TOKEN_TYPES.OPERATOR, ':');
        const areaType = this.consume(TOKEN_TYPES.ELEMENTAL_INSTRUCTION).value;
        const dimensions = this.parseParameterList();
        
        return {
            type: 'AreaDefinition',
            name: areaName,
            areaType: areaType,
            dimensions: dimensions
        };
    }

    parseRobots() {
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD9'));
        const robots = [];
        
        while (!this.isAtEnd() && !this.isNextSection()) {
            if (this.match(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD2'))) {
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
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD2'));
        const name = this.consume(TOKEN_TYPES.IDENTIFIER).value;
        const varDeclarations = [];


        if (this.match(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD3'))) {
            varDeclarations.push(this.parseVariablesSection());
        }

        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD4'));
        const body = this.parseBlock();
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD5'));

        return {
            type: 'Robot',
            name: name,
            variables: varDeclarations,
            body: body
        };
    }

    parseVariablesSection() {
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD3'));
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
        this.consume(TOKEN_TYPES.OPERATOR, ':');
        
        const type = typesDefined.get(this.currentToken.value) || this.currentToken.value;
        this.advance();

        return {
            type: 'VariableDeclaration',
            name: name,
            variableType: type
        };
    }

    parseMainBlock() {
        const body = [];
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD4'));
        while (!this.isAtEnd() && !this.match(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD5'))) {
            body.push(this.parseStatement());
        }
        this.consume(TOKEN_TYPES.KEYWORD, keywords.get('KEYWORD5'));

        return {
            type: 'MainBlock',
            body: body
        };
    }

    parseBlock() {
        const statements = [];
        
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
            statements.push(this.parseStatement());
        }

        return statements;
    }

    parseStatement() {
        const token = this.currentToken;
        
        if (token.type === TOKEN_TYPES.CONTROL_SENTENCE) {
            switch (token.value) {
                case keywords.get('CONTROL_SENTENCE1'):
                    return this.parseIfStatement();
                case keywords.get('CONTROL_SENTENCE3'):
                    return this.parseWhileStatement();
                case keywords.get('CONTROL_SENTENCE4'):
                    return this.parseRepeatStatement();
            }
        }
        
        if (token.type === TOKEN_TYPES.ELEMENTAL_INSTRUCTION) {
            return this.parseElementalInstruction();
        }
        
        if (token.type === TOKEN_TYPES.IDENTIFIER) {
            return this.procesosNames.has(token.value) 
                ? this.parseProcessCall() 
                : this.parseAssignmentOrDeclaration();
        }
        
        throw new Error(`Declaración no esperada: ${token.type} "${token.value}" en línea ${token.line}`);
    }

    parseAssignmentOrDeclaration() {
        const name = this.consume(TOKEN_TYPES.IDENTIFIER).value;
        
        if (this.match(TOKEN_TYPES.OPERATOR)) {
            const operator = this.consume(TOKEN_TYPES.OPERATOR).value;
            
            if (operator === ":=") {
                const value = this.parseExpression();
                return {
                    type: 'Assignment',
                    left: { type: 'Identifier', name: name },
                    right: value,
                    operator: ':='
                };
            } else if (operator === ":") {
                let typeValue;
                
                if (this.match(TOKEN_TYPES.KEYWORD)) {
                    typeValue = this.consume(TOKEN_TYPES.KEYWORD).value;
                } else if (this.match(TOKEN_TYPES.IDENTIFIER)) {
                    typeValue = this.consume(TOKEN_TYPES.IDENTIFIER).value;
                } else {
                    throw new Error(`Tipo esperado después de ':'`);
                }
                
                return {
                    type: 'VariableDeclaration',
                    name: name,
                    variableType: typeValue
                };
            }
        }
        
        throw new Error(`Operador ':' o ':=' esperado después de identificador '${name}'`);
    }

    parseExpression() {
        return this.parseLogicalExpression();
    }

    parseLogicalExpression() {
    let left = this.parseComparativeExpression();
    
        while (this.match(TOKEN_TYPES.OPERATOR) && 
            this.logicalOps.has(this.currentToken.value)) {
            const operator = this.consume(TOKEN_TYPES.OPERATOR).value;
            const right = this.parseComparativeExpression();
            
            left = this.createBinaryExpression(operator, left, right);
        }
        
        return left;
    }

    parseComparativeExpression() {
        let left = this.parseAdditiveExpression();
        
        while (this.match(TOKEN_TYPES.OPERATOR) && 
            this.comparators.has(this.currentToken.value)) {
            const operator = this.consume(TOKEN_TYPES.OPERATOR).value;
            const right = this.parseAdditiveExpression();
            
            left = this.createBinaryExpression(operator, left, right);
        }
        
        return left;
    }

    createBinaryExpression(operator, left, right) {
        return {
            type: 'BinaryExpression',
            operator: operator,
            left: left,
            right: right
        };
    }

    parseAdditiveExpression() {
        let left = this.parseMultiplicativeExpression();
        
        while (this.match(TOKEN_TYPES.OPERATOR, '+') || 
               this.match(TOKEN_TYPES.OPERATOR, '-')) {
            const operator = this.consume(TOKEN_TYPES.OPERATOR).value;
            const right = this.parseMultiplicativeExpression();
            
            left = {
                type: 'BinaryExpression',
                operator: operator,
                left: left,
                right: right
            };
        }
        
        return left;
    }

    parseMultiplicativeExpression() {
        let left = this.parsePrimaryExpression();
        
        while (this.match(TOKEN_TYPES.OPERATOR, '*') || 
               this.match(TOKEN_TYPES.OPERATOR, '/')) {
            const operator = this.consume(TOKEN_TYPES.OPERATOR).value;
            const right = this.parsePrimaryExpression();
            
            left = {
                type: 'BinaryExpression',
                operator: operator,
                left: left,
                right: right
            };
        }
        
        return left;
    }

    parsePrimaryExpression() {
        const token = this.currentToken;
        
        switch (token.type) {
            case TOKEN_TYPES.NUM:
                return this.parseNumericLiteral();
                
            case TOKEN_TYPES.IDENTIFIER:
                return this.parseIdentifierExpression();
                
            case TOKEN_TYPES.KEYWORD:
                return this.parseKeywordExpression();
                
            case TOKEN_TYPES.OPERATOR:
                return this.parseOperatorExpression();
        }
        
        throw new Error(`Expresión primaria no válida: ${token.type} "${token.value}"`);
    }

    parseNumericLiteral() {
        const token = this.consume(TOKEN_TYPES.NUM);
        return {
            type: 'Literal',
            value: parseInt(token.value),
            raw: token.value
        };
    }

    parseIdentifierExpression() {
        const token = this.consume(TOKEN_TYPES.IDENTIFIER);
        
        if (this.isElementalValue(token.value)) {
            return {
                type: 'ElementalValue',
                name: token.value
            };
        }
        
        return {
            type: 'Identifier',
            name: token.value
        };
    }

    parseKeywordExpression() {
        // Valores booleanos: V (true), F (false)
        if (this.currentToken.value === 'V' || this.currentToken.value === 'F') {
            const token = this.consume(TOKEN_TYPES.KEYWORD);
            return {
                type: 'Literal',
                value: token.value === 'V',
                raw: token.value
            };
        }
        throw new Error(`Keyword no válida en expresión: ${this.currentToken.value}`);
    }

    parseOperatorExpression() {
        if (this.match(TOKEN_TYPES.OPERATOR, '(')) {
            this.consume(TOKEN_TYPES.OPERATOR, '(');
            const expression = this.parseExpression();
            this.consume(TOKEN_TYPES.OPERATOR, ')');
            return expression;
        }
        
        if (this.match(TOKEN_TYPES.OPERATOR, '-') || this.match(TOKEN_TYPES.OPERATOR, '!')) {
            const operator = this.consume(TOKEN_TYPES.OPERATOR).value;
            return {
                type: 'UnaryExpression',
                operator: operator,
                argument: this.parsePrimaryExpression()
            };
        }
        
        throw new Error(`Operador no válido en expresión: ${this.currentToken.value}`);
    }

    parseIfStatement() {
        this.consume(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE1'));
        const condition = this.parseCondition();
        const consequent = this.parseBlock();
        
        let alternate = null;
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

    parseWhileStatement() {
        this.consume(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE3'));
        const condition = this.parseCondition();
        const body = this.parseBlock();

        return {
            type: 'WhileStatement',
            condition: condition,
            body: body
        };
    }

    parseRepeatStatement() {
        this.consume(TOKEN_TYPES.CONTROL_SENTENCE, keywords.get('CONTROL_SENTENCE4'));
        const count = this.parseExpression();
        const body = this.parseBlock();

        return {
            type: 'RepeatStatement',
            count: count,
            body: body
        };
    }

    parseCondition() {
        const conditionTokens = [];
        
        while (!this.isAtEnd() && 
            !this.match(TOKEN_TYPES.INDENT) && 
            !this.match(TOKEN_TYPES.CONTROL_SENTENCE) && 
            !this.match(TOKEN_TYPES.IDENTIFIER)) {
            
            conditionTokens.push(this.currentToken.value);
            this.advance();
        }
        
        const condition = conditionTokens.join(' ').trim();
        
        if (!condition) {
            throw new Error(`Condición esperada después de Si o Sino`);
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
            parameters.push(...paramToken.value.split(',').map(p => p.trim()));
        }
        return parameters;
    }

    // Métodos auxiliares
    expect(type, value = null) {
        if (this.isAtEnd()) {
            throw new Error(`Se esperaba ${type} pero se alcanzó el final en línea ${this.currentToken.line}`);
        }
        
        const token = this.currentToken;
        if (token.type !== type) {
            throw new Error(`Se esperaba ${type}, se obtuvo ${token.type} ("${token.value}") en línea ${token.line}`);
        }
        
        if (value !== null && token.value !== value) {
            throw new Error(`Se esperaba "${value}", se obtuvo "${token.value}" en línea ${token.line}`);
        }
        
        return token;
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
        const nextTokens = [keywords.get('KEYWORD7'), keywords.get('KEYWORD8'), keywords.get('KEYWORD9'), keywords.get('KEYWORD3'), keywords.get('KEYWORD4')];
        return nextTokens.includes(this.currentToken.value);
    }

    isSectionStart() {
        return this.match(TOKEN_TYPES.KEYWORD) && this.sectionKeywords.has(this.currentToken.value);
    }

    isControlStatement() {
        if (!this.match(TOKEN_TYPES.CONTROL_SENTENCE)) return false;
        const controlKeywords = new Set([
            keywords.get('CONTROL_SENTENCE1'),
            keywords.get('CONTROL_SENTENCE3'), 
            keywords.get('CONTROL_SENTENCE4')
        ]);
        return controlKeywords.has(this.currentToken.value);
    }

    isElementalValue(tokenValue) {
        return this.elementalValues.has(tokenValue);
    }

    advance() {
        if (this.position < this.tokens.length - 1) {
            this.position++;
            this.currentToken = this.tokens[this.position];
        } else {
            this.position = this.tokens.length;
            this.currentToken = { type: TOKEN_TYPES.EOF, value: '' };
        }
    }

    peek(offset = 1) {
        const index = this.position + offset;
        return index < this.tokens.length ? this.tokens[index] : null;
    }

    isAtEnd() {
        return this.position >= this.tokens.length || this.currentToken.type === TOKEN_TYPES.EOF;
    }
}