
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { VoiceName } from "../types";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateSpeech = async (
  text: string,
  voiceName: VoiceName
): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(p => p.inlineData);

    if (audioPart?.inlineData?.data) {
      return audioPart.inlineData.data;
    }

    throw new Error("No audio data found in the response.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const rewriteAsJournalist = async (input: string): Promise<string> => {
  const ai = getAiClient();

  const prompt = `
    Bạn là một **Biên Tập Viên Phát Thanh (Radio Host)** chuyên nghiệp.
    Hãy viết lại nội dung văn bản dưới đây thành một bài dẫn chuyện để MC đọc trực tiếp trên sóng.
    KHÔNG dùng MARKDOWN. KHÔNG chú thích kịch bản. Chỉ xuất văn bản thuần.
    "${input}"
  `;

  try {
    const isUrl = input.startsWith('http');
    const tools = isUrl ? [{ googleSearch: {} }] : undefined;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { tools }
    });

    let text = response.text || "Không thể biên tập lại nội dung này.";
    return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
  } catch (error) {
    console.error("Gemini Rewrite Error:", error);
    throw new Error("Lỗi khi biên tập nội dung: " + (error as Error).message);
  }
};

export const generateScriptFromText = async (input: string): Promise<string> => {
  const ai = getAiClient();
  const prompt = `
    Chuyển thể văn bản sau thành kịch bản hội thoại đối thoại hấp dẫn.
    Định dạng: "Tên Nhân Vật: Lời thoại".
    Văn phong tự nhiên, ngắn gọn, dễ đọc. KHÔNG dùng markdown.
    INPUT: "${input}"
  `;

  try {
     const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [{ parts: [{ text: prompt }] }]
    });
    return (response.text || "").replace(/\*\*/g, '').replace(/\*/g, '');
  } catch (error) {
    console.error("Script Gen Error:", error);
    throw new Error("Lỗi khi tạo kịch bản: " + (error as Error).message);
  }
}

/**
 * ĐỈNH CAO LOGIC: Tạo kịch bản theo thời lượng yêu cầu
 */
export const generateScriptFromUrl = async (url: string, durationMinutes: number): Promise<string> => {
  const ai = getAiClient();
  
  // 1 phút ≈ 150 từ tiếng Việt
  const targetWordCount = durationMinutes * 155;
  
  const strategy = durationMinutes <= 3 ? "Tóm tắt tin tức nhanh (Briefing)" : 
                   durationMinutes <= 10 ? "Phân tích sâu (Deep Dive)" : 
                   "Talkshow thảo luận chi tiết (Extensive Podcast)";

  const prompt = `
    Bạn là một Nhà Sản Xuất Podcast (Podcast Producer) đẳng cấp thế giới.
    Nhiệm vụ: Chuyển thể nội dung từ đường link này: ${url} thành một kịch bản Podcast tiếng Việt.

    **YÊU CẦU ĐỊNH LƯỢNG CHÍNH XÁC:**
    - Thời lượng mong muốn: **${durationMinutes} phút**.
    - Số lượng từ mục tiêu: **KHOẢNG ${targetWordCount} TỪ**.
    - CHIẾN LƯỢC: **${strategy}**.

    **CẤU TRÚC KỊCH BẢN (Podcast Flow):**
    1. **Mở đầu (Intro):** Chào khán giả, giới thiệu chủ đề một cách cuốn hút.
    2. **Thân bài (Phân vai):**
       - Tự động phân vai giữa "Host" (Nam - Fenrir) và "Chuyên Gia" (Nữ - Zephyr).
       - Đối với thời lượng DÀI (${durationMinutes}p): Bạn PHẢI sử dụng Google Search để tìm thêm bối cảnh, các sự kiện liên quan, số liệu thống kê và các góc nhìn phản biện để làm dày nội dung. Hãy tạo ra các đoạn tranh luận, câu hỏi gợi mở để buổi trò chuyện không bị nhàm chán.
    3. **Kết bài (Outro):** Tóm lược ý chính, lời chào và hẹn gặp lại.

    **ĐỊNH DẠNG ĐẦU RA (BẮT BUỘC):**
    Host: [Lời thoại]
    Chuyên Gia: [Lời thoại]
    (Tiếp tục cho đến khi đủ ${targetWordCount} từ)

    KHÔNG sử dụng Markdown. KHÔNG dùng ngoặc đơn chú thích. Chỉ xuất nội dung hội thoại.
  `;

  try {
     const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Sử dụng Pro cho các tác vụ logic phức tạp và viết dài
      contents: [{ parts: [{ text: prompt }] }],
      config: { 
        tools: [{ googleSearch: {} }],
        temperature: 0.8, // Tăng sự sáng tạo để "bôi" nội dung tự nhiên
      }
    });

    return (response.text || "").replace(/\*\*/g, '').replace(/\*/g, '');
  } catch (error) {
    console.error("URL Script Gen Error:", error);
    throw new Error("Lỗi khi xử lý link: " + (error as Error).message);
  }
}

export interface GeneratedPersona {
  name: string;
  description: string;
  voiceId: string;
  speed: number;
  instruction: string;
}

export const createPersonaFromDescription = async (userDescription: string): Promise<GeneratedPersona> => {
  const ai = getAiClient();
  const prompt = `Tạo cấu hình AI Persona từ mô tả: "${userDescription}". Trả về JSON.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            voiceId: { type: Type.STRING, enum: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] },
            speed: { type: Type.NUMBER },
            instruction: { type: Type.STRING }
          },
          required: ["name", "description", "voiceId", "speed", "instruction"]
        }
      }
    });
    return JSON.parse(response.text || "{}") as GeneratedPersona;
  } catch (error) {
    console.error("Persona Generation Error:", error);
    throw new Error("Không thể tạo nhân vật.");
  }
};
