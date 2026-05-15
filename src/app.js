import { path } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3008

const saludoPath = path.join(process.cwd(), 'mensajes', 'saludo.txt')
const saludo = fs.readFileSync(saludoPath, 'utf-8')

const menuPath = path.join(process.cwd(), 'mensajes', 'menu.txt')
const menu = fs.readFileSync(menuPath, 'utf-8')

const infoGeneralPath = path.join(process.cwd(), 'mensajes', 'infogeneral.txt')
const infoGeneral = fs.readFileSync(infoGeneralPath, 'utf-8')
// Divides el texto donde encuentre "==="
const mensajesSeparados = infoGeneral.split('===');

const welcomeFlow = addKeyword(['hola', 'buenos dias', 'buenas tardes', 'buenas noches'])
    .addAnswer(saludo);


const menuFlow = addKeyword(EVENTS.ACTION, ['menu', 'Menu'])
    .addAnswer(
        menu,
        { capture: true },
        async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
            if (!["1", "2", "3", "0"].includes(ctx.body)) {
                return fallBack(
                    "Respuesta no válida, por favor selecciona una de las opciones."
                );
            }
            switch (ctx.body) {
                case "1":
                    return gotoFlow(flowInfoGeneral);
                case "2":
                    return gotoFlow(flowReservar);
                case "3":
                    return gotoFlow(FlowConsultas);
                case "0":
                    return await flowDynamic(
                        "Saliendo... Puedes volver a acceder a este menú escribiendo *Menu*"
                    );
            }
        }
    );


const flowInfoGeneral = addKeyword(EVENTS.ACTION)
    .addAnswer(mensajesSeparados[0].trim()) // Primer mensaje (Ubicación)
    .addAnswer(mensajesSeparados[1].trim(), { delay: 1000 }) // Segundo mensaje (Costos) 
    .addAnswer(mensajesSeparados[2].trim(), { delay: 1500 }); // Tercer mensaje (Doctor y menú)

const main = async () => {

    const adapterFlow = createFlow([
        welcomeFlow,
        menuFlow,
        flowInfoGeneral
    ])

    const adapterProvider = createProvider(Provider,
        { version: [2, 3000, 1035824857] }
    )

    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    httpServer(+PORT)
}

main()
