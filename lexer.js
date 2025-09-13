class Lexer {
    constructor(source) {
        this.source = source;
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
    }

    tokenize() {
        this.tokens = [];
        this.position = 0;
        this.line = 1;
        this.column = 1;

        while (this.position < this.source.length) {
            const char = this.source[this.position];

            if (this.isWhitespace(char)) {
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
                throw new CompilerError(`Carácter inesperado: ${char}`, this.line, this.column);
            }
        }

        this.tokens.push({ type: 'EOF', value: '', line: this.line, column: this.column });
        return this.tokens;
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

        const keywords = ['si', 'sino', 'minetras', 'repetir', 'proceso', 'variables', 'numero', 'booleano','comenzar','fin','programa','areas'];
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
}