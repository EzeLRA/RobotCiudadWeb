use crate::compiler::lib::lexer::scanner::Lexer;
use crate::compiler::lib::lexer::token::Keywords;
use crate::compiler::lib::optimizer::opti_bot::{Info, Optimizer};
use crate::compiler::lib::parser::processor::Parser;
use crate::compiler::lib::semanticizer::analizer::SemanticAnalyzer;
use std::fs;

pub struct Compiler {
    source: String
}

impl Compiler {
    pub fn new(source: String) -> Self {
        Self { source }
    }
    pub fn compile(&self) -> Vec<String> {
        let mut lx = Lexer::new(&self.source);
        let mut results : Vec<String> = Vec::new();

        match lx.tokenize() {
            Ok(tokens) => {
                let mut parser = Parser::new(&tokens);
                match parser.parse() {
                    Ok(ast) => {
                        let mut analyzer = SemanticAnalyzer::new();
                        match analyzer.analizar(&ast) {
                            Ok(_) => {
                                let mut optimizer = Optimizer::new();
                                optimizer.process(&ast);
                                //println!("{:?}", optimizer.get_info());
                                //results.push("Compilation successful".into());
                                return results
                            }
                            Err(errores) => {
                                //println!("{:?}", errores);
                                let error_strings: Vec<String> = errores
                                    .iter()
                                    .map(|error| format!("{:?}", error))
                                    .collect();
                                results.extend(error_strings);
                            }
                        }
                    }
                    Err(e) => {
                        let error_string = format!("Error al generar el AST: {:?}", e);
                        results.extend(vec![error_string]);
                    }
                }
            }
            Err(e) => {
                //eprintln!("Lexing error: {}", e);
                let error_string = format!("Lexing error: {:?}", e);
                results.extend(vec![error_string]);
            }
        }
        return results;
    }
}