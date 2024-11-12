const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getTextFromUrl(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    return $('p').map((_, el) => $(el).text()).get().join(' ');
  } catch (error) {
    console.error(`Error fetching URL: ${error}`);
    throw new Error('Failed to retrieve content from the URL');
  }
}

async function checkCompliance(policyUrl, webpageText) {
  const prompt = `
    You are a compliance checker. Check if the following webpage content is compliant with the given compliance policy.
    
    Compliance Policy URL:
    ${policyUrl}
    
    Webpage Content:
    ${webpageText}
    
    List all non-compliant points found in the webpage content.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
            role: "user",
            content: prompt,
        },
    ],
    });
    return response.choices[0].message.trim();
  } catch (error) {
    console.error(`Error with OpenAI API: ${error}`);
    throw new Error('Compliance check failed');
  }
}

app.post('/check-compliance', async (req, res) => {
  const { policyUrl, webpageUrl } = req.body;

  try {
    const webpageText = await getTextFromUrl(webpageUrl);
    const findings = await checkCompliance(policyUrl, webpageText);

    res.json({ findings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
