import express from "express";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenerativeAI(process.env.AI_KEY);

const app = express();
app.use(express.json());

const token = process.env.TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

// Webhook verification
app.get("/webhook", (req, res) => {
    console.log("GET request came");
    if (req.query["hub.verify_token"] === "mysecret") {
        res.send(req.query["hub.challenge"]);
    } else {
        res.status(403).send("Error, wrong token");
    }
});

// Handling incoming messages
app.post("/webhook", async (req, res) => {
    console.log("POST request came");

    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
        return res.sendStatus(200); // Acknowledge empty updates
    }

    try {
        const from = message.from;
        const text = message.text?.body || "";

        console.log("User said:", text);

        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(text);
        const reply = result.response.text();

        console.log("AI Response:", reply);

        // Reply back via WhatsApp
        await axios.post(
            `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
            {
                messaging_product: "whatsapp",
                to: from,
                text: { body: reply },
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        res.sendStatus(200);
    } catch (error) {
        console.error("Error handling message:", error.message);
        res.sendStatus(200); // Still acknowledge to prevent retries
    }
});

const PORT = process.env.PORT || 4343;
app.listen(PORT, () => console.log(`Webhook running on port ${PORT}`));
