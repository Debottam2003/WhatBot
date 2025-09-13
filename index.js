import express from "express";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.AI_KEY });

const app = express();
app.use(express.json());

const token = process.env.TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

// Webhook verification
app.get("/webhook", (req, res) => {
    console.log("get Req came");
    if (req.query["hub.verify_token"] === "mysecret") {
        res.send(req.query["hub.challenge"]);
    } else {
        res.send("Error, wrong token");
    }
});

// Handling incoming messages
app.post("/webhook", async (req, res) => {
    console.log("post Req came");
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    try {
        if (message) {
            const from = message.from;
            const text = message.text.body;
            console.log(text);
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: text,
            });
            console.log(response.text);
            // reply
            await axios.post(
                `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
                {
                    messaging_product: "whatsapp",
                    to: from,
                    text: { body: response.text },
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            res.status(200).send("Success.");
        }
    } catch (error) {
        console.log(error.message);

    }
});

app.listen(3333, () => console.log("Webhook running on port 3333"));
