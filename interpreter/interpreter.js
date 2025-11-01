
// Palabras clave de R-Info para resaltar (instrucciones de control)
const rinfoKeywords = ['si', 'sino', 'mientras', 'repetir'];
const rinfoBuiltins = ['mover', 'tomarFlor','tomarPapel', 'depositarFlor', 'depositarPapel','Pos','Informar','EnviarMensaje','RecibirMensaje','Random'];
const rinfoSections = ['programa','procesos','proceso','areas','robots','variables','comenzar','fin'];
const rinfoDeclaratives = ['robot','numero','booleano','AreaC','AreaPC','AreaP','Iniciar','AsignarArea'];
const rinfoConstants = ['ES','E','V','F','PosCa','PosAv','HayFlorEnLaEsquina','HayPapelEnLaEsquina','HayFlorEnLaBolsa','HayPapelEnLaBolsa'];

class RInfoEditor {
    constructor(nomProgramId,textAreaId, lineNumbersId, cursorPositionId, codeStatsId) {
        this.nomProgramId = nomProgramId;
        this.textAreaId = textAreaId;
        this.lineNumbersId = lineNumbersId;
        this.cursorPositionId = cursorPositionId;
        this.codeStatsId = codeStatsId;
        this.editor = null;
        this.lineNumbersElement = null;
        this.cursorPositionElement = null;
        this.codeStatsElement = null;
        
        this.initializeCodeMirrorMode();
        this.initializeEditor();
    }

    // Definir el modo personalizado para R-Info
    initializeCodeMirrorMode() {
        if (typeof CodeMirror === 'undefined') {
            console.error('CodeMirror no está cargado');
            return;
        }

        CodeMirror.defineMode("rinfo", (config, parserConfig) => {
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
                        let index = stream.string.indexOf('}', stream.pos);
                        
                        if (index !== -1) {
                            stream.pos = index;
                            stream.next();
                            state.inBraceComment = false;
                            return "comment";
                        } else {
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
    }

    // Inicializar el editor CodeMirror
    initializeEditor() {
        const textArea = document.getElementById(this.textAreaId);
        this.lineNumbersElement = document.getElementById(this.lineNumbersId);
        this.cursorPositionElement = document.getElementById(this.cursorPositionId);
        this.codeStatsElement = document.getElementById(this.codeStatsId);

        if (!textArea) {
            console.error(`TextArea con ID '${this.textAreaId}' no encontrado`);
            return;
        }

        this.editor = CodeMirror.fromTextArea(textArea, {
            mode: "rinfo",
            theme: "dracula",
            lineNumbers: false,
            indentUnit: 4,
            indentWithTabs: false,
            lineWrapping: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            extraKeys: this.getExtraKeys()
        });
        
        this.editor.setSize("100%", "100%");
        this.setupEventListeners();
        this.updateAll();
    }

    // Configurar teclas adicionales
    getExtraKeys() {
        return {
            "Tab": (cm) => {
                cm.replaceSelection("    ", "end");
            },
            "Ctrl-S": (cm) => {
                this.guardarCodigo();
            },
            "Ctrl-O": (cm) => {
                this.cargarCodigo();
            },
            "Ctrl-/": (cm) => {
                this.toggleComment();
            }
        };
    }

    // Configurar event listeners
    setupEventListeners() {
        this.editor.on("change", () => {
            this.updateLineNumbers();
            this.updateCodeStats();
        });
        
        this.editor.on("cursorActivity", () => {
            this.updateCursorPosition();
        });
        
        this.editor.on("scroll", () => {
            if (this.lineNumbersElement) {
                this.lineNumbersElement.scrollTop = this.editor.getScrollInfo().top;
            }
        });
    }

    // Métodos públicos para interactuar con el editor

    getValue() {
        return this.editor ? this.editor.getValue() : '';
    }

    setValue(content) {
        if (this.editor) {
            this.editor.setValue(content);
            this.updateAll();
        }
    }

    setTheme(theme) {
        if (this.editor) {
            this.editor.setOption("theme", theme);
        }
    }

    refresh() {
        if (this.editor) {
            this.editor.refresh();
        }
    }

    // Métodos de actualización de UI

    updateAll() {
        this.updateLineNumbers();
        this.updateCursorPosition();
        this.updateCodeStats();
    }

    updateLineNumbers() {
        if (!this.lineNumbersElement || !this.editor) return;
        
        const lineCount = this.editor.lineCount();
        let numbers = '';
        for (let i = 1; i <= lineCount; i++) {
            numbers += i + '<br>';
        }
        this.lineNumbersElement.innerHTML = numbers;
    }

    updateCodeStats() {
        if (!this.codeStatsElement || !this.editor) return;
        
        const text = this.editor.getValue();
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        const lineCount = this.editor.lineCount();
        this.codeStatsElement.textContent = `${wordCount} palabras, ${lineCount} líneas`;
    }

    updateCursorPosition() {
        if (!this.cursorPositionElement || !this.editor) return;
        
        const cursor = this.editor.getCursor();
        this.cursorPositionElement.textContent = `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
    }

    // Funcionalidades del editor

    toggleComment() {
        if (!this.editor) return;
        
        this.editor.toggleComment({ 
            lineComment: "#", 
            blockComment: ["'''", "'''"] 
        });
        
        this.updateLineNumbers();
        this.updateCodeStats();
    }

    guardarCodigo() {
        const nombreInput = document.getElementById(this.nomProgramId);
        let nombreArchivo = 'codigo.rinfo';
        
        // Obtener el nombre del programa del input
        if (nombreInput && nombreInput.value.trim() !== '') {
            // Limpiar el nombre: quitar espacios y caracteres especiales
            const nombreLimpio = nombreInput.value.trim()
                .replace(/[^a-zA-Z0-9áéíóúñÑ_\- ]/g, '') // Remover caracteres especiales
                .replace(/\s+/g, '_'); // Reemplazar espacios con guiones bajos
            
            nombreArchivo = `${nombreLimpio}.rinfo`;
        }
        
        const content = rinfoEditor.getValue();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
    }

    cargarCodigo() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.rinfo';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.setValue(event.target.result);
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    // Métodos utilitarios

    getLineCount() {
        return this.editor ? this.editor.lineCount() : 0;
    }

    getCursorPosition() {
        return this.editor ? this.editor.getCursor() : { line: 0, ch: 0 };
    }

    setCursorPosition(line, ch) {
        if (this.editor) {
            this.editor.setCursor(line, ch);
            this.editor.focus();
        }
    }

    // Destructor para limpieza
    destroy() {
        if (this.editor) {
            const editorElement = this.editor.getWrapperElement();
            if (editorElement && editorElement.parentNode) {
                editorElement.parentNode.removeChild(editorElement);
            }
            this.editor = null;
        }
    }
}