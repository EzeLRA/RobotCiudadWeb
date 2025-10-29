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

	hasErrors(){
		return this.errors.length > 0;
	}

	simplifyStageOne(){
		const tokenText = this.tokensList.map(token => 
		`${token.type}: "${token.value}" (Línea ${token.line}, Columna ${token.column})`
		).join('\n');
                
    	return tokenText;
	}

	reportErrors(){
		return this.errors;
	}
}