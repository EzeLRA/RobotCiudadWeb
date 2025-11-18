class CodeGenerator {
    constructor(semanticResult) {
        this.semanticResult = semanticResult;
        this.executableCode = {
            version: "1.0",
            metadata: {},
            city: {},
            robots: [],
            processes: [],
            variables: {}
        };
    }

    generateExecutable() {
        this.extractMetadata();
        this.generateCityStructure();
        this.generateProcesses();
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
            totalProcesses: summary.totalProcesses,
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

    generateProcesses() {
        const { processes } = this.semanticResult;
        
        this.executableCode.processes = processes.map(process => ({
            name: process.name,
            parameters: this.extractProcessParameters(process.parameters),
            variables: this.extractProcessVariables(process.variables),
            instructions: this.optimizeInstructions(process.instructions || []),
            bodyStatements: process.bodyStatements,
            scope: process.scope
        }));
    }

    extractProcessParameters(parameters) {
        return parameters.map(param => {
            const parts = param.split(':');
            const paramParts = parts[0].split(' ');
            return {
                direction: paramParts[0], // E, ES, etc.
                name: paramParts[1],
                type: parts[1] || 'numero'
            };
        });
    }

    extractProcessVariables(variables) {
        if (!variables || variables.length === 0) return [];
        
        return variables.flatMap(variableSection => {
            if (variableSection.declarations) {
                return variableSection.declarations.map(declaration => ({
                    name: declaration.name,
                    type: declaration.variableType
                }));
            }
            return [];
        });
    }

    generateRobotsCode() {
        const { robots, variables, main } = this.semanticResult.executable;
        
        this.executableCode.robots = robots.map(robot => {
            const robotVar = variables[robot.variableName];
            const initializationCommands = this.extractRobotInitialization(main, robot.variableName);
            
            // Extraer variables locales utilizadas por el robot
            const localVariables = this.extractRobotLocalVariables(robot.instructions);
            
            // Extraer procesos utilizados por el robot
            const usedProcesses = this.extractUsedProcesses(robot.instructions);
            
            return {
                id: robot.name,
                variableName: robot.variableName,
                type: "robot",
                subtype: robot.isSubtype,
                initialPosition: robot.position,
                area: robot.area,
                initialization: initializationCommands,
                execution: this.optimizeInstructions(robot.instructions),
                localVariables: localVariables,
                usedProcesses: usedProcesses
            };
        });
    }

    extractRobotLocalVariables(instructions) {
        const variables = new Set();
        
        const extractFromInstruction = (instruction) => {
            if (instruction.type === 'unknown' && instruction.original) {
                // Buscar asignaciones de variables
                if (instruction.original.type === 'Assignment') {
                    if (instruction.original.left && instruction.original.left.name) {
                        variables.add(instruction.original.left.name);
                    }
                }
            }
            
            // Buscar en parámetros de instrucciones
            if (instruction.parameters) {
                instruction.parameters.forEach(param => {
                    if (typeof param === 'string' && isNaN(param) && 
                        !['true', 'false', '*'].includes(param) &&
                        !param.match(/^[0-9]+$/) &&
                        !this.isRobotVariable(param)) {
                        variables.add(param);
                    }
                });
            }
            
            // Buscar en condiciones
            if (instruction.condition && instruction.condition.expression) {
                const expr = instruction.condition.expression;
                if (typeof expr === 'string' && isNaN(expr) && 
                    !this.isBuiltInCondition(expr)) {
                    variables.add(expr);
                }
            }
            
            // Buscar en cuerpo de estructuras de control
            if (instruction.body) {
                instruction.body.forEach(extractFromInstruction);
            }
        };
        
        instructions.forEach(extractFromInstruction);
        return Array.from(variables).map(name => ({ name, type: 'inferred' }));
    }

    isRobotVariable(name) {
        const robotVars = Object.keys(this.semanticResult.executable.variables || {});
        return robotVars.includes(name);
    }

    isBuiltInCondition(condition) {
        const builtInConditions = [
            'HayFlorEnLaEsquina', 'HayPapelEnLaEsquina',
            'HayFlorEnLaBolsa', 'HayPapelEnLaBolsa'
        ];
        return builtInConditions.includes(condition);
    }

    extractUsedProcesses(instructions) {
        const processes = new Set();
        
        const extractFromInstruction = (instruction) => {
            if (instruction.type === 'process_call') {
                processes.add(instruction.processName);
            }
            
            if (instruction.body) {
                instruction.body.forEach(extractFromInstruction);
            }
        };
        
        instructions.forEach(extractFromInstruction);
        return Array.from(processes);
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
                command: instruction.instruction || instruction.processName || 'unknown',
                line: instruction.line || 0
            };

            // Manejar diferentes tipos de instrucciones
            if (instruction.type === 'process_call') {
                optimized.processCall = {
                    name: instruction.processName,
                    parameters: instruction.parameters || []
                };
            }

            if (instruction.type === 'unknown' && instruction.original) {
                optimized.assignment = this.extractAssignment(instruction.original);
            }

            // Optimizar parámetros
            if (instruction.parameters && instruction.parameters.length > 0) {
                optimized.parameters = instruction.parameters.map(param => 
                    this.optimizeParameter(param)
                );
            }

            // Manejar estructuras de control
            if (instruction.body) {
                optimized.body = this.optimizeInstructions(instruction.body);
            }

            if (instruction.condition) {
                optimized.condition = this.extractCondition(instruction.condition);
            }

            if (instruction.count !== undefined) {
                optimized.count = this.optimizeParameter(instruction.count);
            }

            // Convertir comandos a formato ejecutable
            optimized.executable = this.convertToExecutableCommand(instruction);
            
            return optimized;
        });
    }

    extractAssignment(original) {
        if (original.type === 'Assignment') {
            return {
                variable: original.left.name,
                operator: original.operator,
                value: this.extractExpression(original.right)
            };
        }
        return null;
    }

    extractExpression(expression) {
        if (expression.type === 'Literal') {
            return { type: 'literal', value: expression.value };
        } else if (expression.type === 'Identifier') {
            return { type: 'variable', name: expression.name };
        } else if (expression.type === 'BinaryExpression') {
            return {
                type: 'binary_operation',
                operator: expression.operator,
                left: this.extractExpression(expression.left),
                right: this.extractExpression(expression.right)
            };
        }
        return { type: 'unknown', value: expression };
    }

    extractCondition(condition) {
        if (condition.expression) {
            return {
                type: 'condition',
                expression: condition.expression,
                executable: this.convertConditionToExecutable(condition.expression)
            };
        }
        return condition;
    }

    convertConditionToExecutable(expression) {
        const conditionMap = {
            'HayFlorEnLaEsquina': { type: 'sensor', check: 'flower_present', target: 'corner' },
            'HayPapelEnLaEsquina': { type: 'sensor', check: 'paper_present', target: 'corner' },
            'HayFlorEnLaBolsa': { type: 'sensor', check: 'flower_present', target: 'bag' },
            'HayPapelEnLaBolsa': { type: 'sensor', check: 'paper_present', target: 'bag' }
        };
        
        return conditionMap[expression] || { type: 'expression', value: expression };
    }

    optimizeParameter(param) {
        if (typeof param === 'object' && param !== null) {
            return this.extractExpression(param);
        }
        
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
        const cmd = instruction.instruction || instruction.processName;
        const params = instruction.parameters || [];

        if (!cmd) {
            return { type: 'unknown', original: instruction };
        }

        switch (cmd) {
            case 'mover':
                return { type: 'movement', action: 'move' };
            
            case 'derecha':
                return { type: 'rotation', action: 'right' };
            
            case 'TomarFlor':
            case 'tomarFlor':
                return { type: 'interaction', action: 'pick_flower', target: 'ground' };
            
            case 'TomarPapel':
            case 'tomarPapel':
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

            case 'RecibirMensaje':
                return {
                    type: 'communication',
                    action: 'receive_message',
                    variable: params[0],
                    from: params[1]
                };

            case 'EnviarMensaje':
                return {
                    type: 'communication',
                    action: 'send_message',
                    data: params[0],
                    to: params[1]
                };

            case 'BloquearEsquina':
                return {
                    type: 'coordination',
                    action: 'lock_corner',
                    position: { x: params[0], y: params[1] }
                };

            case 'LiberarEsquina':
                return {
                    type: 'coordination',
                    action: 'unlock_corner',
                    position: { x: params[0], y: params[1] }
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
                // Si es una llamada a proceso
                if (instruction.type === 'process_call') {
                    return {
                        type: 'process_call',
                        action: 'execute_process',
                        process: cmd,
                        parameters: params
                    };
                }
                
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
                localVariables: robot.localVariables,
                usedProcesses: robot.usedProcesses,
                position: robot.initialPosition
            })),
            processes: executable.processes.map(process => ({
                name: process.name,
                parameters: process.parameters,
                variables: process.variables
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
                        action: instr.executable,
                        type: instr.type
                    })),
                    localVariables: robot.localVariables,
                    capabilities: robot.usedProcesses
                }))
            },
            environment: {
                variables: executable.variables,
                availableProcesses: executable.processes.map(p => p.name)
            }
        };
    }

    // Métodos estáticos integrados
    static generateExecutableCode(semanticAnalysisResult, options = {}) {
        const generator = new CodeGenerator(semanticAnalysisResult);
        return generator.generateFormattedOutput(options.format || 'json');
    }

    static createOptimizedExecutable(semanticResult) {
        const generator = new CodeGenerator(semanticResult);
        const executable = generator.generateExecutable();
        
        const validator = new CodeGenerator.ExecutableValidator(executable);
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

    // Clase ExecutableValidator integrada
    static ExecutableValidator = class {
        constructor(executableCode) {
            this.executableCode = executableCode;
            this.errors = [];
            this.warnings = [];
        }

        validate() {
            this.validateMetadata();
            this.validateRobots();
            this.validateProcesses();
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

                // Verificar que los procesos utilizados existan
                robot.usedProcesses.forEach(processName => {
                    const processExists = this.executableCode.processes.some(p => p.name === processName);
                    if (!processExists) {
                        this.errors.push(`Robot ${robot.id} uses undefined process: ${processName}`);
                    }
                });
            });
        }

        validateProcesses() {
            const { processes } = this.executableCode;
            
            processes.forEach(process => {
                if (!process.instructions || process.instructions.length === 0) {
                    this.warnings.push(`Process ${process.name} has no instructions`);
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
            const { robots, processes } = this.executableCode;
            
            const totalExecutionInstructions = robots.reduce((sum, robot) => 
                sum + (robot.execution ? robot.execution.length : 0), 0
            );
            
            const totalInitializationCommands = robots.reduce((sum, robot) => 
                sum + (robot.initialization ? robot.initialization.length : 0), 0
            );

            const totalProcessInstructions = processes.reduce((sum, process) => 
                sum + (process.instructions ? process.instructions.length : 0), 0
            );

            return {
                totalRobots: robots.length,
                totalProcesses: processes.length,
                totalExecutionInstructions: totalExecutionInstructions,
                totalInitializationCommands: totalInitializationCommands,
                totalProcessInstructions: totalProcessInstructions,
                totalAreas: this.executableCode.city.areas.length
            };
        }
    }
}