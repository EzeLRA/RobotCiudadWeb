let codeEditor2; 

function compilar(){
	codeEditor2 = CodeMirror.fromTextArea(document.getElementById('seccionCodigo'));
	let code = codeEditor2.getValue();
	console.log(code);
}