// Función para guardar código
function guardarCodigo() {
    const codigo = codeEditor.getValue();
    
    // Verificar que hay código para guardar
    if (!codigo.trim()) {
        alert('No hay código para guardar');
        return;
    }

    // Obtener el nombre personalizado del input
    const nombreInput = document.getElementById('nombre-programa');
    const nombrePersonalizado = nombreInput.value.trim() || 'robot';
    
    if ('showSaveFilePicker' in window) {
        guardarConFileSystemAPI(codigo, nombrePersonalizado);
    } else {
        // Fallback para navegadores antiguos
        guardarConDescarga(codigo, nombrePersonalizado);
    }
}

// Función para actualizar el nombre en el header del editor
function actualizarNombreArchivo(nombre) {
    const nombreInput = document.getElementById('nombre-programa');
    if (nombreInput) {
        nombreInput.value = nombre;
    }
}

// Método moderno con File System Access API
async function guardarConFileSystemAPI(codigo, fileName) {
    try {
        const options = {
            suggestedName: `${fileName}.rinfo`,
            types: [
                {
                    description: 'Archivos R-Info',
                    accept: {
                        'text/plain': ['.rinfo'],
                    },
                },
            ],
        };

        const fileHandle = await window.showSaveFilePicker(options);
        
        // Crear un FileSystemWritableFileStream para escribir
        const writableStream = await fileHandle.createWritable();
        
        // Escribir el contenido
        await writableStream.write(codigo);
        
        // Cerrar el archivo
        await writableStream.close();
    
        alert(`Archivo guardado correctamente: ${fileHandle.name}`);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            alert('Error al guardar el archivo: ' + error.message);
        }
        // Si es AbortError, el usuario canceló la operación
    }
}

// Método de fallback para navegadores antiguos
function guardarConDescarga(codigo, fileName) {
    try {
        // Crear blob con el contenido
        const blob = new Blob([codigo], { type: 'text/plain' });
        
        // Crear URL temporal
        const url = URL.createObjectURL(blob);
        
        // Crear elemento de enlace temporal
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.rinfo`;
        
        // Simular click para descargar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Liberar URL
        URL.revokeObjectURL(url);
        
        alert(`Archivo descargado correctamente: ${fileName}.rinfo`);
        
    } catch (error) {
        alert('Error al descargar el archivo: ' + error.message);
    }
}

// Función adicional para cargar archivos .rinfo
function cargarCodigo() {
    if ('showOpenFilePicker' in window) {
        cargarConFileSystemAPI();
    } else {
        cargarConInputArchivo();
    }
}

// Función cargarCodigo para actualizar el nombre
async function cargarConFileSystemAPI() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [
                {
                    description: 'Archivos R-Info',
                    accept: {
                        'text/plain': ['.rinfo'],
                    },
                },
            ],
            multiple: false
        });

        const file = await fileHandle.getFile();
        const contenido = await file.text();
        
        // Cargar el contenido en el editor
        codeEditor.setValue(contenido);
        
        // Extraer el nombre del archivo (sin extensión) y actualizar el input
        const nombreArchivo = file.name.replace('.rinfo', '');
        actualizarNombreArchivo(nombreArchivo);
        
        alert(`Archivo cargado correctamente: ${file.name}`);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            alert('Error al cargar el archivo: ' + error.message);
        }
    }
}

// Función de fallback
function cargarConInputArchivo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.rinfo';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            codeEditor.setValue(e.target.result);
            
            // Extraer el nombre del archivo y actualizar el input
            const nombreArchivo = file.name.replace('.rinfo', '');
            actualizarNombreArchivo(nombreArchivo);
            
            alert(`Archivo cargado correctamente: ${file.name}`);
        };
        
        reader.onerror = function() {
            alert('Error al leer el archivo');
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Función para exportar compilación
function exportarCompilacion() {
    const resultado = document.getElementById('resultado-compilacion')?.innerText || 
                     'No hay resultado de compilación disponible';
    
    if (!resultado || resultado === 'No hay resultado de compilación disponible') {
        alert('No hay resultado de compilación para exportar');
        return;
    }

    const contenido = `// Resultado de compilación R-Info\n// Fecha: ${new Date().toLocaleString()}\n\n${resultado}`;
    const fileName = prompt('Ingrese el nombre para el archivo de compilación:', 'compilacion');

    if (!fileName) return;

    if ('showSaveFilePicker' in window) {
        guardarConFileSystemAPI(contenido, fileName);
    } else {
        guardarConDescarga(contenido, fileName);
    }
}