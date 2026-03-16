use crate::lib::lexer::scanner::Lexer;
use crate::lib::lexer::token::Keywords;
use crate::lib::optimizer::opti_bot::{Info, Optimizer};
use crate::lib::parser::processor::Parser;
use crate::lib::semanticizer::analizer::SemanticAnalyzer;
use std::fs;

mod lib;
//mod tests;

pub struct Compiler {
    source: String
}

impl Compiler {
    pub fn new(source: String) -> Self {
        Self { source }
    }
    pub fn compile(&self) -> bool {
        let mut lx = Lexer::new(&self.source);
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
                                true
                            }
                            Err(errores) => {
                                //println!("{:?}", errores);
                                false
                            }
                        }
                    }
                    Err(e) => {
                        //println!("Error al generar el AST: {}", e);
                        false
                    }
                }
            }
            Err(e) => {
                //eprintln!("Lexing error: {}", e);
                false
            }
        }
    }
}