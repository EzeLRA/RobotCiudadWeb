// Palabras clave de R-Info para resaltar (instrucciones de control)
const rinfoKeywords = ['si', 'sino', 'mientras', 'repetir'];
const rinfoBuiltins = ['mover', 'tomarFlor','tomarPapel', 'depositarFlor', 'depositarPapel','Pos','Informar','EnviarMensaje','RecibirMensaje','Random'];
const rinfoSections = ['programa','procesos','proceso','areas','robots','variables','comenzar','fin'];
const rinfoDeclaratives = ['robot','numero','booleano','AreaC','AreaPC','AreaP','Iniciar','AsignarArea'];
const rinfoConstants = ['ES','E','V','F','PosCa','PosAv','HayFlorEnLaEsquina','HayPapelEnLaEsquina','HayFlorEnLaBolsa','HayPapelEnLaBolsa'];

// Definir un modo personalizado para R-Info
CodeMirror.defineMode("rinfo", function(config, parserConfig) {
    return {
        startState: function() {
            return {
                inString: false,
                stringType: null,
                inComment: false,
                inBraceComment: false
            };
        },
        token: function(stream, state) {
            // Comentarios
                    
            // 1. Detectar apertura de comentario con {
            if (!state.inString && !state.inComment && !state.inBraceComment && stream.match(/^{/)) {
                state.inBraceComment = true;
                return "comment";
            }
                    
            // 2. Detectar cierre de comentario con }
            if (state.inBraceComment && stream.match(/^}/)) {
                state.inBraceComment = false;
                return "comment";
            }
                    
            // 3. Si estamos dentro de un comentario de llaves, todo es comentario
            if (state.inBraceComment) {
                // Buscar cualquier ocurrencia de } incluso si tiene caracteres alrededor
                let index = stream.string.indexOf('}', stream.pos);
                        
                if (index !== -1) {
                    // Avanzar hasta la posición de la llave de cierre
                    stream.pos = index;
                    // Consumir la llave de cierre
                    stream.next();
                    state.inBraceComment = false;
                    return "comment";
                } else {
                    // Si no encuentra llave de cierre, consumir hasta el final
                    stream.skipToEnd();
                    return "comment";
                }
            }
                    
            // Strings
            if (!state.inString) {
                if (stream.match(/^""".*"""/)) return "string";
                if (stream.match(/^'''.*'''/)) return "string";
                if (stream.match(/^".*?"/)) return "string";
                if (stream.match(/^'.*?'/)) return "string";
                        
                if (stream.match(/^"""/)) {
                    state.inString = true;
                    state.stringType = '"""';
                    return "string";
                }
                if (stream.match(/^'''/)) {
                    state.inString = true;
                    state.stringType = "'''";
                    return "string";
                }
                if (stream.match(/^"/)) {
                    state.inString = true;
                    state.stringType = '"';
                    return "string";
                }
                if (stream.match(/^'/)) {
                    state.inString = true;
                    state.stringType = "'";
                    return "string";
                }
            } else {
                if (stream.match(state.stringType)) {
                    state.inString = false;
                    state.stringType = null;
                } else {
                    stream.next();
                }
                    return "string";
            }
                    
            // Números
            if (stream.match(/^\d+/)) return "number";
            if (stream.match(/^\d+\.\d+/)) return "number";
                    
            // Identificadores y palabras clave
            if (stream.match(/^[a-zA-Z_áéíóúñÑ][a-zA-Z0-9_áéíóúñÑ]*/)) {
                const word = stream.current();
                if (rinfoKeywords.includes(word)) return "keyword";
                if (rinfoBuiltins.includes(word)) return "builtin";
                if (rinfoSections.includes(word)) return "section";
                if (rinfoDeclaratives.includes(word)) return "declarative";
                if (rinfoConstants.includes(word)) return "constans";
                return "variable";
            }
                    
            // Operadores
            if (stream.match(/^[+~\-*/%=&|<>!?:.,;{}[\]()]/)) return "operator";
                    
                // Avanzar stream
                stream.next();
                return null;
            },
            indent: function(state, textAfter) {
                return 0;
            },
            electricInput: /^\s*[\}\]\)]$/,
            closeBrackets: {pairs: '()[]{}""\'\''}
        };
});

// Inicializar CodeMirror
function inicializarEditor() {
    codeEditor = CodeMirror.fromTextArea(document.getElementById('seccionCodigo'), {
        mode: "rinfo",
        theme: "dracula",
        lineNumbers: false, // Usamos nuestros propios números de línea
        indentUnit: 4,
        indentWithTabs: false,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        extraKeys: {
            "Tab": function(cm) {
                cm.replaceSelection("    ", "end");
            },
            "Ctrl-S": function(cm) {
                guardarCodigo();
            },
            "Ctrl-O": function(cm) {
                cargarCodigo();
            },
            "Ctrl-/": function(cm) {
                toggleComment();
            }
        }
    });
            
    // Configurar el editor con un tamaño adecuado
    codeEditor.setSize("100%", "100%");
            
    // Eventos para actualizar interfaz
    codeEditor.on("change", function() {
        updateLineNumbers();
        updateCodeStats();
    });
            
    codeEditor.on("cursorActivity", function() {
        updateCursorPosition();
    });
            
    codeEditor.on("scroll", function() {
        lineNumbers.scrollTop = codeEditor.getScrollInfo().top;
    });
            
    // Inicializar números de línea y estadísticas
    updateLineNumbers();
    updateCursorPosition();
    updateCodeStats();
}


// Actualizar números de línea
function updateLineNumbers() {
    const lineCount = codeEditor.lineCount();
    let numbers = '';
    for (let i = 1; i <= lineCount; i++) {
        numbers += i + '<br>';
    }
    lineNumbers.innerHTML = numbers;
}

// Actualizar estadísticas del código
function updateCodeStats() {
    const text = codeEditor.getValue();
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const lineCount = codeEditor.lineCount();
    codeStats.textContent = `${wordCount} palabras, ${lineCount} líneas`;
}

// Actualizar posición del cursor
function updateCursorPosition() {
    const cursor = codeEditor.getCursor();
    cursorPosition.textContent = `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
}

// Función para comentar/descomentar línea
function toggleComment() {
    const from = codeEditor.getCursor("from");
    const to = codeEditor.getCursor("to");
            
    // Comentar o descomentar según el caso
    codeEditor.toggleComment({ 
        lineComment: "#", 
        blockComment: ["'''", "'''"] 
    });
            
    updateLineNumbers();
    updateCodeStats();
}