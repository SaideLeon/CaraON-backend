import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as ariacService from '../services/ariac.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadPdf = async (req, res) => {
  try {
    const { userId, instanceId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      return res.status(404).json({ message: 'Instance not found.' });
    }

    if (instance.userId !== userId) {
      return res.status(403).json({ message: 'Instance does not belong to the specified user.' });
    }

    // Cria um caminho temporário para salvar o arquivo
    const tempDir = path.join(__dirname, "../../tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, file.originalname);
    fs.writeFileSync(tempPath, file.buffer);

    // Chama o serviço Ariac
    const result = await ariacService.uploadPdfToKnowledgeBase(userId, instanceId, tempPath);

    // Remove o arquivo temporário
    fs.unlinkSync(tempPath);

    res.status(200).json({
      message: "PDF enviado com sucesso para a base de conhecimento Ariac.",
      result,
    });
  } catch (error) {
    console.error("Erro no upload de PDF:", error.response?.data || error);
    res.status(400).json({
      error: "Falha ao enviar PDF para Ariac.",
      details: error.response?.data || error.message,
    });
  }
}

export default {
  uploadPdf,
};