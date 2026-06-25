import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function redefinirSenha(codigoVerificacao, senhaNova) {
  try {
    // 1. Buscar o código de verificacao
    const codigoRecebido = await prisma.codigoVerificacao.findUnique({
      where: { token: codigoVerificacao },
    });

    // 2. Validar se o código existe e se não foi marcado como usado
    if (!codigoRecebido || codigoRecebido.usado) {
      return { success: false, error: 'Código de recuperação inválido.' };
    }

    // 3. Validar se o código expirou
    if (new Date() > codigoRecebido.expira_em) {
      return { success: false, error: 'Este código já expirou. Solicite um novo.' };
    }

    // 4. Criptografar a nova senha usando o bcryptjs
    const hashedPassword = await bcrypt.hash(senhaNova, 10);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: codigoVerificacao.usuario_id },
        data: { senha_hash: hashedPassword },
      }),

      prisma.codigoVerificacao.update({
        where: { token: codigoVerificacao },
        data: { usado: true },
      }),
    ]);

    return { success: true, message: 'Senha alterada com sucesso!' };
  } catch (error) {
    console.error('Erro:', error);
    return { success: false, error: 'Erro interno no sistema.' };
  }
}
