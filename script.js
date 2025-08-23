// Elementos del DOM
        const codeArea = document.getElementById('seccionCodigo');
        const lineNumbers = document.getElementById('line-numbers');
        const cursorPosition = document.getElementById('cursor-position');
        const fileInfo = document.getElementById('file-info');
        const codeStats = document.getElementById('code-stats');
        const listaObjetos = document.getElementById('lista-objetos');
        const modalAyuda = document.getElementById('modal-ayuda');

        // Variables para la ciudad y el robot
        let ciudad = [];
        let tamañoCiudad = 15;
        let robot = {
            x: 0,
            y: 0,
            activo: false,
            direccion: 'este',
            objeto: null
        };
        let objetosCiudad = [];
        let intervaloRobot = null;

        // Contenido inicial de ejemplo
        const codigoInicial = `// Bienvenido a tu IDE de Robot
function inicializar() {
    // Crear objetos en la escena
    crearObjeto("flores", 5, 10);
    crearObjeto("papeles", 15, 20);
}

// Función para crear objetos
function crearObjeto(tipo, x, y) {
    console.log(\`Creando \${tipo} en posición (\${x}, \${y})\`);
    // Lógica para crear objeto...
}

// Función para mover el robot
function moverRobot(direccion) {
    console.log(\`Moviendo robot hacia \${direccion}\`);
    // Lógica para mover robot...
}

// Función para recoger objetos
function recogerObjeto() {
    console.log("Recogiendo objeto...");
    // Lógica para recoger objeto...
}

// Inicializar la escena
inicializar();`;

        codeArea.value = codigoInicial;

        // Inicializar la ciudad
        function inicializarCiudad() {
            const grid = document.getElementById('ciudad-grid');
            grid.innerHTML = '';
            grid.style.gridTemplateColumns = `repeat(${tamañoCiudad}, 30px)`;
            grid.style.gridTemplateRows = `repeat(${tamañoCiudad}, 30px)`;
            
            ciudad = [];
            objetosCiudad = [];
            actualizarContadorObjetos();
            
            for (let y = 0; y < tamañoCiudad; y++) {
                ciudad[y] = [];
                for (let x = 0; x < tamañoCiudad; x++) {
                    const celda = document.createElement('div');
                    celda.className = 'celda-ciudad';
                    
                    // Marcar calles y avenidas
                    if (x === 0 || y === 0 || x === tamañoCiudad - 1 || y === tamañoCiudad - 1) {
                        celda.classList.add('calle');
                    } else if (x % 3 === 0 || y % 3 === 0) {
                        celda.classList.add('avenida');
                    }
                    
                    celda.dataset.x = x;
                    celda.dataset.y = y;
                    celda.addEventListener('click', () => colocarObjetoEnCelda(x, y));
                    
                    grid.appendChild(celda);
                    ciudad[y][x] = celda;
                }
            }
            
            // Colocar el robot en la posición inicial
            colocarRobot(0, 0);
            actualizarEstadoRobot();
        }

        // Colocar el robot en una posición específica
        function colocarRobot(x, y) {
            // Limpiar la posición anterior del robot
            document.querySelectorAll('.celda-robot').forEach(celda => {
                celda.classList.remove('celda-robot');
            });
            
            // Actualizar posición del robot
            robot.x = x;
            robot.y = y;
            
            // Marcar la nueva posición del robot
            if (ciudad[y] && ciudad[y][x]) {
                ciudad[y][x].classList.add('celda-robot');
                ciudad[y][x].textContent = 'R';
            }
            
            actualizarEstadoRobot();
        }

        // Colocar un objeto en una celda específica
        function colocarObjetoEnCelda(x, y) {
            // No permitir colocar objetos donde está el robot
            if (x === robot.x && y === robot.y) return;
            
            const tipo = document.getElementById('objetosLista').value;
            
            // Verificar si ya hay un objeto en esta posición
            const objetoExistente = objetosCiudad.findIndex(obj => obj.x === x && obj.y === y);
            if (objetoExistente !== -1) {
                objetosCiudad.splice(objetoExistente, 1);
                ciudad[y][x].classList.remove('celda-objeto');
                ciudad[y][x].removeAttribute('data-tipo');
            } else {
                // Agregar nuevo objeto
                objetosCiudad.push({ tipo, x, y });
                ciudad[y][x].classList.add('celda-objeto');
                ciudad[y][x].setAttribute('data-tipo', tipo);
            }
            
            actualizarContadorObjetos();
            actualizarListaObjetos();
        }

        // Actualizar el contador de objetos
        function actualizarContadorObjetos() {
            document.getElementById('contador-objetos').textContent = objetosCiudad.length;
        }

        // Actualizar la lista de objetos en el panel
        function actualizarListaObjetos() {
            const lista = document.getElementById('lista-objetos');
            lista.innerHTML = '';
            
            objetosCiudad.forEach((obj, index) => {
                const li = document.createElement('li');
                li.innerHTML = `${obj.tipo} (${obj.x}, ${obj.y}) <button onclick="eliminarObjeto(${index})">X</button>`;
                lista.appendChild(li);
            });
        }

        // Eliminar un objeto
        function eliminarObjeto(index) {
            const obj = objetosCiudad[index];
            ciudad[obj.y][obj.x].classList.remove('celda-objeto');
            ciudad[obj.y][obj.x].removeAttribute('data-tipo');
            objetosCiudad.splice(index, 1);
            
            actualizarContadorObjetos();
            actualizarListaObjetos();
        }

        // Mover el robot
        function moverRobot(direccion) {
            if (intervaloRobot) {
                clearInterval(intervaloRobot);
                intervaloRobot = null;
                robot.activo = false;
                actualizarEstadoRobot();
                return;
            }
            
            let nuevaX = robot.x;
            let nuevaY = robot.y;
            
            switch(direccion) {
                case 'arriba':
                    nuevaY = Math.max(0, robot.y - 1);
                    break;
                case 'abajo':
                    nuevaY = Math.min(tamañoCiudad - 1, robot.y + 1);
                    break;
                case 'izquierda':
                    nuevaX = Math.max(0, robot.x - 1);
                    break;
                case 'derecha':
                    nuevaX = Math.min(tamañoCiudad - 1, robot.x + 1);
                    break;
                case 'detener':
                    robot.activo = false;
                    actualizarEstadoRobot();
                    return;
            }
            
            // Verificar si hay un objeto en la nueva posición
            const objetoEnCamino = objetosCiudad.find(obj => obj.x === nuevaX && obj.y === nuevaY);
            if (objetoEnCamino) {
                // El robot puede recoger el objeto o detenerse
                if (confirm(`Hay ${objetoEnCamino.tipo} en el camino. ¿Recogerlo?`)) {
                    robot.objeto = objetoEnCamino.tipo;
                    eliminarObjeto(objetosCiudad.indexOf(objetoEnCamino));
                } else {
                    return; // No moverse si hay un objeto y no se recoge
                }
            }
            
            colocarRobot(nuevaX, nuevaY);
        }

        // Ejecutar el código del robot
        function ejecutarRobot() {
            const codigo = codeArea.value;
            try {
                // Simular ejecución del código
                robot.activo = true;
                actualizarEstadoRobot();
                
                // Aquí iría el intérprete real del código
                alert("Ejecutando código del robot...");
                
            } catch (error) {
                alert(`Error en el código: ${error.message}`);
                robot.activo = false;
                actualizarEstadoRobot();
            }
        }

        // Actualizar el estado del robot en la UI
        function actualizarEstadoRobot() {
            const status = document.getElementById('robot-status');
            status.textContent = `Robot: ${robot.activo ? 'Activo' : 'Inactivo'} | Posición: (${robot.x}, ${robot.y}) | Objeto: ${robot.objeto || 'Ninguno'}`;
        }

        // Cambiar el tamaño de la ciudad
        function cambiarTamanoCiudad() {
            tamañoCiudad = parseInt(document.getElementById('tamano-ciudad').value);
            document.getElementById('avenidaPos').max = tamañoCiudad - 1;
            document.getElementById('callePos').max = tamañoCiudad - 1;
            inicializarCiudad();
        }

        // Reiniciar la ciudad
        function reiniciarCiudad() {
            inicializarCiudad();
        }

        // Modificar la función agregarObjeto para usar las coordenadas del formulario
        function agregarObjeto() {
            const tipo = document.getElementById('objetosLista').value;
            const x = parseInt(document.getElementById('avenidaPos').value);
            const y = parseInt(document.getElementById('callePos').value);
            const cantidad = parseInt(document.getElementById('cantidadObjeto').value);
            
            // Validar coordenadas
            if (x < 0 || x >= tamañoCiudad || y < 0 || y >= tamañoCiudad) {
                alert("Coordenadas fuera de los límites de la ciudad");
                return;
            }
            
            // No permitir colocar objetos donde está el robot
            if (x === robot.x && y === robot.y) {
                alert("No se puede colocar un objeto en la posición del robot");
                return;
            }
            
            for (let i = 0; i < cantidad; i++) {
                // Verificar si ya hay un objeto en esta posición
                const objetoExistente = objetosCiudad.findIndex(obj => obj.x === x && obj.y === y);
                if (objetoExistente !== -1) {
                    // Reemplazar el objeto existente
                    objetosCiudad[objetoExistente].tipo = tipo;
                    ciudad[y][x].setAttribute('data-tipo', tipo);
                } else {
                    // Agregar nuevo objeto
                    objetosCiudad.push({ tipo, x, y });
                    ciudad[y][x].classList.add('celda-objeto');
                    ciudad[y][x].setAttribute('data-tipo', tipo);
                }
            }
            
            actualizarContadorObjetos();
            actualizarListaObjetos();
        }

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

        // Cargar preferencia de tema al iniciar y inicializar la ciudad
        window.addEventListener('DOMContentLoaded', function() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'light') {
                document.body.classList.add('light-theme');
                document.querySelector('.theme-toggle').textContent = 'Tema Oscuro';
            }
            
            // Inicializar números de línea y estadísticas
            updateLineNumbers();
            updateCursorPosition();
            
            // Inicializar la ciudad
            inicializarCiudad();
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