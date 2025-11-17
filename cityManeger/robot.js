class Robot{
    constructor(name){
        this.name = name;
        this.areas = [];
        this.bag = {
            flores : 0,
            papeles : 0,
        };
        this.position = {
            x: 0,
            y: 0,
        }
        this.color = 'rojo';
        this.contacts = [];
        this.processState = 'preparado';
        this.procesos = [];
        this.instructions = [];
        this.currentInstruction = 0;
        this.direccion = 'NORTE';
    }
}