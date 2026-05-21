import { DateTime } from 'luxon';
import 'dotenv/config';
import chat from '../chatGpt/chatGpt.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);



/**
 * Convierte una fecha en formato ISO a un texto legible y localizado.
 * @param {string} iso - Fecha en formato ISO.
 * @returns {string} - Fecha en formato legible.
 */
export const iso2text = (iso) => {
    try {
        // Tomamos la zona horaria de tu .env o usamos una por defecto
        const timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE || 'America/Mexico_City';

        // 1. Convertimos la fecha con Luxon
        // 2. Ajustamos a tu zona horaria
        // 3. Forzamos el idioma a español de México para que los meses y días salgan en español
        const dateTime = DateTime.fromISO(iso, { zone: 'utc' })
            .setZone(timeZone)
            .setLocale('es-MX');

        // Formateamos la fecha a un estilo amigable para WhatsApp
        const formattedDate = dateTime.toLocaleString({
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true // Cambiado a true para mostrar AM/PM (ej. 04:30 PM)
        });

        return formattedDate;

    } catch (error) {
        console.error('Error al convertir la fecha:', error);
        return 'Formato de fecha no válido';
    }
}

/**
 * Convierte una fecha en texto a formato ISO utilizando ChatGPT.
 * @param {string} text - Fecha en formato texto (ej: "mañana a las 4pm").
 * @returns {Promise<string>} - Fecha en formato ISO o 'false'.
 */
export const text2iso = async (text) => {
    try {
        // 1. Obtenemos la fecha actual exacta en la zona horaria del consultorio
        // Esto es vital para que la IA sepa cuándo es "hoy" o "mañana"
        const timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE || 'America/Mexico_City';
        const currentDate = new Date().toLocaleString('es-MX', { timeZone });

        // 2. Usamos backticks (`) para el prompt de múltiples líneas
        const promptPath = path.join(process.cwd(), 'mensajes', 'reservas', 'prompt_fechas.txt');
        const promptBase = fs.readFileSync(promptPath, 'utf8');

        const prompt = promptBase.replace('{FECHA_ACTUAL}', currentDate);

        // 3. Llamamos a tu función de IA
        // Nota: Asumo que tu función chat recibe (prompt, textoUsuario) como lo armamos en flowConsulta
        const response = await chat(prompt, text);

        // 4. Limpiamos espacios o saltos de línea basura que la IA pueda agregar
        return response.trim();

    } catch (error) {
        console.error('Error al interpretar la fecha con IA:', error);
        return 'false';
    }
}