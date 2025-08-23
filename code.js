// Elementos del DOM
const codeArea = document.getElementById('seccionCodigo');
const lineNumbers = document.getElementById('line-numbers');
const cursorPosition = document.getElementById('cursor-position');
const fileInfo = document.getElementById('file-info');
const codeStats = document.getElementById('code-stats');
const listaObjetos = document.getElementById('lista-objetos');
const modalAyuda = document.getElementById('modal-ayuda');

// Contenido inicial de ejemplo
const codigoInicial = `// Bienvenido a tu IDE
function holaMundo() {
    console.log("¡Hola, mundo!");
}

// Crear objetos en la escena
function inicializar() {
    crearObjeto("flores", 5, 10);
    crearObjeto("papeles", 15, 20);
}

// Función para crear objetos
function crearObjeto(tipo, x, y) {
    console.log(\`Creando \${tipo} en posición (\${x}, \${y})\`);
    // Lógica para crear objeto...
}

// Función para mover objetos
function moverObjeto(id, x, y) {
    console.log(\`Moviendo objeto \${id} a posición (\${x}, \${y})\`);
    // Lógica para mover objeto...
}

// Inicializar la escena
inicializar();
holaMundo();`;

codeArea.value = codigoInicial;

// Actualizar números de línea
function updateLineNumbers() {
    const lines = codeArea.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) {
        numbers += i + '<br>';
    }
    lineNumbers.innerHTML = numbers;
    
    // Actualizar estadísticas
    updateCodeStats();
}

// Actualizar estadísticas del código
function updateCodeStats() {
    const text = codeArea.value;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const lineCount = codeArea.value.split('\n').length;
    codeStats.textContent = `${wordCount} palabras, ${lineCount} líneas`;
}

// Actualizar posición del cursor
function updateCursorPosition() {
    const line = codeArea.value.substr(0, codeArea.selectionStart).split('\n').length;
    const col = codeArea.selectionStart - codeArea.value.lastIndexOf('\n', codeArea.selectionStart - 1);
    cursorPosition.textContent = `Ln ${line}, Col ${col}`;
}

// Manejar tabulaciones
codeArea.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        
        this.value = this.value.substring(0, start) + '\t' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 1;
    }
    
    // Atajos de teclado
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 's':
                e.preventDefault();
                guardarCodigo();
                break;
            case 'f':
                e.preventDefault();
                autoFormatear();
                break;
            case '/':
                e.preventDefault();
                toggleComment();
                break;
        }
    }
});

// Función para comentar/descomentar línea
function toggleComment() {
    const start = codeArea.selectionStart;
    const end = codeArea.selectionEnd;
    const text = codeArea.value;
    const startLine = text.substring(0, start).split('\n').length;
    const endLine = text.substring(0, end).split('\n').length;
    
    let lines = text.split('\n');
    let allCommented = true;
    
    // Verificar si todas las líneas seleccionadas están comentadas
    for (let i = startLine - 1; i < endLine; i++) {
        if (!lines[i].trim().startsWith('//')) {
            allCommented = false;
            break;
        }
    }
    
    // Comentar o descomentar según el caso
    for (let i = startLine - 1; i < endLine; i++) {
        if (allCommented) {
            // Descomentar
            if (lines[i].trim().startsWith('//')) {
                lines[i] = lines[i].replace('//', '');
            }
        } else {
            // Comentar
            if (lines[i].trim() !== '' && !lines[i].trim().startsWith('//')) {
                lines[i] = '//' + lines[i];
            }
        }
    }
    
    codeArea.value = lines.join('\n');
    updateLineNumbers();
}

// Eventos para actualizar interfaz
codeArea.addEventListener('input', updateLineNumbers);
codeArea.addEventListener('click', updateCursorPosition);
codeArea.addEventListener('keyup', updateCursorPosition);
codeArea.addEventListener('scroll', function() {
    lineNumbers.scrollTop = this.scrollTop;
});

// Función de compilación
function compilar() {
    const codigo = codeArea.value;
    console.log('Compilando código:', codigo);
    
    // Simular compilación
    setTimeout(() => {
        alert('Compilación completada con éxito');
    }, 1000);
}

// Función para mostrar ayuda
function mostrarAyuda() {
    modalAyuda.style.display = 'block';
}

// Función para cerrar modal
function cerrarModal() {
    modalAyuda.style.display = 'none';
}

// Cerrar modal al hacer clic fuera del contenido
window.addEventListener('click', function(event) {
    if (event.target === modalAyuda) {
        cerrarModal();
    }
});

// Función para avanzar
function avanzar() {
    alert('Función de avance activada');
    // Lógica para avanzar en el programa
}

// Función para formatear código
function autoFormatear() {
    // Simular formateo de código
    alert('Código formateado');
    // En una implementación real, aquí integrarías una librería como Prettier
}

// Función para guardar código
function guardarCodigo() {
    const codigo = codeArea.value;
    // Simular guardado
    console.log('Código guardado:', codigo);
    alert('Código guardado correctamente');
}

// Función para alternar entre temas claro/oscuro
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const themeToggle = document.querySelector('.theme-toggle');
    if (document.body.classList.contains('light-theme')) {
        themeToggle.textContent = 'Tema Oscuro';
        // Guardar preferencia
        localStorage.setItem('theme', 'light');
    } else {
        themeToggle.textContent = 'Tema Claro';
        // Guardar preferencia
        localStorage.setItem('theme', 'dark');
    }
}

// Función para agregar objeto
function agregarObjeto() {
    const tipo = document.getElementById('objetosLista').value;
    const avenida = document.getElementById('avenidaPos').value;
    const calle = document.getElementById('callePos').value;
    const cantidad = document.getElementById('cantidadObjeto').value;
    
    for (let i = 0; i < cantidad; i++) {
        const li = document.createElement('li');
        li.innerHTML = `${tipo} (${avenida}, ${calle}) <button onclick="eliminarObjeto(this)">X</button>`;
        listaObjetos.appendChild(li);
    }
}

// Función para eliminar objeto
function eliminarObjeto(elemento) {
    elemento.parentElement.remove();
}

// Cargar preferencia de tema al iniciar
window.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.querySelector('.theme-toggle').textContent = 'Tema Oscuro';
    }
    
    // Inicializar números de línea y estadísticas
    updateLineNumbers();
    updateCursorPosition();
});

// Resaltado básico de sintaxis (simplificado)
codeArea.addEventListener('input', function() {
    // En una implementación real, usarías una librería como Prism.js o Highlight.js
    // Esto es solo un ejemplo básico
    const cursorPos = this.selectionStart;
    
    // Palabras clave para resaltar (ejemplo)
    const keywords = ['function', 'if', 'else', 'for', 'while', 'return', 'var', 'let', 'const', 'console'];
    
    let code = this.value;
    
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        code = code.replace(regex, `<span class="keyword">${keyword}</span>`);
    });
    
    // Guardar posición del cursor
    this.selectionStart = cursorPos;
    this.selectionEnd = cursorPos;
});