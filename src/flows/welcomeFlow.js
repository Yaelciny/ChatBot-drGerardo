import path from 'path';
import fs from 'fs';
import { addKeyword, utils } from '@builderbot/bot';
import { menuFlow } from './menuFlow.js';

const saludoPath = path.join(process.cwd(), 'mensajes', 'bienvenida', 'saludo.txt')
const saludo = fs.readFileSync(saludoPath, 'utf-8')

// Usar addAction y gotoFlow para saltar de un flujo a otro
export const welcomeFlow = addKeyword(['hola', 'buenos dias', 'buenas tardes', 'buenas noches'])
    .addAnswer(saludo)
    .addAction(async (ctx, { gotoFlow }) => {
        await utils.delay(1000)
        return gotoFlow(menuFlow);
    });