class Machine{
	constructor(){
		this.code = "";
		this.errors = [];
		this.tokensList = null;
		this.parsedSections = null;
		this.finalReport = null;
	}
	
	//Lexer
	stageOne(){
		try{
			if(this.code != ""){
				const lexer = new Lexer(this.code);
				this.tokensList = lexer.tokenize();
				return this.simplifyStageOne();
			}
		}catch(error){
			this.errors.push(error);
		}
	}

	//Parser
	stageTwo(){
		try{
			if(this.tokensList != null){
				const parser = new Parser(this.tokensList);
	        	this.parsedSections = parser.parse();
			}else{
				throw new Error(`La etapa uno no ha sido ejecutada correctamente.`);
			}
		}catch(error){
			this.errors.push(error);
		}
		
		return this.parsedSections;
	}

	//SemanticAnalizer
	stageThree(){
		try{
			if(this.parsedSections != null){
				const semanticAnalyzer = new SemanticAnalyzer();
	        	this.finalReport = semanticAnalyzer.analyze(this.parsedSections);
			}else{
				throw new Error(`La etapa dos no ha sido ejecutada correctamente.`);
			}
		}catch(error){
			this.errors.push(error);
		}
		
		return this.finalReport;
	}

	/*
		Machine functions
	*/

	//Init or reset machine 
	reset(source){
		this.code = source;
		this.errors = [];
		this.tokensList = null;
		this.parsedSections = null;
		this.finalReport = null;
	}

	//Full workflow
	runAllStages(){
		this.stageOne();
		this.stageTwo();
		this.stageThree();
	}

	//Check for errors
	hasErrors(){
		return this.errors.length > 0;
	}

	simplifyStageOne(){
		const tokenText = this.tokensList.map(token => 
		`[${token.type}]: "${token.value}" (Línea ${token.line}, Columna ${token.column})`
		).join('\n');
                
    	return tokenText;
	}

	stringifyResult(source){
		// Usar JSON.stringify con formato y filtro de propiedades
		try {
			const result = JSON.stringify(source, (key, value) => {
				// Eliminar propiedades del prototipo y referencias circulares
				if (key === '<prototype>' || key === 'parent' || key === '_parent') {
					return undefined;
				}
				return value;
			}, 2);
			return result;
		}catch(error){
			return "";
		}
	}

	simplifyStageTwo(){
        return this.stringifyResult(this.parsedSections);
	}

	simplifyStageThree(){
		return this.stringifyResult(this.finalReport);
	}

	getResultOne(){
		return this.tokensList;
	}

	getResultTwo(){
		return this.parsedSections;
	}

	getResultThree(){
		return this.finalReport;
	}

	reportErrors(){
		return this.errors;
	}
}