import axios from "axios";

const analyzeSentiment = async (text) => {
  try {
    const apiKey = process.env.HUGGING_FACE_API_KEY;
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/5CD-AI/Vietnamese-Sentiment-visobert",
      { inputs: text },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    const [result] = response.data;

    return result[0].label;
  } catch (err) {
    console.log(err.message);
    throw new Error("Error occurred:", err.message);
  }
};

export default analyzeSentiment;
