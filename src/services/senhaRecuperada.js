import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function redefinirSenha(codigoVerificacao, senhaNova) {
  try {
    const codigoRecebido = await prisma.codigoVerificacao.findFirst({
      where: {
        codigo_verificacao: codigoVerificacao,
        usado: false,
      },
    });

    if (!codigoRecebido) {
      return { success: false, error: 'Código de recuperação inválido.' };
    }

    if (new Date() > codigoRecebido.expira_em) {
      return { success: false, error: 'Este código já expirou. Solicite um novo.' };
    }

    const hashedPassword = await bcrypt.hash(senhaNova, 10);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: codigoRecebido.usuario_id },
        data: { senha_hash: hashedPassword },
      }),

      prisma.codigoVerificacao.update({
        where: { id: codigoRecebido.id },
        data: { usado: true },
      }),
    ]);

    return { success: true, message: 'Senha alterada com sucesso!' };
  } catch (error) {
    console.error('Erro:', error);
    return { success: false, error: 'Erro interno no sistema.' };
  }
}