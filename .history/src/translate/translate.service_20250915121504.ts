import { Injectable } from "@nestjs/common";
import { v2 } from "@google-cloud/translate";

@Injectable()
export class TranslateService {
  private translator: v2.Translate;

  constructor() {
    this.translator = new v2.Translate();
  }

  async translateText(text: string, targetLang = "en"): Promise<string> {
    if (!text) return "";
    try {
      const [translation] = await this.translator.translate(text, targetLang);
      return translation;
    } catch (err: any) {
      console.error("Ошибка перевода:", err.message);
      return text; // fallback: вернём оригинал
    }
  }
}
