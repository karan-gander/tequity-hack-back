const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { cleanJsonString } = require('./helper/index.js'); // Assuming this function is robust

const app = express();
const port = 30001||process.env.PORT

// Load API key from environment variables
const genAI = new GoogleGenerativeAI("AIzaSyC4egU_MzWNMwx4wz2V94QOR7nAhe7Z2gA");

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

// CORS policy for local development
app.use(cors({
    origin: "http://localhost:5173",
}));

app.post('/api/parse-aadhar', upload.fields([
    { name: 'idCard', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 }
]), async (req, res) => {
    console.log("backend");

    const idCardFile = req.files['idCard']?.[0];
    const addressProofFile = req.files['addressProof']?.[0];

    if (!idCardFile || !addressProofFile) {
        return res.status(400).json({ error: 'Both ID card and address proof images are required.' });
    }

    try {
        const idCardPart = {
            inlineData: {
                data: fs.readFileSync(idCardFile.path).toString('base64'),
                mimeType: idCardFile.mimetype,
            },
        };
        const addressProofPart = {
            inlineData: {
                data: fs.readFileSync(addressProofFile.path).toString('base64'),
                mimeType: addressProofFile.mimetype,
            },
        };

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent(
            [
                idCardPart,
                'This is an ID card. Extract the full name, date of birth in YYYY-MM-DD format, the 12-digit Aadhaar number, and gender.',
                addressProofPart,
                'This is an address proof document. Extract the full address, city, state, and postal code.',
                'Combine all extracted data into a single JSON object. If a value is not found, use an empty string. Do not include any extra text or explanation in the response.'
            ],
            {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        dob: { type: 'string' },
                        aadharNumber: { type: 'string' },
                        gender: { type: 'string', enum: ['Male', 'Female'] },
                        address: { type: 'string' },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        postalCode: { type: 'string' },
                    },
                    required: ['name', 'dob', 'aadharNumber', 'gender', 'address', 'city', 'state', 'postalCode'],
                },
            }
        );

        const cleanedText = cleanJsonString(result.response.text());
        const parsedData = JSON.parse(cleanedText);

        fs.unlinkSync(idCardFile.path);
        fs.unlinkSync(addressProofFile.path);

        console.log("Parsed data: ", parsedData);
        res.json(parsedData);
    } catch (error) {
        if (idCardFile) fs.unlinkSync(idCardFile.path);
        if (addressProofFile) fs.unlinkSync(addressProofFile.path);
        console.error('Error parsing documents:', error);
        res.status(500).json({ error: 'Failed to parse documents with Gemini API.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});