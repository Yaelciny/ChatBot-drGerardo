import { google } from 'googleapis';
import 'dotenv/config';

const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3' });

const calendarId = process.env.GOOGLE_CALENDAR_ID;
const timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE;

const rangeLimit = {
    days: process.env.CALENDAR_ALLOWED_DAYS.split(',').map(Number), // Lunes a viernes
    startHour: Number(process.env.CALENDAR_START_HOUR),
    endHour: Number(process.env.CALENDAR_END_HOUR)
}

const standardDuration = Number(process.env.CALENDAR_DEFAULT_DURATION); /// duracion de la cita en horas
const dateLimit = Number(process.env.CALENDAR_DATE_LIMIT); /// Maximo dias de traer la lista de eventos

/**
 * Función para crear una cita en Google Calendar
 * @param {Object} datosCita - { nombre, descripcion, fechaInicio, duracionMinutos }
 */

export const createEvent = async (datosCita) => {
    try {

        const { nombre, descripcion, fechaInicio, duracionHoras = standardDuration } = datosCita;

        // Fecha y hora de inicio del evento
        const inicio = new Date(fechaInicio);
        // fecha y hora del fin del evento
        const fin = new Date(inicio);
        fin.setHours(fin.getHours() + duracionHoras);

        const event = {
            summary: nombre,
            description: `Procedimiento de interés: ${descripcion}. Registrado por el Asistente Virtual.`,
            start: {
                dateTime: inicio.toISOString(),
                timeZone: timeZone,
            },
            end: {
                dateTime: fin.toISOString(),
                timeZone: timeZone,
            },
            colorId: '2' // 2 = Morado

        };

        const response = await calendar.events.insert({
            calendarId: calendarId,
            resource: event,
            auth: auth,
        })

        const eventId = response.data.id;
        console.log('El evento ha sido creado con el ID:', eventId);
        return eventId;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * Genera los slots disponibles
 */
export const listAvailableSlots = async (date = {}) => { // Añadimos = {} para prevenir errores
    try {
        // Cambiamos const por let para poder reasignar endDate
        let { startDate = new Date(), endDate } = date;
        if (!endDate) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + dateLimit);
        }

        const response = await calendar.events.list({
            calendarId: calendarId,
            auth: auth,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            timeZone: timeZone,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items || []; //Prevenir que items sea undefined
        const slosts = [];
        let currentDate = new Date(startDate);

        //generar slost disponibles 
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            if (rangeLimit.days.includes(dayOfWeek)) {
                for (let hour = rangeLimit.startHour; hour < rangeLimit.endHour; hour++) {
                    const slotStart = new Date(currentDate);
                    slotStart.setHours(hour, 0, 0, 0);
                    const slotEnd = new Date(slotStart);
                    slotEnd.setHours(slotEnd.getHours() + standardDuration);

                    const isBusy = events.some(event => {
                        // Soportar eventos de todo el día que no tienen dateTime
                        const eventStart = new Date(event.start.dateTime || event.start.date);
                        const eventEnd = new Date(event.end.dateTime || event.end.date);
                        return (slotStart < eventEnd && slotEnd > eventStart)
                    });

                    if (!isBusy) {
                        slosts.push({
                            start: slotStart,
                            end: slotEnd
                        });
                    }

                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return slosts;
    } catch (error) {
        console.log(error);
        return null;
    }

}

/** * Obtiene el proximo slot disponible a partir de la fecha actual (para mensajes de confirmacion)
 */
export const getNextAvailableSlot = async (date) => {
    try {

        //Verificar si 'date' es un string en formato ISO
        if (typeof date === 'string') {
            //Convertir el string en un objeto Date
            date = new Date(date);
        } else if (!(date instanceof Date) || isNaN(date.getTime())) { //Negar la instancia
            throw new Error('Fecha invalida');
        }

        //Obtener el proximo slot disponible
        // Enviar la propiedad startDate
        const availableSlots = await listAvailableSlots({ startDate: date });

        //filtrar slots disponibles que comienzan despuesd de la fecha proponcionada
        const filterSlots = availableSlots.filter(slot => slot.start > date);

        //Ordenar los slots por su hora de inicio en orden ascendente
        const sortedSlots = filterSlots.sort((a, b) => new Date(a.start) - new Date(b.start));

        // Tomar el primer slot de la lista resultannte, que sera el proximo slot disponible
        return sortedSlots.length > 0 ? sortedSlots[0] : null

    } catch (error) {
        console.log(error);
        return null;
    }
}

/***
 * Verifica si hay slots disponibles para una fecha dada.
 */

export const isDateAvailable = async (date) => {
    try {
        // Valida que la fecha este dentro del rango permitido
        const currentDate = new Date();
        const maxDate = new Date(currentDate);
        maxDate.setDate(maxDate.getDate() + dateLimit);

        if (date < currentDate || date > maxDate) {
            return false; // La fecha esta fuera del rango permitido
        }

        // Extraer la hora local de México (independiente del servidor)
        // date puede venir con offset -06:00 si la IA lo incluye correctamente
        const localHour = Number(
            new Date(date).toLocaleString('es-MX', {
                timeZone: timeZone,
                hour: 'numeric',
                hour12: false
            })
        );

        // Extraer el día de la semana en zona horaria México
        const localDayOfWeek = Number(
            new Intl.DateTimeFormat('es-MX', {
                timeZone: timeZone,
                weekday: 'short'
            }).format(date) === 'dom' ? 0
                : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date) === 'Sun' ? 0
                    : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date) === 'Mon' ? 1
                        : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date) === 'Tue' ? 2
                            : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date) === 'Wed' ? 3
                                : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date) === 'Thu' ? 4
                                    : new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date) === 'Fri' ? 5
                                        : 6
        );

        // Verifica que la fecha caiga en un dia permitido
        if (!rangeLimit.days.includes(localDayOfWeek)) {
            return false; // la fecha no esta dentro de los dias permitidos
        }

        // Verifica que la hora esté dentro del rango permitido
        if (localHour < rangeLimit.startHour || localHour >= rangeLimit.endHour) {
            return false; // la hora no esta dentro del rango permitido
        }

        // Obtener todos los slots disponibles desde la fecha actual hasta el limite definido
        const availableSlots = await listAvailableSlots({ startDate: currentDate });

        // Filtrar slots disponibles basados en la fecha dada
        const slotsOnGiveDate = availableSlots.filter(slot =>
            new Date(slot.start).toDateString() === date.toDateString()
        );

        // Verifica si hay slots disponibles en la fecha dada
        const isSlotsAvailable = slotsOnGiveDate.some(slot =>
            new Date(slot.start).getTime() <= date.getTime() &&
            new Date(slot.end).getTime() > date.getTime()
        );

        return isSlotsAvailable;

    } catch (error) {
        console.log(error);
        return false;
    }
}