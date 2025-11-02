class FileManager {
    guardarCodigo(source,nombreArchivo,nombreInput){
        // Obtener el nombre del programa del input
        if (nombreInput && nombreInput.value.trim() !== '') {
            // Limpiar el nombre: quitar espacios y caracteres especiales
            const nombreLimpio = nombreInput.value.trim()
                .replace(/[^a-zA-Z0-9áéíóúñÑ_\- ]/g, '') // Remover caracteres especiales
                .replace(/\s+/g, '_'); // Reemplazar espacios con guiones bajos
            
            nombreArchivo = `${nombreLimpio}.rinfo`;
        }
        
        const blob = new Blob([source], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
    }

    cargarCodigo(input,editor,nombreInput) {
        input.type = 'file';
        input.accept = '.txt,.rinfo';
        
        input.onchange = (e) => {
            const file = e.target.files[0];

            nombreInput.value = file.name.replace(/\.(txt|rinfo)$/i, '');

            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    editor.setValue(event.target.result);
                };
                reader.readAsText(file);
            }
        };

        input.click();
    }
}