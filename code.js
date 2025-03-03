function verificarComentario(cad){
	/*
		-1 = se encontro palabras no contenidas en el comentario
		0 = no se encontro simbolo {
		1 = se encontro apertura {
		2 = se encontro apertura y cierre { }
	*/
	let comentarioValor = 0;
	let linea = cad.split(" ");
	let i = 0;
	while((i<=linea.length-1)&&(comentarioValor<2)&&(comentarioValor > -1)){
		if((linea[i].charAt(0) == "{")&&(linea[i].charAt(linea[i].length-1) == "}")){
			comentarioValor = 2;
		}else{
			if((linea[i].charAt(0) == "{")&&(comentarioValor == 0)){
				comentarioValor = 1;
			}else{
				if((linea[i].charAt(linea[i].length-1) == "}")&&(comentarioValor == 1)){
					comentarioValor = 2;
				}else{
					if(comentarioValor == 0){
						comentarioValor = -1;
					}
				}
			}
		}
		
		i++;
	}
	return comentarioValor;
}

function buscarPalabra(cad,clave){
	let encontre = false;
	let palabras = cad.split(" ");
	let i = 0;
	while((i<=palabras.length-1)&&(encontre == false)){
		if(palabras[i].localeCompare(clave) == 0){
			encontre = true;
		}
		i++;
	}
	return encontre;
}

function ubicarInicio(codigo){
	let cumple = false;
	let lineas = codigo.split("\n");
	let i = 0;
	let comentarioSimbolo = 0; //Verifica la apertura y cierre de comentario

	//Busca la palabra (programa) para empezar a verificar
	while((i<=lineas.length-1)&&(cumple == false)){
		//Verifica comentarios al inicio
		comentarioSimbolo = verificarComentario(lineas[i]);
		console.log(comentarioSimbolo);
		//Busca la palabra clave (programa)
		if(((comentarioSimbolo == 0)||(comentarioSimbolo == 2))&&(buscarPalabra(lineas[i],"programa") == true)){
			cumple = true;
		}else{
			if((comentarioSimbolo = -1)&&(buscarPalabra(lineas[i],"programa") == true)){
				cumple = true;
			}
		}
		i++;
		
	}
	
	return cumple;
}

function compilar(){
	var codigo = document.getElementById("seccionCodigo").value;
	if(codigo.length>0){
		console.log(ubicarInicio(codigo));
	}else{
		console.log("Seccion vacia");
	}
}

