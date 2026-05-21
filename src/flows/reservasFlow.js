import path from 'path';
import fs from 'fs';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { text2iso, iso2text } from '../calendarService/utils.js';
import { isDateAvailable, createEvent, getNextAvailableSlot } from '../calendarService/calendarService.js';

// ── Mensajes ─────────────────────────────────────────────────────────────────
const confirmacionPath = path.join(process.cwd(), 'mensajes', 'reservas', 'confirmacion.txt');
const confirmacion = fs.readFileSync(confirmacionPath, 'utf-8');

const pedirFechaPath = path.join(process.cwd(), 'mensajes', 'reservas', 'pedir_fecha.txt');
const pedirFecha = fs.readFileSync(pedirFechaPath, 'utf-8');

const fechaInvalidaPath = path.join(process.cwd(), 'mensajes', 'reservas', 'fecha_invalida.txt');
const fechaInvalida = fs.readFileSync(fechaInvalidaPath, 'utf-8');

const slotNoDisponiblePath = path.join(process.cwd(), 'mensajes', 'reservas', 'slot_no_disponible.txt');
const slotNoDisponible = fs.readFileSync(slotNoDisponiblePath, 'utf-8');

const exitoPath = path.join(process.cwd(), 'mensajes', 'reservas', 'exito.txt');
const exito = fs.readFileSync(exitoPath, 'utf-8');

const errorPath = path.join(process.cwd(), 'mensajes', 'reservas', 'error.txt');
const error = fs.readFileSync(errorPath, 'utf-8');

const saludoPath = path.join(process.cwd(), 'mensajes', 'reservas', 'saludo.txt');
const saludo = fs.readFileSync(saludoPath, 'utf-8');

const pedirProcedimientoPath = path.join(process.cwd(), 'mensajes', 'reservas', 'pedir_procedimiento.txt');
const pedirProcedimiento = fs.readFileSync(pedirProcedimientoPath, 'utf-8');

// ── Flow ─────────────────────────────────────────────────────────────────────
export const flowReservas = addKeyword(EVENTS.ACTION)

    // PASO 1 – Pedir nombre del paciente
    .addAnswer(
        saludo,
        { capture: true },
        async (ctx, { state, fallBack }) => {
            const body = ctx.body.trim().toLowerCase();

            // Salida del flujo
            if (body === '0' || body === 'menu' || body === 'menú') return;

            // Guardar nombre en el estado
            await state.update({ nombre: ctx.body.trim() });
        }
    )

    // PASO 2 – Pedir el procedimiento de interés
    .addAnswer(
        pedirProcedimiento,
        { capture: true },
        async (ctx, { state }) => {
            await state.update({ procedimiento: ctx.body.trim() });
        }
    )

    // PASO 3 – Pedir fecha y validarla contra Google Calendar
    .addAnswer(
        pedirFecha,
        { capture: true },
        async (ctx, { flowDynamic, state, fallBack }) => {

            // La IA interpreta la fecha en texto libre → ISO con offset -06:00
            const isoFecha = await text2iso(ctx.body);

            // Si la IA no pudo interpretar la fecha
            if (!isoFecha || isoFecha === 'false') {
                return fallBack(fechaInvalida);
            }

            const fecha = new Date(isoFecha);

            // Verificar que la fecha sea un objeto Date válido
            if (isNaN(fecha.getTime())) {
                return fallBack(fechaInvalida);
            }

            // Verificar disponibilidad en Google Calendar
            const disponible = await isDateAvailable(fecha);

            if (!disponible) {
                // Sugerimos el próximo slot libre al usuario
                const proximoSlot = await getNextAvailableSlot(new Date());
                const sugerencia = proximoSlot
                    ? `\n\n💡 El próximo horario disponible es:\n*${iso2text(proximoSlot.start.toISOString())}*`
                    : '';

                return fallBack(`${slotNoDisponible}${sugerencia}`);
            }

            // Guardar fecha validada en el estado de la conversación
            const fechaTexto = iso2text(isoFecha);
            await state.update({ fechaISO: isoFecha, fechaTexto });

            // Mostrar resumen al usuario ANTES de pasar al PASO 4
            const { nombre, procedimiento } = await state.getMyState();
            const resumen = confirmacion
                .replace('{nombre}', nombre)
                .replace('{procedimiento}', procedimiento)
                .replace('{fechaTexto}', fechaTexto);

            await flowDynamic(resumen);
        }
    )

    // PASO 4 – Capturar sí/no (el resumen ya fue enviado al final del PASO 3)
    .addAnswer(
        null,
        { capture: true },
        async (ctx, { flowDynamic, state }) => {
            const { nombre, procedimiento, fechaISO, fechaTexto } = await state.getMyState();

            // Si por alguna razón perdemos el estado, salimos
            if (!procedimiento || !fechaISO) {
                await flowDynamic('Ocurrió un error. Por favor escribe *menú* e inténtalo de nuevo.');
                return;
            }

            // Evaluar respuesta del usuario
            const respuesta = ctx.body.trim().toLowerCase();

            if (!['si', 'sí', 's', 'yes', '1'].includes(respuesta)) {
                await flowDynamic('❌ Cita cancelada. Escribe *menú* para volver al menú principal.');
                return;
            }

            // CREAR EVENTO en Google Calendar
            const eventId = await createEvent({
                nombre: nombre + "\n numero: +" + ctx.from,
                descripcion: procedimiento,
                fechaInicio: fechaISO,
            });

            if (eventId) {
                const mensajeExito = exito
                    .replace('{nombre}', nombre || ctx.name)
                    .replace('{procedimiento}', procedimiento)
                    .replace('{fechaTexto}', fechaTexto);
                await flowDynamic(mensajeExito);
            } else {
                await flowDynamic(error);
            }
        }
    );
