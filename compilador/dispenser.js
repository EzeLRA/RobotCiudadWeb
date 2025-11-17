class CodeGenerator {
    constructor(semanticResult) {
        this.semanticResult = semanticResult;
        this.executableCode = {
            version: "1.0",
            metadata: {},
            city: {},
            robots: [],
            variables: {}
        };
    }

    generateExecutable() {
        this.extractMetadata();
        this.generateCityStructure();
        this.generateRobotsCode();
        this.generateVariables();
        
        return this.executableCode;
    }

    extractMetadata() {
        const { executable, summary } = this.semanticResult;
        
        this.executableCode.metadata = {
            programName: executable.programa,
            totalRobots: summary.totalRobots,
            totalAreas: summary.totalAreas,
            totalInstructions: summary.totalInstructions,
            generationDate: new Date().toISOString()
        };
    }

    generateCityStructure() {
        const { areas } = this.semanticResult.executable;
        
        this.executableCode.city = {
            areas: areas.map(area => ({
                name: area.name,
                type: area.type,
                bounds: area.bounds,
                dimensions: area.dimensions,
                assignedRobots: area.assignedRobots
            })),
            connections: this.semanticResult.communicationStats.effectiveConnections || 0
        };
    }

    generateRobotsCode() {
        const { robots, variables, main } = this.semanticResult.executable;
        
        this.executableCode.robots = robots.map(robot => {
            const robotVar = variables[robot.variableName];
            
            // Extraer comandos de inicialización específicos para este robot
            const initializationCommands = this.extractRobotInitialization(main, robot.variableName);
            
            return {
                id: robot.name,
                variableName: robot.variableName,
                type: "robot",
                subtype: robot.isSubtype,
                initialPosition: robot.position,
                area: robot.area,
                initialization: initializationCommands,
                execution: this.optimizeInstructions(robot.instructions)
            };
        });
    }

    extractRobotInitialization(mainCommands, robotVariableName) {
        return mainCommands
            .filter(cmd => 
                cmd.parameters && 
                cmd.parameters.includes(robotVariableName)
            )
            .map(cmd => this.convertToExecutableCommand(cmd));
    }

    optimizeInstructions(instructions) {
        return instructions.map(instruction => {
            const optimized = {
                type: instruction.type,
                command: instruction.instruction,
                line: instruction.line
            };

            // Optimizar parámetros
            if (instruction.parameters && instruction.parameters.length > 0) {
                optimized.parameters = instruction.parameters.map(param => 
                    this.optimizeParameter(param)
                );
            }

            // Convertir comandos a formato ejecutable
            optimized.executable = this.convertToExecutableCommand(instruction);
            
            return optimized;
        });
    }

    optimizeParameter(param) {
        // Simplificar parámetros para ejecución
        if (typeof param === 'string') {
            if (param === 'true' || param === 'false') {
                return { type: 'boolean', value: param === 'true' };
            } else if (!isNaN(param)) {
                return { type: 'number', value: Number(param) };
            } else {
                return { type: 'identifier', value: param };
            }
        }
        return { type: 'literal', value: param };
    }

    convertToExecutableCommand(instruction) {
        const cmd = instruction.instruction;
        const params = instruction.parameters || [];

        switch (cmd) {
            case 'mover':
                return { type: 'movement', action: 'move' };
            
            case 'derecha':
                return { type: 'rotation', action: 'right' };
            
            case 'TomarFlor':
                return { type: 'interaction', action: 'pick_flower', target: 'ground' };
            
            case 'TomarPapel':
                return { type: 'interaction', action: 'pick_paper', target: 'ground' };
            
            case 'DepositarFlor':
                return { type: 'interaction', action: 'drop_flower', target: 'ground' };
            
            case 'DepositarPapel':
                return { type: 'interaction', action: 'drop_paper', target: 'ground' };
            
            case 'Informar':
                return { 
                    type: 'communication', 
                    action: 'report', 
                    data: params[0] || 'status'
                };
            
            case 'Pos':
                return { 
                    type: 'sensor', 
                    action: 'set_position', 
                    coordinates: { x: params[0], y: params[1] }
                };

            case 'AsignarArea':
                return {
                    type: 'configuration',
                    action: 'assign_area',
                    robot: params[0],
                    area: params[1]
                };

            case 'Iniciar':
                return {
                    type: 'configuration',
                    action: 'initialize',
                    robot: params[0],
                    position: { x: params[1], y: params[2] }
                };
            
            default:
                return { 
                    type: 'generic', 
                    action: cmd, 
                    parameters: params 
                };
        }
    }

    generateVariables() {
        const { variables } = this.semanticResult.executable;
        
        Object.keys(variables).forEach(varName => {
            const variable = variables[varName];
            
            this.executableCode.variables[varName] = {
                name: variable.name,
                type: variable.type,
                value: variable.value,
                initialized: variable.initialized,
                ...(variable.type === 'robot' && {
                    robotId: variable.robotName,
                    position: variable.initialPosition,
                    area: variable.assignedArea
                })
            };
        });
    }

    generateFormattedOutput(format = 'json') {
        const executable = this.generateExecutable();
        
        switch (format) {
            case 'json':
                return JSON.stringify(executable, null, 2);
            
            case 'compact':
                return this.generateCompactCode(executable);
            
            case 'simulation':
                return this.generateSimulationCode(executable);
            
            default:
                return executable;
        }
    }

    generateCompactCode(executable) {
        return {
            program: executable.metadata.programName,
            robots: executable.robots.map(robot => ({
                id: robot.id,
                initialization: robot.initialization,
                execution: robot.execution.map(instr => instr.executable),
                position: robot.initialPosition
            }))
        };
    }

    generateSimulationCode(executable) {
        return {
            simulation: {
                city: executable.city,
                entities: executable.robots.map(robot => ({
                    type: "robot",
                    id: robot.id,
                    initialState: {
                        position: robot.initialPosition,
                        orientation: "north"
                    },
                    initialization: robot.initialization,
                    behavior: robot.execution.map(instr => ({
                        step: instr.line,
                        action: instr.executable
                    }))
                }))
            },
            environment: {
                variables: executable.variables
            }
        };
    }
}

// Clase Validator actualizada
class ExecutableValidator {
    constructor(executableCode) {
        this.executableCode = executableCode;
        this.errors = [];
        this.warnings = [];
    }

    validate() {
        this.validateMetadata();
        this.validateRobots();
        this.validateCityStructure();
        
        return {
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings,
            stats: this.getValidationStats()
        };
    }

    validateMetadata() {
        const { metadata } = this.executableCode;
        
        if (!metadata.programName) {
            this.errors.push("Missing program name in metadata");
        }
        
        if (metadata.totalRobots === 0) {
            this.warnings.push("No robots defined in program");
        }
    }

    validateRobots() {
        const { robots, city } = this.executableCode;
        
        robots.forEach(robot => {
            // Verificar que el robot tenga un área válida
            const area = city.areas.find(a => a.name === robot.area);
            if (!area) {
                this.errors.push(`Robot ${robot.id} assigned to non-existent area: ${robot.area}`);
            }
            
            // Verificar que la posición inicial esté dentro del área
            if (area && robot.initialPosition) {
                const { x, y } = robot.initialPosition;
                const bounds = area.bounds;
                
                if (x < bounds.x1 || x > bounds.x2 || y < bounds.y1 || y > bounds.y2) {
                    this.errors.push(`Robot ${robot.id} initial position (${x},${y}) outside area bounds`);
                }
            }
            
            // Verificar que tenga instrucciones de ejecución
            if (!robot.execution || robot.execution.length === 0) {
                this.warnings.push(`Robot ${robot.id} has no execution instructions`);
            }
        });
    }

    validateCityStructure() {
        const { city } = this.executableCode;
        
        if (!city.areas || city.areas.length === 0) {
            this.errors.push("No areas defined in city");
        }
    }

    getValidationStats() {
        const { robots } = this.executableCode;
        
        const totalExecutionInstructions = robots.reduce((sum, robot) => 
            sum + (robot.execution ? robot.execution.length : 0), 0
        );
        
        const totalInitializationCommands = robots.reduce((sum, robot) => 
            sum + (robot.initialization ? robot.initialization.length : 0), 0
        );

        return {
            totalRobots: robots.length,
            totalExecutionInstructions: totalExecutionInstructions,
            totalInitializationCommands: totalInitializationCommands,
            totalAreas: this.executableCode.city.areas.length
        };
    }
}

// Función de uso
function generateExecutableCode(semanticAnalysisResult, options = {}) {
    const generator = new CodeGenerator(semanticAnalysisResult);
    return generator.generateFormattedOutput(options.format || 'json');
}

function createOptimizedExecutable(semanticResult) {
    const generator = new CodeGenerator(semanticResult);
    const executable = generator.generateExecutable();
    
    const validator = new ExecutableValidator(executable);
    const validationResult = validator.validate();
    
    if (validationResult.isValid) {
        return {
            success: true,
            executable: executable,
            validation: validationResult
        };
    } else {
        return {
            success: false,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            executable: null
        };
    }
}

module.exports = { 
    CodeGenerator, 
    generateExecutableCode, 
    ExecutableValidator,
    createOptimizedExecutable 
};