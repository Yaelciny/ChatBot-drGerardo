import path from 'path';
import fs from 'fs';
import { addKeyword } from '@builderbot/bot';
import { flowInfoGeneral } from './infoGeneralFlow.js';
import { flowConsulta } from './consultasFLow.js';
import { flowReservas } from './reservasFlow.js';

const menuPath = path.join(process.cwd(), 'mensajes', 'menu', 'menu.txt')
const menu = fs.readFileSync(menuPath, 'utf-8')

export const menuFlow = addKeyword(['menu', 'menú', 'Menu'])
    .addAnswer(
        menu,
        { capture: true },
        async (ctx, { gotoFlow, flowDynamic }) => {
            // Validación con comillas simples
            if (!['1', '2', '3', '0'].includes(ctx.body)) {
                return fallBack('Respuesta no válida, por favor selecciona una de las opciones.');
            }
            switch (ctx.body) {
                case "1":
                    return gotoFlow(flowInfoGeneral);
                    break
                case "2":
                    return gotoFlow(flowReservas);
                case "3":
                    return gotoFlow(flowConsulta);
                    break
                case "0":
                    return await flowDynamic(
                        "Saliendo... Puedes volver a acceder a este menú escribiendo *Menu*"
                    );
            }
        }
    );