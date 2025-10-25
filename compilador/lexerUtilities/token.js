//Tipos de tokens
const TOKEN_TYPES = {
    PARAMETER: 'PARAMETER',
    OPERATOR: 'OPERATOR',
    STR: 'STRING',
    NUM: 'NUMBER',
    BOOL: 'BOOLEAN',
    KEYWORD: 'KEYWORD',
    INDENT : 'INDENT',
    DEDENT : 'DEDENT',
    CONTROL_SENTENCE: 'CONTROL_SENTENCE', 
    ELEMENTAL_INSTRUCTION: 'ELEMENTAL_INSTRUCTION',
    IDENTIFIER: 'IDENTIFIER',
    END_FILE: 'EOF'
};
//Tipos de datos
const typesDefined = new Map([
    ['numero', TOKEN_TYPES.IDENTIFIER],
    ['booleano', TOKEN_TYPES.IDENTIFIER],
    ['V', TOKEN_TYPES.IDENTIFIER],
    ['F', TOKEN_TYPES.IDENTIFIER]
]);
//Listado con las palabras clave
const keywords = new Map([
    // Palabras clave básicas
    ['KEYWORD1', 'proceso'],
    ['KEYWORD2', 'robot'],
    ['KEYWORD3', 'variables'],
    ['KEYWORD4', 'comenzar'],
    ['KEYWORD5', 'fin'],
    ['KEYWORD6', 'programa'],
    ['KEYWORD7', 'procesos'],
    ['KEYWORD8', 'areas'],
    ['KEYWORD9', 'robots'],
    
    // Estructuras de control
    ['CONTROL_SENTENCE1', 'si'],
    ['CONTROL_SENTENCE2', 'sino'],
    ['CONTROL_SENTENCE3', 'mientras'],
    ['CONTROL_SENTENCE4', 'repetir'],
    
    // Instrucciones elementales
    ['ELEMENTAL_INSTRUCTION1', 'Iniciar'],
    ['ELEMENTAL_INSTRUCTION2', 'derecha'],
    ['ELEMENTAL_INSTRUCTION3', 'mover'],
    ['ELEMENTAL_INSTRUCTION4', 'tomarFlor'],
    ['ELEMENTAL_INSTRUCTION5', 'tomarPapel'],
    ['ELEMENTAL_INSTRUCTION6', 'depositarFlor'],
    ['ELEMENTAL_INSTRUCTION7', 'depositarPapel'],
    ['ELEMENTAL_INSTRUCTION8', 'PosAv'],
    ['ELEMENTAL_INSTRUCTION9', 'PosCa'],
    ['ELEMENTAL_INSTRUCTION10', 'HayFlorEnLaBolsa'],
    ['ELEMENTAL_INSTRUCTION11', 'HayPapelEnLaBolsa'],
    ['ELEMENTAL_INSTRUCTION12', 'HayFlorEnLaEsquina'],
    ['ELEMENTAL_INSTRUCTION13', 'HayPapelEnLaEsquina'],
    ['ELEMENTAL_INSTRUCTION14', 'Pos'],
    ['ELEMENTAL_INSTRUCTION15', 'Informar'],
    ['ELEMENTAL_INSTRUCTION16', 'AsignarArea'],
    ['ELEMENTAL_INSTRUCTION17', 'AreaC'],
    ['ELEMENTAL_INSTRUCTION18', 'AreaPC'],
    ['ELEMENTAL_INSTRUCTION19', 'AreaP'],
    ['ELEMENTAL_INSTRUCTION20', 'Leer'],
    ['ELEMENTAL_INSTRUCTION21', 'Random'],
    ['ELEMENTAL_INSTRUCTION22', 'BloquearEsquina'],
    ['ELEMENTAL_INSTRUCTION23', 'LiberarEsquina'],
    ['ELEMENTAL_INSTRUCTION24', 'EnviarMensaje'],
    ['ELEMENTAL_INSTRUCTION25', 'RecibirMensaje']
]);
// Palabras clave
const keywordMap = new Map([
    // Palabras clave básicas
    [keywords.get('KEYWORD1'), TOKEN_TYPES.KEYWORD],
    [keywords.get('KEYWORD2'), TOKEN_TYPES.KEYWORD],
    [keywords.get('KEYWORD3'), TOKEN_TYPES.KEYWORD],
    [keywords.get('KEYWORD4'), TOKEN_TYPES.KEYWORD],
    [keywords.get('KEYWORD5'), TOKEN_TYPES.KEYWORD],
    [keywords.get('KEYWORD6'), TOKEN_TYPES.KEYWORD],
    [keywords.get('KEYWORD7'), TOKEN_TYPES.KEYWORD],
    [keywords.get('KEYWORD8'), TOKEN_TYPES.KEYWORD],
    [keywords.get('KEYWORD9'), TOKEN_TYPES.KEYWORD],
    
    // Estructuras de control
    [keywords.get('CONTROL_SENTENCE1'), TOKEN_TYPES.CONTROL_SENTENCE],
    [keywords.get('CONTROL_SENTENCE2'), TOKEN_TYPES.CONTROL_SENTENCE],
    [keywords.get('CONTROL_SENTENCE3'), TOKEN_TYPES.CONTROL_SENTENCE],
    [keywords.get('CONTROL_SENTENCE4'), TOKEN_TYPES.CONTROL_SENTENCE],
    
    // Instrucciones elementales
    [keywords.get('ELEMENTAL_INSTRUCTION1'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION2'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION3'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION4'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION5'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION6'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION7'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION8'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION9'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION10'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION11'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION12'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION13'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION14'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION15'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION16'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION17'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION18'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION19'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION20'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION21'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION22'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION23'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION24'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION],
    [keywords.get('ELEMENTAL_INSTRUCTION25'), TOKEN_TYPES.ELEMENTAL_INSTRUCTION]
]);

class Token{
    constructor(type, value, line, column){
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }
}