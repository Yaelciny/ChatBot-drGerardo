import path from 'path';
import fs from 'fs';
import { addKeyword, EVENTS } from '@builderbot/bot';

const saludoPath = path.join(process.cwd(), 'mensajes', 'consultas', 'saludo.txt')
const saludo = fs.readFileSync(saludoPath, 'utf-8')

export const flowConsulta = addKeyword(EVENTS.ACTION)
    .addAnswer(saludo)