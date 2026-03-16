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