import path from 'path';
import fs from 'fs';
import { addKeyword, utils } from '@builderbot/bot';
import { menuFlow } from './menuFlow.js';
import { humanDelay, isWithinBusinessHours, OUT_OF_HOURS_MSG, sleep } from '../utils/antiBan.js';

const saludoPath = path.join(process.cwd(), 'mensajes', 'bienvenida', 'saludo.txt')
const saludo = fs.readFileSync(saludoPath, 'utf-8')

// Usar addAction y gotoFlow para saltar de un flujo a otro
export const welcomeFlow = addKeyword(['hola', 'buenos dias', 'buenas tardes', 'buenas noches'])
    .addAnswer(saludo)
    .addAction(async (ctx, { gotoFlow, flowDynamic }) => {
        // Verificar horario de atención
        if (!isWithinBusinessHours()) {
            await humanDelay(OUT_OF_HOURS_MSG);
            await flowDynamic(OUT_OF_HOURS_MSG);
            return;
        }
        // Delay humano antes de mostrar el menú
        await humanDelay(saludo);
        return gotoFlow(menuFlow);
    });