// Elementos del DOM
        const codeArea = document.getElementById('seccionCodigo');
        const lineNumbers = document.getElementById('line-numbers');
        const cursorPosition = document.getElementById('cursor-position');
        const fileInfo = document.getElementById('file-info');
        const codeStats = document.getElementById('code-stats');
        const listaObjetos = document.getElementById('lista-objetos');
        const modalAyuda = document.getElementById('modal-ayuda');
        const panelContent = document.getElementById('panel-content');
        const toggleButton = document.getElementById('toggle-button');
        const editorContainer = document.getElementById('editor-container');
        const panelControl = document.getElementById('panel-control');
        const editorSection = document.getElementById('editor-section');
        const togglePanelBtn = document.getElementById('toggle-panel-btn');
        const zoomSlider = document.getElementById('zoom-ciudad');
        const zoomValue = document.getElementById('zoom-value');
        const tamanoActual = document.getElementById('tamano-actual');
        const ventanaPrincipal = document.getElementById('ventana-principal');

        // Variables para la ciudad y el robot
        let ciudad = [];
        let tamañoCiudad = 50;
        let zoomCiudad = 10;
        let robot = {
            x: 0,
            y: 0,
            activo: false,
            direccion: 'este',
            objeto: null
        };
        let objetosCiudad = [];
        let intervaloRobot = null;
        let panelMinimizado = false;
        let panelContenidoMinimizado = false;

        // Palabras clave de R-Info para resaltar (instrucciones de control)
        const rinfoKeywords = ['si', 'sino', 'mientras', 'repetir'];
        
        // Contenido inicial de ejemplo en R-Info
        const codigoInicial = `# Bienvenido a R-Info - Lenguaje de programación para robots
# Las instrucciones de control se resaltan en azul

# Ejemplo de programa básico
repetir 3 veces:
    mover(norte)
    
mientras hay_objeto():
    recoger()
    mover(este)
    
si sensar() == "flores":
    repetir 5 veces:
        mover(sur)
sino:
    mover(norte)
    dejar()

# Función para buscar objetos
mientras True:
    si hay_objeto():
        recoger()
        romper
    sino:
        mover(este)`;

        codeArea.value = codigoInicial;

        // Función para resaltar la sintaxis de R-Info
        function resaltarSintaxis() {
            const text = codeArea.value;
            let highlightedText = text;
            
            // Resaltar comentarios (líneas que comienzan con #)
            highlightedText = highlightedText.replace(/(#.*)/g, '<span class="comment">$1</span>');
            
            // Resaltar palabras clave (instrucciones de control)
            rinfoKeywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'g');
                highlightedText = highlightedText.replace(regex, `<span class="keyword">${keyword}</span>`);
            });
            
            // Resaltar strings (entre comillas)
            highlightedText = highlightedText.replace(/(".*?"|'.*?')/g, '<span class="string">$1</span>');
            
            // Resaltar números
            highlightedText = highlightedText.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
            
            // Crear un div temporal para mantener la posición del cursor
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = highlightedText;
            
            // Obtener la posición actual del cursor
            const cursorPos = codeArea.selectionStart;
            const scrollPos = codeArea.scrollTop;
            
            // Reemplazar el contenido manteniendo los estilos
            codeArea.innerHTML = tempDiv.innerHTML;
            
            // Restaurar la posición del cursor y scroll
            codeArea.selectionStart = cursorPos;
            codeArea.selectionEnd = cursorPos;
            codeArea.scrollTop = scrollPos;
        }

        // Función para actualizar el zoom de la ciudad
        function actualizarZoom() {
            zoomCiudad = parseInt(zoomSlider.value);
            zoomValue.textContent = zoomCiudad;
            actualizarEstiloCuadricula();
        }

        // Función para actualizar el estilo de la cuadrícula según el zoom
        function actualizarEstiloCuadricula() {
            const grid = document.getElementById('ciudad-grid');
            const cellSize = Math.max(5, Math.min(30, zoomCiudad)); // Tamaño entre 5px y 30px
            grid.style.gridTemplateColumns = `repeat(${tamañoCiudad}, ${cellSize}px)`;
            grid.style.gridTemplateRows = `repeat(${tamañoCiudad}, ${cellSize}px)`;
            
            // Actualizar el tamaño de fuente en función del zoom
            const fontSize = Math.max(8, Math.min(16, Math.round(cellSize * 0.7)));
            document.querySelectorAll('.celda-ciudad').forEach(celda => {
                celda.style.fontSize = `${fontSize}px`;
            });
        }

        // Función para minimizar/mostrar el panel completo (derecha a izquierda)
        function togglePanel() {
            panelMinimizado = !panelMinimizado;
            
            if (panelMinimizado) {
                panelControl.classList.add('collapsed');
                editorSection.classList.add('expanded');
                togglePanelBtn.innerHTML = '<span>▶</span> Panel';
                ventanaPrincipal.classList.add('panel-minimizado');
            } else {
                panelControl.classList.remove('collapsed');
                editorSection.classList.remove('expanded');
                togglePanelBtn.innerHTML = '<span>◀</span> Panel';
                ventanaPrincipal.classList.remove('panel-minimizado');
            }
            
            // Guardar estado en localStorage
            localStorage.setItem('panelMinimizado', panelMinimizado);
        }

        // Función para minimizar/mostrar el contenido del panel (interno)
        function togglePanelContent() {
            panelContenidoMinimizado = !panelContenidoMinimizado;
            
            if (panelContenidoMinimizado) {
                panelContent.classList.add('collapsed');
                toggleButton.classList.add('collapsed');
                toggleButton.textContent = '►';
            } else {
                panelContent.classList.remove('collapsed');
                toggleButton.classList.remove('collapsed');
                toggleButton.textContent = '▼';
            }
            
            // Guardar estado en localStorage
            localStorage.setItem('panelContenidoMinimizado', panelContenidoMinimizado);
        }

        // Inicializar la ciudad
        function inicializarCiudad() {
            const grid = document.getElementById('ciudad-grid');
            grid.innerHTML = '';
            
            ciudad = [];
            objetosCiudad = [];
            actualizarContadorObjetos();
            
            // Actualizar los valores máximos de los inputs de posición
            document.getElementById('avenidaPos').max = tamañoCiudad - 1;
            document.getElementById('callePos').max = tamañoCiudad - 1;
            
            // Crear la cuadrícula
            for (let y = 0; y < tamañoCiudad; y++) {
                ciudad[y] = [];
                for (let x = 0; x < tamañoCiudad; x++) {
                    const celda = document.createElement('div');
                    celda.className = 'celda-ciudad';
                    
                    // Marcar calles y avenidas (cada 10 unidades)
                    if (x === 0 || y === 0 || x === tamañoCiudad - 1 || y === tamañoCiudad - 1) {
                        celda.classList.add('calle');
                    } else if (x % 10 === 0 || y % 10 === 0) {
                        celda.classList.add('avenida');
                    }
                    
                    celda.dataset.x = x;
                    celda.dataset.y = y;
                    celda.addEventListener('click', () => colocarObjetoEnCelda(x, y));
                    
                    grid.appendChild(celda);
                    ciudad[y][x] = celda;
                }
            }
            
            // Actualizar el estilo de la cuadrícula
            actualizarEstiloCuadricula();
            
            // Actualizar el texto del tamaño actual
            tamanoActual.textContent = `${tamañoCiudad}x${tamañoCiudad}`;
            
            // Colocar el robot en la posición inicial
            colocarRobot(0, 0);
            actualizarEstadoRobot();
        }

        // Colocar el robot en una posición específica
        function colocarRobot(x, y) {
            // Limpiar la posición anterior del robot
            document.querySelectorAll('.celda-robot').forEach(celda => {
                celda.classList.remove('celda-robot');
                celda.textContent = '';
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
                
                // Aquí iría el intérprete real del código R-Info
                alert("Ejecutando código R-Info del robot...");
                
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
                
                this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 4;
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
                if (!lines[i].trim().startsWith('#')) {
                    allCommented = false;
                    break;
                }
            }
            
            // Comentar o descomentar según el caso
            for (let i = startLine - 1; i < endLine; i++) {
                if (allCommented) {
                    // Descomentar
                    if (lines[i].trim().startsWith('#')) {
                        lines[i] = lines[i].replace('#', '');
                    }
                } else {
                    // Comentar
                    if (lines[i].trim() !== '' && !lines[i].trim().startsWith('#')) {
                        lines[i] = '#' + lines[i];
                    }
                }
            }
            
            codeArea.value = lines.join('\n');
            updateLineNumbers();
            resaltarSintaxis();
        }

        // Eventos para actualizar interfaz
        codeArea.addEventListener('input', function() {
            updateLineNumbers();
            resaltarSintaxis();
        });
        
        codeArea.addEventListener('click', updateCursorPosition);
        codeArea.addEventListener('keyup', function() {
            updateCursorPosition();
            resaltarSintaxis();
        });
        codeArea.addEventListener('scroll', function() {
            lineNumbers.scrollTop = this.scrollTop;
        });

        // Función de compilación
        function compilar() {
            const codigo = codeArea.value;
            console.log('Compilando código R-Info:', codigo);
            
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
            alert('Código R-Info formateado');
            resaltarSintaxis();
        }

        // Función para guardar código
        function guardarCodigo() {
            const codigo = codeArea.value;
            // Simular guardado
            console.log('Código R-Info guardado:', codigo);
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
            // Volver a resaltar la sintaxis para aplicar los colores del tema
            resaltarSintaxis();
        }

        // Cargar preferencia de tema al iniciar y inicializar la ciudad
        window.addEventListener('DOMContentLoaded', function() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'light') {
                document.body.classList.add('light-theme');
                document.querySelector('.theme-toggle').textContent = 'Tema Oscuro';
            }
            
            // Cargar estado del panel
            const savedPanelState = localStorage.getItem('panelMinimizado');
            if (savedPanelState === 'true') {
                togglePanel();
            }
            
            // Cargar estado del contenido del panel
            const savedPanelContentState = localStorage.getItem('panelContenidoMinimizado');
            if (savedPanelContentState === 'true') {
                togglePanelContent();
            }
            
            // Inicializar números de línea y estadísticas
            updateLineNumbers();
            updateCursorPosition();
            
            // Inicializar la ciudad
            inicializarCiudad();
            
            // Actualizar el valor del zoom
            actualizarZoom();
            
            // Aplicar resaltado de sintaxis inicial
            resaltarSintaxis();
        });