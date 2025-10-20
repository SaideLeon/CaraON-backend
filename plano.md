Perfeito, Saíde — encontrei no código que o teu backend **já implementa o endpoint** `POST /api/v1/knowledge/upload-pdf/:userId/:instanceId`, e ele usa o controlador `knowledge.controller.js`, que por sua vez chama a função `uploadPdfToKnowledgeBase` no `ariac.service.js` (exatamente onde o erro 400 ocorre).

💡 **Problema:**
O `multer` configurado nessa rota usa `memoryStorage()`, o que significa que o arquivo está sendo mantido **em memória (Buffer)**, não salvo em disco.
Mas a função `uploadPdfToKnowledgeBase` que a Ariac espera precisa de um **arquivo físico** (`fs.createReadStream(pdfPath)`).

---

## ✅ Solução recomendada

Modifique **`knowledge.controller.js`** e **`ariac.service.js`** para compatibilizar com o formato exigido pela Ariac (`multipart/form-data` com `file=@...`).

---

### 1. Atualize `src/controllers/knowledge.controller.js`

Troque o uso do buffer em memória por um arquivo temporário:

```js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { uploadPdfToKnowledgeBase } from "../services/ariac.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function uploadPdf(req, res) {
  try {
    const { userId, instanceId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    // Cria um caminho temporário para salvar o arquivo
    const tempDir = path.join(__dirname, "../../tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, file.originalname);
    fs.writeFileSync(tempPath, file.buffer);

    // Chama o serviço Ariac
    const result = await uploadPdfToKnowledgeBase(userId, instanceId, tempPath);

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
```

---

### 2. Ajuste `src/services/ariac.service.js`

Garanta que o `FormData` está sendo construído corretamente:

```js
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const ARIAC_BASE_URL = "https://agent.cognick.qzz.io/api";
const CSRF_TOKEN = "ONDoEfAzbRyOn3u0WTGImU5NfE2un2x0IFHWTl1DPer1yVt6kXGGZEjfqmulgoqX";

export async function uploadPdfToKnowledgeBase(userId, instanceId, pdfPath) {
  const url = `${ARIAC_BASE_URL}/knowledge/upload-pdf/${userId}/${instanceId}`;

  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(pdfPath), {
      filename: pdfPath.split("/").pop(),
      contentType: "application/pdf",
    });

    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        "X-CSRFTOKEN": CSRF_TOKEN,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return response.data;
  } catch (error) {
    console.error("Erro ao enviar PDF para Ariac:", error.response?.data || error.message);
    throw error;
  }
}
```

---

### 🧪 Teste prático

Execute o upload com:

```bash
curl -X POST \
  -H "Authorization: Bearer <seu_token>" \
  -F "file=@Manual.pdf" \
  http://localhost:3030/api/v1/knowledge/upload-pdf/saide236/departamento12345
```

Se tudo estiver certo, você verá:

```json
{
  "info": "file 'Manual.pdf' saved at '/app/data/pdfs/saide236/departamento12345/Manual.pdf'"
}
```

---

Se quiser, posso te mostrar a correção exata **com base no código real da tua função `uploadPdfToKnowledgeBase` (linha 129 do arquivo)** — quer que eu abra e corrija essa função diretamente?
