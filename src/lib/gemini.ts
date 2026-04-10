import { GoogleGenAI } from "@google/genai";

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function breakdownTask(taskTitle: string) {
  if (!ai) {
    console.warn("Gemini API Key is missing. AI features are disabled.");
    return [];
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bạn là một học giả thông thái trong một thư viện cổ. Bạn có kinh nghiệm quản lý dự án và nghề nghiệp của một chuyên gia hơn 20 năm kinh nghiệm. Hãy giúp tôi chia nhỏ mục tiêu học tập sau đây thành 5-7 bước cụ thể, khả thi và mang tính thực tiễn cao: "${taskTitle}". 
      Hãy trả về kết quả dưới dạng danh sách các chuỗi (JSON array of strings), không kèm theo văn bản giải thích nào khác.`,
    });

    const text = response.text || "";
    
    // Clean up the response to ensure it's valid JSON
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as string[];
    }
    return [];
  } catch (error) {
    console.error("AI Breakdown Error:", error);
    return [];
  }
}

export async function decomposeGoal(goalTitle: string, level: string, targetValue: number, unit: string) {
  if (!ai) {
    console.warn("Gemini API Key is missing. AI features are disabled.");
    return null;
  }
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bạn là một vị sư phụ thông thái. Đệ tử có một mục tiêu lớn: "${goalTitle}" với giá trị mục tiêu là ${targetValue} ${unit} cho cấp độ ${level}.
      Hôm nay là ngày ${currentDate.toLocaleDateString('vi-VN')}.
      
      Hãy giúp đệ tử chia nhỏ mục tiêu này thành các cấp độ thấp hơn:
      - Nếu là Năm: chia thành các Quý còn lại trong năm, sau đó trong mỗi Quý chia thành các Tháng, trong mỗi Tháng chia thành các Tuần.
      - Nếu là Quý: chia thành các Tháng còn lại trong Quý, sau đó trong mỗi Tháng chia thành các Tuần.
      - Nếu là Tháng: chia thành các Tuần còn lại trong Tháng.
      
      YÊU CẦU QUAN TRỌNG:
      1. Chỉ đề xuất cho các khoảng thời gian TỪ HIỆN TẠI TRỞ ĐI.
      2. Trả về một mảng JSON các đối tượng phân cấp.
      3. Mỗi đối tượng PHẢI có:
         - "title": tên giai đoạn (ví dụ: "Quý 2: Tăng tốc")
         - "level": "year" | "quarter" | "month" | "week"
         - "timeValue": giá trị thời gian (ví dụ: "2026", "2", "4", "1")
         - "targetValue": giá trị mục tiêu (PHẢI là số nguyên dương, làm tròn, không có số thập phân)
         - "description": lời khuyên ngắn gọn
         - "children": mảng các đối tượng con theo cấp bậc thấp hơn.
      4. Tổng targetValue của các con PHẢI bằng targetValue của cha.
      5. Chỉ trả về mảng JSON.`,
    });
    
    let text = response.text || "";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("JSON Parse Error:", e, "Text:", jsonMatch[0]);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error("AI Goal Decomposition Error:", error);
    return null;
  }
}
