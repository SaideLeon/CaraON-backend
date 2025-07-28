import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const createOrder = async (req, res) => {
  const { userId, total } = req.body;
  try {
    // Cria o pedido
    const order = await prisma.order.create({
      data: { userId, total },
    });
    res.status(201).json(order);
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Falha ao criar o pedido.' });
  }
};

const listOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany();
    res.status(200).json(orders);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ error: 'Falha ao listar os pedidos.' });
  }
};

const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error('Erro ao obter pedido:', error);
    res.status(500).json({ error: 'Falha ao obter o pedido.' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });
    res.status(200).json(order);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ error: 'Falha ao atualizar o status do pedido.' });
  }
};

const handlePaymentNotification = async (req, res) => {
  const { transactionId, status, amount, provider, ...notificationData } = req.body;
  console.log(`🔔 Notificação de pagamento recebida de ${provider || 'desconhecido'}:`, req.body);

  try {
    // A notificação pode se referir a um MobileTransaction ou a um Payment diretamente.
    // Vamos priorizar a busca por uma transação móvel, que é mais específica.
    let mobileTransaction = await prisma.mobileTransaction.findFirst({
        where: {
            OR: [
                { externalReference: transactionId },
                { internalReference: transactionId },
            ]
        }
    });

    let payment;

    if (mobileTransaction) {
        // Encontramos uma transação móvel, agora encontramos o pagamento associado
        if (!mobileTransaction.paymentId) {
            console.warn(`Transação móvel ${mobileTransaction.id} recebida sem paymentId associado.`);
            // Ainda assim, vamos registrar o callback
            await prisma.transactionCallback.create({
                data: {
                    transactionId: mobileTransaction.id,
                    callbackData: req.body,
                    isProcessed: false, // Marcar como não processado pois não há pagamento
                }
            });
            return res.status(200).json({ message: 'Notificação para transação móvel sem pagamento associado.' });
        }
        payment = await prisma.payment.findUnique({ where: { id: mobileTransaction.paymentId } });

        // Atualizar a transação móvel
        await prisma.mobileTransaction.update({
            where: { id: mobileTransaction.id },
            data: {
                status: status === 'PAID' ? 'COMPLETED' : 'FAILED',
                operatorResponse: notificationData,
                completedAt: new Date(),
            }
        });

        // Registrar o callback
        await prisma.transactionCallback.create({
            data: {
                transactionId: mobileTransaction.id,
                callbackData: req.body,
                isProcessed: true,
                processedAt: new Date(),
            }
        });

    } else {
        // Se não for uma transação móvel, tentamos encontrar um pagamento genérico
        payment = await prisma.payment.findFirst({
            where: { transactionId: transactionId }
        });
    }

    if (!payment) {
      console.warn(`Pagamento com transactionId ${transactionId} não encontrado.`);
      return res.status(200).json({ message: 'Notificação recebida, mas pagamento correspondente não encontrado.' });
    }

    // Atualizar o status do pagamento
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: status === 'PAID' ? 'PAID' : 'FAILED',
        paidAt: status === 'PAID' ? new Date() : null,
        failureReason: status !== 'PAID' ? JSON.stringify(notificationData) : null,
      }
    });

    // Se o pagamento foi bem-sucedido, atualizar o status do pedido
    if (updatedPayment.status === 'PAID') {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'PAID',
          status: 'PROCESSING',
        }
      });
      console.log(`✅ Pedido ${payment.orderId} atualizado para PAGO e EM PROCESSAMENTO.`);
    }

    res.status(200).json({ message: 'Notificação processada com sucesso.' });

  } catch (error) {
    console.error('Erro ao processar notificação de pagamento:', error);
    res.status(500).json({ error: 'Erro interno ao processar a notificação.' });
  }
};

export default {
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
  handlePaymentNotification,
};
