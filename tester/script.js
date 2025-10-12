//Por determinar
function testCompilar() {

    
    
    try{
        // 1. Análisis Léxico
        const lexer = new Lexer(sourceCode);
        const tokens = lexer.tokenize();   
                
        //  Muestra de tokens
        let tokenText = tokens.map(token => 
        `${token.type}: "${token.value}" (Línea ${token.line}, Columna ${token.column})`
        ).join('\n');
                
        console.log(tokenText);
                 

        // 2. Análisis Sintáctico
        const parser = new Parser(tokens);
        const ast = parser.parse();
                
        console.log(ast); //resultado de parser

        // 3. Análisis Semántico
        const semanticAnalyzer = new SemanticAnalyzer();
        const semanticResult = semanticAnalyzer.analyze(ast);
        
        // Mostrar resultados
        if (semanticResult.errors.length > 0) { 
            alert('Errores semánticos encontrados:\n' + semanticResult.errors.join('\n'));
            //displayErrors(semanticResult.errors);
        } else {
            //displaySymbolTable(semanticResult.symbolTable);
            console.log(semanticResult);
            alert('Compilación exitosa sin errores.');
        }
                
    } catch (error) {
        alert('Error durante la compilación: ' + error.message);
    }

}