import OpenAIApi from "openai"
import 'dotenv/config'
const openai = new OpenAIApi({
    apiKey: process.env.OPENAI_API_KEY,
});

const chat = async (prompt, text) => {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: text },
            ],
        });
        return completion.choices[0].message.content;
    } catch (err) {
        console.error("Error al conectar con OpenAI:", err);
        return "ERROR";
    }
};
export default chat;