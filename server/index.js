const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

// Configure Multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const RICS_PROMPT = `
You are a professional property inspector certified with RICS and ASTM standards.
Analyze the provided image of a property area and identify any defects.

Follow these steps:
1. Identify the item or component (e.g., Wall, Ceiling, Window, Floor, Pipe).
2. Detect any defects (e.g., Cracking, Spalling, Efflorescence, Water Staining, Rot, Damp).
3. Assess the severity based on RICS standards:
   - Condition Rating 1: No repair currently needed.
   - Condition Rating 2: Repairs needed but not urgent.
   - Condition Rating 3: Defects that are serious and/or need to be repaired, replaced or investigated urgently.
4. Categorize by ASTM/RICS categories (e.g., Structural, Finishes, Services, External).

Return the response strictly as a JSON object with this schema:
{
  "item": "String",
  "defect": "String",
  "category": "Structural | Finishes | Services | External",
  "severity": "Condition Rating 1 | 2 | 3",
  "confidence": "Float (0-1)",
  "description": "Short technical description of the defect and recommended action."
}
`;

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      console.warn('Analysis requested without image file');
      return res.status(400).json({ error: 'No image uploaded' });
    }

    console.log(`Analyzing image: ${req.file.originalname} (${req.file.size} bytes)`);

    // Process image with Sharp
    const processedBuffer = await sharp(req.file.buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    console.log('Image processed with Sharp, calling Gemini...');

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      RICS_PROMPT,
      {
        inlineData: {
          data: processedBuffer.toString('base64'),
          mimeType: req.file.mimetype,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    console.log('Gemini response received:', text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to find JSON in Gemini response');
      return res.status(500).json({ error: 'AI returned invalid format', raw: text });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    res.json(analysis);
  } catch (error) {
    console.error('DETAILED ERROR DURING ANALYSIS:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(port, () => {
  console.log(`Defect Detection API running at http://localhost:${port}`);
});
