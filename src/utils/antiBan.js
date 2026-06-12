/**
 * antiBan.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Utilidades para reducir el riesgo de ban en WhatsApp al usar Baileys.
 *
 * Técnicas implementadas:
 *  1. Delays aleatorios entre mensajes (simula escritura humana)
 *  2. Simulación de "escribiendo..." antes de enviar
 *  3. Rate limiting por número de teléfono
 *  4. División de mensajes largos en chunks (≤ 1000 chars)
 *  5. Jitter exponencial para reintentos
 *  6. Horario de silencio (no responder fuera de horas configuradas)
 */

// ── 1. Configuración global ───────────────────────────────────────────────────

const CONFIG = {
    /** Delay mínimo antes de enviar un mensaje (ms) */
    MIN_TYPING_DELAY_MS: 800,
    /** Delay máximo antes de enviar un mensaje (ms) */
    MAX_TYPING_DELAY_MS: 3500,
    /** Caracteres por segundo que "escribe" el bot (para calcular delay dinámico) */
    CHARS_PER_SECOND: 12,
    /** Máximo de mensajes por minuto por número */
    MAX_MSGS_PER_MINUTE: 8,
    /** Longitud máxima de un chunk antes de dividir el mensaje */
    MAX_CHUNK_LENGTH: 900,
    /** Horario de atención (hora local 24h). Fuera de esto el bot no responde. */
    BUSINESS_HOURS: { start: 7, end: 22 },
    /** Si true, el bot responderá solo en horario de atención */
    ENFORCE_BUSINESS_HOURS: false,
};

// ── 2. Rate limiter en memoria ────────────────────────────────────────────────

/** @type {Map<string, number[]>} número -> timestamps de mensajes enviados */
const rateLimitMap = new Map();

/**
 * Verifica si el número `phone` ha superado el límite de mensajes por minuto.
 * @param {string} phone  Número en formato E.164 o similar.
 * @returns {boolean}     true si debemos bloquear la respuesta.
 */
export function isRateLimited(phone) {
    const now = Date.now();
    const windowMs = 60_000; // 1 minuto
    const timestamps = rateLimitMap.get(phone) ?? [];

    // Limpiar timestamps fuera de la ventana
    const recent = timestamps.filter(ts => now - ts < windowMs);

    if (recent.length >= CONFIG.MAX_MSGS_PER_MINUTE) {
        rateLimitMap.set(phone, recent);
        return true;
    }

    recent.push(now);
    rateLimitMap.set(phone, recent);
    return false;
}

// ── 3. Delays y simulación de escritura ──────────────────────────────────────

/**
 * Espera un tiempo aleatorio entre MIN y MAX para simular escritura humana.
 * El delay escala levemente con la longitud del mensaje.
 * @param {string} [text='']  Texto que se va a enviar (para calcular delay).
 */
export async function humanDelay(text = '') {
    const dynamicMs = Math.min(
        (text.length / CONFIG.CHARS_PER_SECOND) * 1000,
        CONFIG.MAX_TYPING_DELAY_MS
    );
    const base = Math.max(dynamicMs, CONFIG.MIN_TYPING_DELAY_MS);
    const jitter = Math.random() * 800; // hasta 800 ms extra de variación
    const delay = Math.min(base + jitter, CONFIG.MAX_TYPING_DELAY_MS);
    await sleep(delay);
}

/**
 * Pausa de N milisegundos.
 * @param {number} ms
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Delay exponencial con jitter para reintentos.
 * @param {number} attempt  Número de intento (0-based).
 * @param {number} [baseMs=1000]
 */
export async function exponentialBackoff(attempt, baseMs = 1000) {
    const delay = Math.min(baseMs * 2 ** attempt + Math.random() * 500, 30_000);
    await sleep(delay);
}

// ── 4. División de mensajes largos ────────────────────────────────────────────

/**
 * Divide un mensaje en chunks de máximo MAX_CHUNK_LENGTH caracteres,
 * cortando en saltos de línea o espacios para no partir palabras.
 * @param {string} text
 * @returns {string[]}
 */
export function splitMessage(text) {
    if (text.length <= CONFIG.MAX_CHUNK_LENGTH) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > CONFIG.MAX_CHUNK_LENGTH) {
        // Intentar cortar en salto de línea
        let cutIndex = remaining.lastIndexOf('\n', CONFIG.MAX_CHUNK_LENGTH);
        if (cutIndex <= 0) {
            // Si no hay salto de línea, cortar en espacio
            cutIndex = remaining.lastIndexOf(' ', CONFIG.MAX_CHUNK_LENGTH);
        }
        if (cutIndex <= 0) {
            // Sin alternativa, cortar exacto
            cutIndex = CONFIG.MAX_CHUNK_LENGTH;
        }
        chunks.push(remaining.slice(0, cutIndex).trimEnd());
        remaining = remaining.slice(cutIndex).trimStart();
    }

    if (remaining.length > 0) chunks.push(remaining);
    return chunks;
}

// ── 5. Horario de atención ────────────────────────────────────────────────────

/**
 * Indica si el bot está dentro del horario de atención configurado.
 * @returns {boolean}
 */
export function isWithinBusinessHours() {
    if (!CONFIG.ENFORCE_BUSINESS_HOURS) return true;
    const hour = new Date().getHours();
    return hour >= CONFIG.BUSINESS_HOURS.start && hour < CONFIG.BUSINESS_HOURS.end;
}

/**
 * Mensaje estándar cuando el bot recibe un mensaje fuera de horario.
 */
export const OUT_OF_HOURS_MSG =
    '🕐 Hola, nuestro horario de atención es de ' +
    `${CONFIG.BUSINESS_HOURS.start}:00 a ${CONFIG.BUSINESS_HOURS.end}:00. ` +
    'Te responderemos en cuanto abramos. ¡Gracias por tu mensaje! 😊';

// ── 6. Wrapper principal ──────────────────────────────────────────────────────

/**
 * Envía un mensaje de forma "humana":
 *  - Verifica horario de atención
 *  - Verifica rate limit
 *  - Simula delay de escritura
 *  - Divide mensajes largos y los envía en chunks con pausa entre ellos
 *
 * @param {Function} flowDynamic  La función `flowDynamic` de BuilderBot.
 * @param {string}   text         Texto a enviar.
 * @param {string}   phone        Número del destinatario (ctx.from).
 * @returns {Promise<boolean>}    false si el mensaje fue bloqueado.
 */
export async function sendSafe(flowDynamic, text, phone) {
    // Verificar horario
    if (!isWithinBusinessHours()) {
        await flowDynamic(OUT_OF_HOURS_MSG);
        return false;
    }

    // Verificar rate limit
    if (isRateLimited(phone)) {
        console.warn(`[antiBan] Rate limit alcanzado para ${phone}. Mensaje omitido.`);
        return false;
    }

    // Dividir el mensaje si es necesario
    const chunks = splitMessage(text);

    for (const chunk of chunks) {
        await humanDelay(chunk);    // simular escritura
        await flowDynamic(chunk);   // enviar chunk
        if (chunks.length > 1) {
            // Pequeña pausa adicional entre chunks del mismo mensaje
            await sleep(500 + Math.random() * 500);
        }
    }

    return true;
}
