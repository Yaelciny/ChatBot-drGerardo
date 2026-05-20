import path from 'path';
import fs from 'fs';
import { addKeyword, EVENTS } from '@builderbot/bot';

const infoPath = path.join(process.cwd(), 'mensajes', 'infogeneral', 'infogeneral.txt')
const infoGeneral = fs.readFileSync(infoPath, 'utf-8')

const mensajesSeparados = infoGeneral.split('===');

export const flowInfoGeneral = addKeyword(EVENTS.ACTION)
    .addAnswer(mensajesSeparados[0].trim()) // Primer mensaje (Ubicación)
    .addAnswer(mensajesSeparados[1].trim(), { delay: 1000 }) // Segundo mensaje (Costos) 
    .addAnswer(mensajesSeparados[2].trim(), { delay: 1500 }); // Tercer mensaje (Doctor y menú)`