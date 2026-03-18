use dioxus::prelude::*;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;
use web_sys::{console, window};

mod compiler;
use crate::compiler::machine::Compiler;

static CSS: Asset = asset!("/assets/main.css");

// ==================== CONSTANTE CON EL CÓDIGO JAVASCRIPT ====================
const DIOXUS_JS: &str = r#"
(function() {
    window.__dioxus = window.__dioxus || {};
    
    // Función para importar archivo (diálogo de abrir)
    window.__dioxus.importFile = function() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,.text,text/plain';
            input.style.display = 'none';
            
            input.onchange = function(event) {
                const file = event.target.files[0];
                if (!file) {
                    reject('No se seleccionó ningún archivo');
                    return;
                }
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Devolver tanto el contenido como el nombre del archivo
                    resolve({
                        content: e.target.result,
                        fileName: file.name
                    });
                };
                
                reader.onerror = function(e) {
                    reject('Error al leer el archivo');
                };
                
                reader.readAsText(file);
            };
            
            input.oncancel = function() {
                reject('Operación cancelada por el usuario');
            };
            
            document.body.appendChild(input);
            input.click();
            setTimeout(() => {
                document.body.removeChild(input);
            }, 1000);
        });
    };
    
    // Función para exportar archivo usando File System Access API (diálogo de guardar)
    window.__dioxus.exportFile = async function(content, suggestedName = 'archivo.txt') {
        if ('showSaveFilePicker' in window) {
            try {
                const options = {
                    suggestedName: suggestedName,
                    types: [{
                        description: 'Archivo de texto',
                        accept: {
                            'text/plain': ['.txt', '.text']
                        }
                    }]
                };
                
                const fileHandle = await window.showSaveFilePicker(options);
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                
                return { success: true, message: 'Archivo guardado exitosamente' };
                
            } catch (err) {
                if (err.name === 'AbortError') {
                    return { success: false, message: 'Operación cancelada por el usuario' };
                }
                return { success: false, message: 'Error al guardar: ' + err.message };
            }
        } else {
            console.log('File System Access API no disponible, usando método alternativo');
            
            try {
                const blob = new Blob([content], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = suggestedName;
                a.style.display = 'none';
                
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
                
                return { success: true, message: 'Archivo descargado (usando método alternativo)' };
                
            } catch (error) {
                return { success: false, message: 'Error al descargar: ' + error.message };
            }
        }
    };
    
    // Función para verificar disponibilidad de la API moderna
    window.__dioxus.hasSaveFilePicker = function() {
        return 'showSaveFilePicker' in window;
    };
    
    console.log('✅ Módulo Dioxus JS cargado correctamente');
})();
"#;

// ==================== ENLACES A FUNCIONES JAVASCRIPT ====================
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = ["window", "__dioxus"])]
    fn importFile() -> JsValue;
    
    #[wasm_bindgen(js_namespace = ["window", "__dioxus"])]
    fn exportFile(content: &str, suggestedName: &str) -> JsValue;
    
    #[wasm_bindgen(js_namespace = ["window", "__dioxus"])]
    fn hasSaveFilePicker() -> bool;
}

/*
    Ejecucion principal de la aplicacion
*/
fn main() {
    dioxus::launch(App);
}

/*
    Componente principal de la aplicación y su estructura general
*/

#[component]
fn App() -> Element {
    // Estados para manejar archivos importados/exportados
    let mut imported_content = use_signal(|| String::new());
    let mut saved_count = use_signal(|| 0);
    let mut compile_status = use_signal(|| CompileStatus::None);

    // Inicializar JavaScript al cargar la app
    use_effect(move || {
        if !check_js_available() {
            inject_javascript();
        }
    });

    rsx! {
        document::Stylesheet { href: CSS }

        div {
            Navbar {
                compile_status: compile_status.clone(),
                codigo: imported_content.clone(),
                on_compile_complete: move |success: bool| {
                    if success {
                        compile_status.set(CompileStatus::Success);
                    } else {
                        compile_status.set(CompileStatus::Error);
                    }
                },
            }
            ZonaTrabajo {}
            ZonaProgramador {
                imported_content: imported_content.clone(),
                saved_count: saved_count.clone(),
                on_file_loaded: move |(content, filename): (String, String)| {
                    imported_content.set(content);
                },
                on_file_saved: move || {
                    saved_count += 1;
                },
            }
        }
    }
}

// ==================== ESTADO DE COMPILACIÓN ====================
#[derive(Clone, Copy, PartialEq)]
enum CompileStatus {
    None,
    Success,
    Error,
}

/*
    Estructura de la barra de navegacion
*/

#[derive(Props, PartialEq, Clone)]
struct NavbarProps {
    compile_status: Signal<CompileStatus>,
    codigo: Signal<String>,
    on_compile_complete: EventHandler<bool>,
}

#[component]
fn Navbar(props: NavbarProps) -> Element {
    rsx! {
        nav {
            BotonCompilar {
                codigo: props.codigo.clone(),
                on_compile_complete: props.on_compile_complete.clone(),
            }
            BotonBarra { nombre: "Ejecutar robot".to_string() }
            BotonBarra { nombre: "Mas opciones".to_string() }

            // Indicador de compilación
            div {
                class: "compile-indicator",
                class: if *props.compile_status.read() == CompileStatus::Success { "success" } else if *props.compile_status.read() == CompileStatus::Error { "error" } else { "none" },
                aria_label: "Estado de compilación",
            }
        }
    }
}

#[component]
fn BotonBarra(nombre: String) -> Element {
    rsx! {
        button { onclick: move |_| println!("Botón {nombre} clickeado!"), "{nombre}" }
    }
}

#[derive(Props, PartialEq, Clone)]
struct BotonCompilarProps {
    codigo: Signal<String>,
    on_compile_complete: EventHandler<bool>,
}

#[component]
fn BotonCompilar(props: BotonCompilarProps) -> Element {
    let mut is_compiling = use_signal(|| false);
    
    let handle_compile = move |_| {
        if *is_compiling.read() {
            return;
        }
        
        let codigo = props.codigo.read().clone();
        let on_complete = props.on_compile_complete.clone();
        let mut is_compiling_clone = is_compiling.clone();
        
        spawn_local(async move {
            is_compiling_clone.set(true);
            
            // Crear el compilador con el código
            let compiler = Compiler::new(codigo);
            
            // Ejecutar la compilación
            let result = compiler.compile(); // Asumiendo que compile() es async
            
            // Notificar el resultado
            on_complete.call(result);
            
            is_compiling_clone.set(false);
        });
    };
    
    rsx! {
        button {
            class: if *is_compiling.read() { "compiling" } else { "" },
            onclick: handle_compile,
            disabled: *is_compiling.read(),
            if *is_compiling.read() {
                "Compilando..."
            } else {
                "Compilar"
            }
        }
    }
}

/*
    Espacio de trabajo del robot 
*/
#[component]
fn ZonaTrabajo() -> Element {
    let mut tamano = use_signal(|| 50);
    let mut zoom = use_signal(|| 10);
    let mut objetos_count = use_signal(|| 0);

    rsx! {
        section { class: "ciudad-container",
            div { class: "ciudad-header",
                h3 { "Mapa de la Ciudad" }
                div { class: "ciudad-controls",
                    label { r#for: "tamano-ciudad", "Tamaño: " }
                    select {
                        id: "tamano-ciudad",
                        onchange: move |evt| {
                            if let Ok(val) = evt.value().parse::<i32>() {
                                tamano.set(val);
                            }
                        },
                        option { value: "50", "50x50" }
                        option { value: "60", "60x60" }
                        option { value: "70", "70x70" }
                        option { value: "100", "100x100" }
                    }

                    label { r#for: "zoom-ciudad", "Zoom: " }
                    input {
                        r#type: "range",
                        id: "zoom-ciudad",
                        min: "5",
                        max: "20",
                        value: "{zoom}",
                        oninput: move |evt| {
                            if let Ok(val) = evt.value().parse::<i32>() {
                                zoom.set(val);
                            }
                        },
                    }

                    button {
                        class: "BtnNav",
                        onclick: move |_| {
                            tamano.set(50);
                            zoom.set(10);
                            objetos_count.set(0);
                        },
                        "Reiniciar"
                    }
                }
            }

            div { class: "ciudad-grid-container",
                div {
                    class: "ciudad-grid",
                    id: "ciudad-grid",
                    style: "display: grid; grid-template-columns: repeat({tamano}, {zoom}px); gap: 1px;",

                    {
                        (0..*tamano.read())
                            .flat_map(|fila| { (0..*tamano.read()).map(move |columna| (fila, columna)) })
                            .map(|(fila, columna)| {
                                let key = format!("celda-{}-{}", fila, columna);
                                rsx! {
                                    div {
                                        key: "{key}",
                                        class: "celda",
                                        style: "width: {zoom}px; height: {zoom}px;",
                                        onclick: move |_| {
                                            objetos_count += 1;
                                            println!("Celda [{}, {}]", fila, columna);
                                        },
                                    }
                                }
                            })
                    }
                }
            }

            div { class: "ciudad-info",
                div { class: "objetos-count",
                    "Objetos: "
                    span { "{objetos_count}" }
                    " | Tamaño: "
                    span { "{tamano}x{tamano}" }
                    " | Zoom: "
                    span { "{zoom}%" }
                }
            }
        }
    }
}

// ==================== PROPS DEL COMPONENTE DE IMPORTAR/EXPORTAR ====================
#[derive(Clone, Props, PartialEq)]
pub struct ImportExportButtonsProps {
    pub current_content: Signal<String>,
    pub saved_count: Signal<i32>,
    pub filename_signal: Signal<String>,
    pub on_file_loaded: EventHandler<(String, String)>, // (contenido, nombre_archivo)
    pub on_file_saved: EventHandler<()>,
}

// ==================== COMPONENTE DE IMPORTAR/EXPORTAR ====================
#[component]
fn ImportExportButtons(mut props: ImportExportButtonsProps) -> Element {
    let mut js_ready = use_signal(|| false);
    let mut has_modern_api = use_signal(|| false);
    let mut is_importing = use_signal(|| false);
    let mut is_exporting = use_signal(|| false);

    // Verificar disponibilidad de JavaScript
    use_effect(move || {
        let mut js_ready_clone = js_ready.clone();
        let mut has_modern_api_clone = has_modern_api.clone();

        spawn_local(async move {
            for _ in 0..10 {
                if check_js_available() {
                    js_ready_clone.set(true);
                    let has_modern = has_save_file_picker_js();
                    has_modern_api_clone.set(has_modern);
                    break;
                }
                
                gloo_timers::future::sleep(std::time::Duration::from_millis(100)).await;
            }
        });
    });

    // Manejador para importar archivo
    let handle_import = move |_| {
        if !js_ready() || *is_importing.read() || *is_exporting.read() {
            return;
        }

        let on_loaded = props.on_file_loaded.clone();
        let mut filename_signal = props.filename_signal.clone();
        let mut is_importing_clone = is_importing.clone();

        spawn_local(async move {
            // Activar estado de carga SOLO para importar
            is_importing_clone.set(true);
            
            // Ejecutar la importación
            match import_file_js().await {
                Ok((content, file_name)) => {
                    println!("✅ Archivo importado exitosamente: {}", file_name);
                    filename_signal.set(file_name.clone());
                    on_loaded.call((content, file_name));
                }
                Err(e) => {
                    // Solo mostrar error si no fue cancelación
                    if !e.contains("cancelada") && !e.contains("Canceled") {
                        println!("❌ Error al importar: {}", e);
                    }
                }
            }
            
            // Desactivar estado de carga
            is_importing_clone.set(false);
        });
    };

    // Manejador para exportar archivo
    let handle_export = move |_| {
        if !js_ready() || *is_exporting.read() || *is_importing.read() || props.current_content.read().is_empty() {
            return;
        }

        let content = props.current_content.read().clone();
        let on_saved = props.on_file_saved.clone();
        let current_filename = props.filename_signal.read().clone();
        let mut is_exporting_clone = is_exporting.clone();

        // Determinar el nombre del archivo a usar
        let export_filename = if current_filename.is_empty() {
            "ejemplo.txt".to_string()
        } else {
            if current_filename.ends_with(".txt") {
                current_filename
            } else {
                format!("{}.txt", current_filename)
            }
        };

        spawn_local(async move {
            // Activar estado de carga SOLO para exportar
            is_exporting_clone.set(true);
            
            // Ejecutar la exportación
            match export_file_js(&content, &export_filename).await {
                Ok(js_value) => {
                    let success = js_sys::Reflect::get(&js_value, &JsValue::from_str("success"))
                        .and_then(|v| v.as_bool().ok_or(JsValue::UNDEFINED))
                        .unwrap_or(false);
                    
                    let message = js_sys::Reflect::get(&js_value, &JsValue::from_str("message"))
                        .and_then(|v| v.as_string().ok_or(JsValue::UNDEFINED))
                        .unwrap_or_else(|_| "Operación completada".to_string());
                    
                    if success {
                        println!("✅ {}", message);
                        on_saved.call(());
                    } else {
                        println!("❌ {}", message);
                    }
                }
                Err(e) => {
                    // Solo mostrar error si no fue cancelación
                    if !e.contains("cancelada") && !e.contains("Canceled") {
                        println!("❌ Error al exportar: {}", e);
                    }
                }
            }
            
            // Desactivar estado de carga
            is_exporting_clone.set(false);
        });
    };

    // Determinar clases para los botones
    let import_classes = if *is_importing.read() {
        "import-btn loading"
    } else {
        "import-btn"
    };
    
    let export_classes = if *is_exporting.read() {
        "export-btn loading"
    } else {
        "export-btn"
    };

    rsx! {
        div { class: "import-export-buttons", style: "display: contents;",
            button {
                class: "{import_classes}",
                onclick: handle_import,
                disabled: !js_ready() || *is_importing.read() || *is_exporting.read(),
                "data-tooltip": "Importar código desde archivo",
                "Importar"
            }
            button {
                class: "{export_classes}",
                onclick: handle_export,
                disabled: !js_ready() || props.current_content.read().is_empty() || *is_exporting.read()
                    || *is_importing.read(),
                "data-tooltip": "Exportar código a archivo",
                "Exportar"
            }
        }
    }
}

// ==================== PROPS DE ZONA PROGRAMADOR ====================
#[derive(Props, PartialEq, Clone)]
struct ZonaProgramadorProps {
    pub imported_content: Signal<String>,
    pub saved_count: Signal<i32>,
    pub on_file_loaded: EventHandler<(String, String)>, // (contenido, nombre_archivo)
    pub on_file_saved: EventHandler<()>,
}

/*
    Espacio de trabajo del programador
*/
#[component]
fn ZonaProgramador(mut props: ZonaProgramadorProps) -> Element {
    let mut panel_abierto = use_signal(|| true);
    let mut objeto_seleccionado = use_signal(|| "flores".to_string());
    let mut cantidad = use_signal(|| 1);
    let mut nombre_programa = use_signal(|| "ejemplo".to_string());
    let mut codigo = use_signal(|| r#"{Bienvenidos al entorno CMRE.
Lo siguiente es un código de ejemplo que implementa un
proceso que recibe un número de avenida como parámetro,
se posiciona en esa avenida y la recorre.}

programa ejemplo
procesos
  proceso recorrerAvenida(E numAv: numero)
  comenzar
    Pos(numAv, 1)
    repetir 99
      mover
  fin
areas
  ciudad: AreaC (1,1,100,100)
robots
  robot robot1
  comenzar
    recorrerAvenida(1)
  fin
variables
  R_info: robot1
comenzar
  AsignarArea(R_info, ciudad)
  Iniciar(R_info, 1,1)
fin"#.to_string());
    let mut velocidad = use_signal(|| 5);
    let mut cursor_pos = use_signal(|| (1, 1)); // (línea, columna)

    // Sincronizar el contenido del código con imported_content cuando cambia
    let mut codigo_clone = codigo.clone();
    let imported_content = props.imported_content.clone();
    
    use_effect(move || {
        let imported = imported_content.read().clone();
        if !imported.is_empty() {
            codigo_clone.set(imported);
        }
    });

    // Sincronizar imported_content con el código cuando cambia (para exportar)
    let mut imported_content_clone = props.imported_content.clone();
    let codigo_clone2 = codigo.clone();
    
    use_effect(move || {
        let current_code = codigo_clone2.read().clone();
        if *imported_content_clone.read() != current_code {
            imported_content_clone.set(current_code);
        }
    });

    // Manejador para cambios en el input del nombre
    let handle_filename_change = move |evt: Event<FormData>| {
        nombre_programa.set(evt.value());
    };

    // Manejador para cambios en el textarea
    let handle_code_change = move |evt: Event<FormData>| {
        let new_code = evt.value();
        codigo.set(new_code.clone());
        props.imported_content.set(new_code);
    };

    // Calcular número de líneas para la barra de estado
    let line_count = codigo.read().lines().count();
    let char_count = codigo.read().len();

    rsx! {
        main { class: "VentanaPrincipal", id: "ventana-principal",

            // --- SECCIÓN: PANEL DE HERRAMIENTAS ---
            section { class: "VentanaHerramientas", id: "panel-control",
                div {
                    class: "panel-header",
                    onclick: move |_| panel_abierto.toggle(),
                    cursor: "pointer",
                    h3 {
                        span { "📦 " }
                        "Panel de Objetos"
                    }
                }

                if *panel_abierto.read() {
                    div { class: "panel-content", id: "panel-content",
                        div { class: "apartadoObjetos",
                            label { r#for: "objetosLista", "Objeto: " }
                            select {
                                id: "objetosLista",
                                onchange: move |evt| objeto_seleccionado.set(evt.value()),
                                option { value: "flores", "Flores" }
                                option { value: "papeles", "Papeles" }
                                option { value: "arbol", "Árbol" }
                            }

                            div { class: "ubicarObjetos",
                                label { "Avenida (X): " }
                                input { r#type: "number", value: "0" }
                                label { "Calle (Y): " }
                                input { r#type: "number", value: "0" }
                            }

                            div { class: "declararObjetos",
                                label { "Cantidad: " }
                                input {
                                    r#type: "number",
                                    value: "{cantidad}",
                                    oninput: move |evt| {
                                        if let Ok(v) = evt.value().parse::<i32>() {
                                            cantidad.set(v)
                                        }
                                    },
                                }
                                button { class: "BtnAgregar", "Agregar" }
                            }
                        }

                        div { class: "controles-robot",
                            h3 { "Velocidad del Robot" }
                            input {
                                r#type: "range",
                                min: "1",
                                max: "10",
                                value: "{velocidad}",
                                oninput: move |evt| {
                                    if let Ok(v) = evt.value().parse::<i32>() {
                                        velocidad.set(v)
                                    }
                                },
                            }
                            span { "{velocidad}" }
                        }
                    }
                }
            }

            // --- SECCIÓN: EDITOR DE INTERACCIÓN ---
            section { class: "VentanaInteraccion", id: "editor-section",
                div { class: "editor-header",
                    // Contenedor para el nombre del programa
                    div { class: "nombre-programa-container",
                        label { "Nombre del programa: " }
                        input {
                            r#type: "text",
                            value: "{nombre_programa}",
                            oninput: handle_filename_change,
                            placeholder: "ejemplo",
                        }
                    }

                    // Contenedor para los botones de importar/exportar
                    div { class: "import-export-container",
                        ImportExportButtons {
                            current_content: props.imported_content.clone(),
                            saved_count: props.saved_count.clone(),
                            filename_signal: nombre_programa.clone(),
                            on_file_loaded: move |(content, filename): (String, String)| {
                                // Primero actualizar el nombre local
                                nombre_programa.set(filename.clone());
                                // Actualizar el código
                                codigo.set(content.clone());
                                // Llamar al callback con los datos
                                props.on_file_loaded.call((content, filename));
                            },
                            on_file_saved: move || {
                                props.on_file_saved.call(());
                            },
                        }
                    }
                }

                div {
                    class: "editor-container",
                    style: "flex: 1; position: relative;",
                    textarea {
                        value: "{codigo}",
                        oninput: handle_code_change,
                        placeholder: "Escribe tu código aquí...",
                        spellcheck: "false",
                        wrap: "off",
                    }
                }

                div { class: "status-bar",
                    span { "Ln {cursor_pos.read().0}, Col {cursor_pos.read().1}" }
                    span { "R-Info" }
                    span { "Archivos guardados: {props.saved_count}" }
                    span { "{char_count} caracteres | {line_count} líneas" }
                }
            }
        }
    }
}

// ==================== FUNCIONES AUXILIARES ====================

fn inject_javascript() {
    let window = match web_sys::window() {
        Some(w) => w,
        None => return,
    };
    
    let document = match window.document() {
        Some(d) => d,
        None => return,
    };
    
    let script = match document.create_element("script") {
        Ok(s) => s,
        Err(_) => return,
    };
    
    script.set_text_content(Some(DIOXUS_JS));
    
    if let Some(head) = document.head() {
        let _ = head.append_child(&script);
        console::log_1(&"📦 Script Dioxus JS inyectado".into());
    }
}

fn check_js_available() -> bool {
    let window = match web_sys::window() {
        Some(w) => w,
        None => return false,
    };
    
    let dioxus_obj = js_sys::Reflect::get(&window, &JsValue::from_str("__dioxus"));
    
    match dioxus_obj {
        Ok(obj) => {
            if obj.is_undefined() || obj.is_null() {
                return false;
            }
            
            let import_fn = js_sys::Reflect::get(&obj, &JsValue::from_str("importFile"));
            let export_fn = js_sys::Reflect::get(&obj, &JsValue::from_str("exportFile"));
            
            match (import_fn, export_fn) {
                (Ok(import_), Ok(export_)) => {
                    !import_.is_undefined() && 
                    !import_.is_null() && 
                    !export_.is_undefined() && 
                    !export_.is_null()
                }
                _ => false,
            }
        }
        Err(_) => false,
    }
}

fn has_save_file_picker_js() -> bool {
    let window = match web_sys::window() {
        Some(w) => w,
        None => return false,
    };
    
    let dioxus_obj = js_sys::Reflect::get(&window, &JsValue::from_str("__dioxus"));
    
    match dioxus_obj {
        Ok(obj) => {
            if obj.is_undefined() || obj.is_null() {
                return false;
            }
            
            let has_fn = js_sys::Reflect::get(&obj, &JsValue::from_str("hasSaveFilePicker"));
            
            match has_fn {
                Ok(func) => {
                    if !func.is_undefined() && !func.is_null() && func.is_function() {
                        if let Ok(func_ref) = func.dyn_into::<js_sys::Function>() {
                            let this = JsValue::null();
                            if let Ok(result) = func_ref.call0(&this) {
                                return result.as_bool().unwrap_or(false);
                            }
                        }
                    }
                    false
                }
                Err(_) => false,
            }
        }
        Err(_) => false,
    }
}

async fn import_file_js() -> Result<(String, String), String> {
    let promise = js_sys::Promise::resolve(&importFile());
    
    match wasm_bindgen_futures::JsFuture::from(promise).await {
        Ok(js_value) => {
            // Extraer contenido y nombre del archivo del objeto devuelto
            let content = js_sys::Reflect::get(&js_value, &JsValue::from_str("content"))
                .and_then(|v| v.as_string().ok_or(JsValue::UNDEFINED))
                .map_err(|_| "No se pudo leer el contenido del archivo".to_string())?;
            
            let file_name = js_sys::Reflect::get(&js_value, &JsValue::from_str("fileName"))
                .and_then(|v| v.as_string().ok_or(JsValue::UNDEFINED))
                .map_err(|_| "No se pudo obtener el nombre del archivo".to_string())?;
            
            Ok((content, file_name))
        }
        Err(e) => {
            if let Some(error_str) = e.as_string() {
                Err(error_str)
            } else {
                Err("Error desconocido al importar".to_string())
            }
        }
    }
}

async fn export_file_js(content: &str, filename: &str) -> Result<JsValue, String> {
    let promise = js_sys::Promise::resolve(&exportFile(content, filename));
    
    match wasm_bindgen_futures::JsFuture::from(promise).await {
        Ok(js_value) => Ok(js_value),
        Err(e) => {
            if let Some(error_str) = e.as_string() {
                Err(error_str)
            } else {
                Err("Error desconocido al exportar".to_string())
            }
        }
    }
}