import offensiveWords from "../../vietnamese_offensive_words.js";

const banOffensiveComment = (text) => {
  try {
    const comment = text.toLowerCase();
    for (let i = 0; i < offensiveWords.length; i++) {
      if (comment.includes(offensiveWords[i].toLowerCase())) {
        return true;
      }
    }
    return false;
  } catch (err) {
    throw new Error(err.message);
  }
};

export default banOffensiveComment;
