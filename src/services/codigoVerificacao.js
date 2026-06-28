import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
import twilio from 'twilio';

const prisma = new PrismaClient();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function solicitarCodigoVerificacao(telefone) {
  try {
    //1. Buscar o usuário pelo telefone cadastrado
    const usuario = await prisma.usuario.findFirst({
      where: { telefone: telefone },
    });

    if (!usuario) {
      throw new Error('Usuário não encontrado.');
    }

    //2. Gerar um código de verificação
    const codigoGerado = crypto.randomInt(100000, 999999).toString();
    const dataExpiracao = new Date(Date.now() + 30 * 60 * 1000); //Define a expiração para 30 minutos

    await prisma.codigoVerificacao.create({
      data: {
        codigo_verificacao: codigoGerado,
        expira_em: dataExpiracao,
        usuario_id: usuario.id,
      },
    });

    //3. Configurar e enviar a mensagem pelo Twilio Whatsapp
    const numeroDestinatario = `whatsapp:+${telefone.replace(/\D/g, '')}`;
    const numeroRemetente = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

    const mensagemTexto = `Olá, ${usuario.nome}. Seu código de verificação é *${codigoGerado}*. Ele expira em 30 minutos.`;

    const messageResponse = await twilioClient.messages.create({
      from: numeroRemetente,
      to: numeroDestinatario,
      body: mensagemTexto,
    });

    return {
      success: true,
      message: 'Código de recuperação enviado com sucesso via WhatsApp!',
      messageSid: messageResponse.sid,
    };
  } catch (error) {
    console.error('Erro:', error);
    return { success: false, error: error.message };
  }
}
