import { welcomeFlow } from './welcomeFlow.js';
import { menuFlow } from './menuFlow.js';
import { flowInfoGeneral } from './infoGeneralFlow.js';
import { flowConsulta } from './consultasFLow.js';
import { flowReservas } from './reservasFlow.js';


// Exportamos un arreglo con todos los flujos listos para ser consumidos
export default [
    welcomeFlow,
    flowInfoGeneral,
    flowConsulta,
    flowReservas,
    menuFlow
];