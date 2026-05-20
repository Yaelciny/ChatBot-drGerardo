import path from 'path';
import fs from 'fs';
import { addKeyword, EVENTS } from '@builderbot/bot';
import chat from '../chatGpt/chatGpt.js'

const saludoPath = path.join(process.cwd(), 'mensajes', 'consultas', 'saludo.txt')
const saludo = fs.readFileSync(saludoPath, 'utf-8')

const promptPath = path.join(process.cwd(), 'mensajes', 'consultas', 'prompt.txt')
const prompt = fs.readFileSync(promptPath, 'utf-8')

const salidaPath = path.join(process.cwd(), 'mensajes', 'consultas', 'salida.txt')
const salida = fs.readFileSync(salidaPath, 'utf-8')

export const flowConsulta = addKeyword(EVENTS.ACTION)
    .addAnswer(
        saludo,
        { capture: true },
        async (ctx, ctxFn) => {
            const consultaUsuario = ctx.body.toLowerCase();
            // Conidicion para salir del flujo
            if (consultaUsuario.includes('menu') || consultaUsuario.includes('menú') || consultaUsuario === '0') {
                return;
            }
            // funcion de chatgpt
            const answer = await chat(prompt, ctx.body);

            await ctxFn.flowDynamic(answer);

            // Metemos el texto de salida en el fallback
            // para que no regrese al saludo
            return ctxFn.fallBack(salida);
        }

    )