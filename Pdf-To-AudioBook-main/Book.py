
import pyttsx3
from PyPDF2 import PdfReader

# Open PDF
book = open('report.pdf', 'rb')
pdfReader = PdfReader(book)

# Number of pages
pages = len(pdfReader.pages)
print(pages)

# Text-to-speech
speaker = pyttsx3.init()
for num in range(0, pages):
    page = pdfReader.pages[num]
    text = page.extract_text()
    speaker.say(text)
    speaker.runAndWait()
# page=pdfReader.pages[8]
# text=page.extract_text()
# speaker.say(text)
# # speaker.say('Look Mama, I can talk!')
# speaker.runAndWait()

