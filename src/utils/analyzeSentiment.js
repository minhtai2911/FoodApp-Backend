import axios from "axios";

const analyzeSentiment = async (text) => {
  try {
    const apiKey = process.env.HUGGING_FACE_API_KEY;
    const response = await axios.post(
      "http://localhost:8001/api/v1/predict-sentiment",
      { text }
      // { inputs: text },
      // { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    return response.data.label;
  } catch (err) {
    console.log(err.message);
    throw new Error("Error occurred:", err.message);
  }
};

export default analyzeSentiment;
