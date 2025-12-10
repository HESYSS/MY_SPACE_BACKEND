import { Injectable } from "@nestjs/common";
import { v2 } from "@google-cloud/translate";
import fs from "fs";

@Injectable()
export class TranslateService {
  private translator: v2.Translate;

  constructor() {
    // Загружаем ключ вручную
    const keyPath = process.env.GOOGLE_KEY_PATH || "src/config/my-google-key.json";
    const keyJson = JSON.parse(fs.readFileSync(keyPath, "utf8"));

    // Передаем ключ напрямую
    this.translator = new v2.Translate({
      credentials: keyJson,
      projectId: keyJson.project_id,
    });
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
