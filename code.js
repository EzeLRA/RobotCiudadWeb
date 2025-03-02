function compilar(){
	var lectura = document.getElementById("seccionCodigo").value;
	let fragmentos = lectura.split(';');
	
	if((fragmentos[0].localeCompare("programa") == 0)||(fragmentos[0].charAt(0) == '{')){
		console.log("cumple");
	}else{
		console.log("no cumple");
	}
}

