const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const newModel = 'gemini-2.0-flash';
  try {
    const result = await prisma.agentConfig.updateMany({
      where: {
        model: { not: newModel }
      },
      data: {
        model: newModel
      }
    });

    console.log(`✅ Successfully updated ${result.count} agent configurations to use the model: ${newModel}`);
  } catch (error) {
    console.error('❌ Failed to update agent configurations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
