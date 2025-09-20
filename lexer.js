class CompilerError extends Error {
    constructor(message, line, column) {
        super(`${message} (línea ${line}, columna ${column})`);
        this.name = "CompilerError";
        this.line = line;
        this.column = column;
    }
}

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
            } else if (char === '\n') {
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
            } else if (this.isOperator(char)) {
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
        return /[+\-*/=<>!&|]/.test(char);
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

        const keywords = [
            'si', 'sino', 'mientras', 'repetir', 'proceso', 
            'variables', 'numero', 'booleano', 'comenzar', 
            'fin', 'programa', 'areas', 'robots',
            'V', 'F' 
        ];
        const type = keywords.includes(value) ? 'KEYWORD' : 'IDENTIFIER';

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

        // Operadores de dos caracteres
        if (this.position < this.source.length) {
            const nextChar = this.source[this.position];
            const twoCharOp = char + nextChar;
            
            const doubleOperators = ['==', '!=', '<=', '>=', '&&', '||'];
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
}