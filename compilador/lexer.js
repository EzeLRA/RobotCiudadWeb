class CompilerError extends Error {
    constructor(message, line, column) {
        super(`${message} (línea ${line}, columna ${column})`);
        this.name = "CompilerError";
        this.line = line;
        this.column = column;
    }
}

const TOKEN_TYPES = {
    KEYWORD: 'KEYWORD',
    CONTROL_SENTENCE: 'CONTROL_SENTENCE', 
    ELEMENTAL_INSTRUCTION: 'ELEMENTAL_INSTRUCTION',
    IDENTIFIER: 'IDENTIFIER'
};

class Lexer {
    constructor(source) {
        this.source = source;
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
        this.indentStack = [0]; 
        this.atLineStart = true; 
        this.currentIndent = 0;  

        //Tipos de datos
        this.typesDefined = new Map([
            ['numero', TOKEN_TYPES.IDENTIFIER],
            ['booleano', TOKEN_TYPES.IDENTIFIER],
            ['V', TOKEN_TYPES.IDENTIFIER],
            ['F', TOKEN_TYPES.IDENTIFIER]
        ])

        //Conjunto de palabras claves
        this.keywordMap = new Map([
            // Palabras clave básicas
            ['proceso', TOKEN_TYPES.KEYWORD],
            ['robot', TOKEN_TYPES.KEYWORD],
            ['variables', TOKEN_TYPES.KEYWORD],
            ['comenzar', TOKEN_TYPES.KEYWORD],
            ['fin', TOKEN_TYPES.KEYWORD],
            ['programa', TOKEN_TYPES.KEYWORD],
            ['procesos', TOKEN_TYPES.KEYWORD],
            ['areas', TOKEN_TYPES.KEYWORD],
            ['robots', TOKEN_TYPES.KEYWORD],
            
            // Estructuras de control
            ['si', TOKEN_TYPES.CONTROL_SENTENCE],
            ['sino', TOKEN_TYPES.CONTROL_SENTENCE],
            ['mientras', TOKEN_TYPES.CONTROL_SENTENCE],
            ['repetir', TOKEN_TYPES.CONTROL_SENTENCE],
            
            // Instrucciones elementales
            ['Iniciar', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['derecha', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['mover', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['tomarFlor', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['tomarPapel', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['depositarFlor', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['depositarPapel', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['PosAv', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['PosCa', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['HayFlorEnLaBolsa', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['HayPapelEnLaBolsa', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['HayFlorEnLaEsquina', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['HayPapelEnLaEsquina', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['Pos', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['Informar', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['AsignarArea', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['AreaC', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['AreaPC', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['AreaP', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['Leer', TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['Random' , TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['BloquearEsquina' , TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['LiberarEsquina' , TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['EnviarMensaje' , TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
            ['RecibirMensaje' , TOKEN_TYPES.ELEMENTAL_INSTRUCTION]
        ]);

    }

    tokenize() {
        this.tokens = [];
        this.position = 0;
        this.line = 1;
        this.column = 1;

        while (this.position < this.source.length) {
            const char = this.source[this.position];

            if (char === '{') {
                this.readComment();
            }else if(char === '('){
                this.readParameter();
            }else if (char === '\n' || char === "") {
                this.line++;
                this.column = 1;
                this.position++;
                this.atLineStart = true;
            } else if (this.atLineStart) {
                this.handleIndentation();
            } else if (this.isWhitespace(char)) {
                this.skipWhitespace();
            } else if (this.isDigit(char)) {
                this.readNumber();
            } else if (this.isLetter(char)) {
                this.readIdentifier();
            } else if (char === '"' || char === "'") {
                this.readString(char);
            } else if (this.isOperator(char)  || char === ',' || char === ':') {
                this.readOperator();
            } else {
                throw new CompilerError(`Carácter inesperado: < ${char} >`, this.line, this.column);
            }
        }

        this.tokens.push({ type: 'EOF', value: '', line: this.line, column: this.column });
        return this.tokens;
    }

    handleIndentation() {
        let indent = 0;
        let startPos = this.position;

        while (this.position < this.source.length && 
            (this.source[this.position] === ' ' || this.source[this.position] === '\t')) {
            if (this.source[this.position] === ' ') {
                indent++;
            } else if (this.source[this.position] === '\t') {
                indent += 4; // o tu tamaño de tab preferido
            }
            this.position++;
            this.column++;
        }

        // Si la línea está vacía (solo salto de línea o espacios), no generar tokens
        if (this.position === startPos || this.source[this.position] === '\n') {
            this.atLineStart = false;
            return;
        }

        // Lógica para generar tokens INDENT/DEDENT
        if (indent > this.indentStack[this.indentStack.length - 1]) {
            this.tokens.push({ type: 'INDENT', value: '', line: this.line, column: 1 });
            this.indentStack.push(indent);
        } else if (indent < this.indentStack[this.indentStack.length - 1]) {
            while (indent < this.indentStack[this.indentStack.length - 1]) {
                this.tokens.push({ type: 'DEDENT', value: '', line: this.line, column: 1 });
                this.indentStack.pop();
            }
        }
        
        this.atLineStart = false;
        this.currentIndent = indent;
    }

    isWhitespace(char) {
        return /\s/.test(char);
    }

    isDigit(char) {
        return /[0-9]/.test(char);
    }

    isLetter(char) {
        return /[a-zA-Z_]/.test(char);
    }

    isOperator(char) {
        return /[+\-*/:=<>!&|,:]/.test(char);
    }

    skipWhitespace() {
        while (this.position < this.source.length && this.isWhitespace(this.source[this.position])) {
            if (this.source[this.position] === '\n') {
                this.line++;
                this.column = 1;
                this.atLineStart = true;
            } else {
                this.column++;
            }
            this.position++;
        }
    }

    readNumber() {
        const start = this.position;
        let value = '';

        while (this.position < this.source.length && this.isDigit(this.source[this.position])) {
            value += this.source[this.position];
            this.position++;
            this.column++;
        }

        this.tokens.push({
            type: 'NUMBER',
            value: parseInt(value),
            line: this.line,
            column: this.column - value.length
        });
    }

    readIdentifier() {
        const start = this.position;
        let value = '';

        while (this.position < this.source.length && 
               (this.isLetter(this.source[this.position]) || this.isDigit(this.source[this.position]))) {
            value += this.source[this.position];
            this.position++;
            this.column++;
        }

        const type = this.keywordMap.get(value) || this.typesDefined.get(value) || TOKEN_TYPES.IDENTIFIER;

        this.tokens.push({
            type,
            value,
            line: this.line,
            column: this.column - value.length
        });
    }

    readString(quote) {
        let value = '';
        this.position++; // Saltar la comilla inicial
        this.column++;

        while (this.position < this.source.length && this.source[this.position] !== quote) {
            if (this.source[this.position] === '\\') {
                this.position++;
                this.column++;
            }
            if (this.position >= this.source.length) {
                throw new CompilerError('Cadena sin cerrar', this.line, this.column);
            }
            value += this.source[this.position];
            this.position++;
            this.column++;
        }

        if (this.position >= this.source.length) {
            throw new CompilerError('Cadena sin cerrar', this.line, this.column);
        }

        this.position++; // Saltar la comilla final
        this.column++;

        this.tokens.push({
            type: 'STRING',
            value,
            line: this.line,
            column: this.column - value.length - 2
        });
    }

    readOperator() {
        const char = this.source[this.position];
        let value = char;
        this.position++;
        this.column++;

        // Si es una coma o dos puntos simples, procesar inmediatamente
        if (char === ',' || char === ':') {
            this.tokens.push({
                type: 'OPERATOR',
                value,
                line: this.line,
                column: this.column - value.length
            });
            return;
        }

        // Operadores de dos caracteres
        if (this.position < this.source.length) {
            const nextChar = this.source[this.position];
            const twoCharOp = char + nextChar;
            
            const doubleOperators = [':=','==', '<=', '>=', '&', '|','~'];
            if (doubleOperators.includes(twoCharOp)) {
                value = twoCharOp;
                this.position++;
                this.column++;
            }
        }

        this.tokens.push({
            type: 'OPERATOR',
            value,
            line: this.line,
            column: this.column - value.length
        });
    }

    readComment() {
        this.position++; // Saltar '{'
        this.column++;
        while (this.position < this.source.length && this.source[this.position] !== '}') {
            if (this.source[this.position] === '\n') {
                this.line++;
                this.column = 1;
            } else {
                this.column++;
            }
            this.position++;
        }
        if (this.position >= this.source.length) {
            throw new CompilerError('Comentario sin cerrar', this.line, this.column);
        }
        this.position++; // Saltar '}'
        this.column++;
    }

    readParameter() {
        let value = '';
        const startLine = this.line;
        const startColumn = this.column;
        this.position++; // Saltar '{'
        this.column++;
        while (this.position < this.source.length && this.source[this.position] !== ')') {
            value += this.source[this.position];
            if (this.source[this.position] === '\n') {
                this.line++;
                this.column = 1;
            } else {
                this.column++;
            }
            this.position++;
        }
        if (this.position >= this.source.length) {
            throw new CompilerError('Parámetro sin cerrar', this.line, this.column);
        }
        this.position++; // Saltar '}'
        this.column++;

        this.tokens.push({
            type: 'PARAMETER',
            value: value,
            line: startLine,
            column: startColumn
        });
    }
}