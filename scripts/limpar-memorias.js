import { limparMemoriasAntigas } from "../src/services/ariac.service";

(async () => {
  console.log("🧠 Iniciando limpeza de memórias antigas...");
  await limparMemoriasAntigas();
  process.exit(0);
})();
