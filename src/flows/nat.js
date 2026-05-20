import { welcomeFlow } from './welcomeFlow.js';
import { menuFlow } from './menuFlow.js';
import { flowInfoGeneral } from './infoGeneralFlow.js';
import { flowConsulta } from './consultasFLow.js';


// Exportamos un arreglo con todos los flujos listos para ser consumidos
export default [
    welcomeFlow,
    flowInfoGeneral,
    flowConsulta,
    menuFlow
];