class Machine{
	constructor(){
		this.code = "";
		this.errors = [];
		this.tokensList = "Try execute for process";
		this.parsedSections = "Try execute for process";
		this.finalReport = "Try execute for report results";
	}
	
	//Lexer
	stageOne(){
		try{
			if(this.code != ""){
				const lexer = new Lexer(this.code);
				this.tokensList = lexer.tokenize();
			}
		}catch(error){
			this.errors.push(error);
		}
		
		return this.tokensList;
	}

	//Parser
	stageTwo(){
		try{
			if(this.tokensList != "Try execute for process"){
				const parser = new Parser(this.tokensList);
	        	this.parsedSections = parser.parse();
			}
		}catch(error){
			this.errors.push(error);
		}
		
		return this.parsedSections;
	}

	//SemanticAnalizer
	stageThree(){
		try{
			if(this.parsedSections != "Try execute for process"){
				const semanticAnalyzer = new SemanticAnalyzer();
	        	this.finalReport = semanticAnalyzer.analyze(this.parsedSections);
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
		this.tokensList = "Try execute for process";
		this.parsedSections = "Try execute for process";
		this.finalReport = "Try execute for report results";
	}

	reportErrors(){
		return this.errors;
	}
}