
import * as pdfjsLib from 'pdfjs-dist';

// Cấu hình worker. Sử dụng phiên bản tương thích với importmap trong index.html
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Sử dụng try-catch cho quá trình load document để bắt lỗi file hỏng
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Lọc và làm sạch văn bản tốt hơn
      const pageText = textContent.items
        .map((item: any) => item.str)
        .filter((str: string) => str.trim().length > 0) // Loại bỏ chuỗi rỗng
        .join(' ')
        .replace(/\s+/g, ' '); // Chuẩn hóa khoảng trắng thừa
      
      // Thêm đánh dấu trang để AI nhận biết ngữ cảnh tốt hơn
      if (pageText.length > 0) {
        fullText += `[Trang ${i}]\n${pageText}\n\n`;
      }
    }

    if (fullText.trim().length === 0) {
        throw new Error("File PDF không chứa văn bản dạng text (có thể là ảnh scan).");
    }

    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Không thể đọc file PDF. Vui lòng kiểm tra định dạng file hoặc thử file khác.');
  }
}
