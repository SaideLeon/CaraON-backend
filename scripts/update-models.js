import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // O nome completo e correto do modelo
  const newModel = 'googleai/gemini-2.0-flash'; 

  try {
    console.log(`Iniciando a atualização dos modelos dos agentes para '${newModel}'...`);

    // Atualiza a configuração de todos os tipos de agentes (ROUTER, PARENT, CHILD)
    const result = await prisma.agentConfig.updateMany({
      where: {
        // Atualiza qualquer configuração que NÃO seja o novo modelo
        model: { 
          not: newModel 
        }
      },
      data: {
        model: newModel
      }
    });

    if (result.count > 0) {
      console.log(`✅ Sucesso! ${result.count} configurações de agentes foram atualizadas para usar o modelo: ${newModel}`);
    } else {
      console.log('ℹ️ Nenhuma configuração de agente precisou ser atualizada. Todos já estão usando o modelo correto.');
    }

  } catch (error) {
    console.error('❌ Falha ao atualizar as configurações dos agentes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Desconectado do banco de dados.');
  }
}

main();
