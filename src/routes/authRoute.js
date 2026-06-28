import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { solicitarCodigoVerificacao } from '../services/codigoVerificacao.js';
import { redefinirSenha } from '../services/senhaRecuperada.js';

const prisma = new PrismaClient();
const regexSenha = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
const router = express.Router();

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );

router.post('/ativacao-conta', async (req, res) => {
  try {
    const { tokenAtivacao, senha } = req.body;

    const campoVazio = [
      { valor: tokenAtivacao, campoNome: 'Token de Ativação' },
      { valor: senha, campoNome: 'Senha' },
    ].find((campo) => !campo.valor?.trim());

    if (campoVazio) {
      return res.status(400).json({
        error: `O campo "${campoVazio.campoNome}" é obrigatório.`,
      });
    }

    const registroToken = await prisma.tokenAtivacao.findUnique({
      where: { token: tokenAtivacao.trim() },
    });

    if (!registroToken || registroToken.usado) {
      return res.status(400).json({ error: 'Token inválido.' });
    }

    if (registroToken.expira_em < new Date()) {
      return res.status(400).json({
        error: 'O token fornecido expirou. Por favor, tente novamente.',
      });
    }

    if (!regexSenha.test(senha)) {
      return res.status(400).json({
        error: 'A senha deve ter no mínimo 8 caracteres, com pelo menos 1 letra e 1 número.',
      });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    await prisma.usuario.update({
      where: { id: registroToken.usuario_id },
      data: {
        senha_hash,
        ativo: true,
      },
    });

    await prisma.tokenAtivacao.updateMany({
      where: { token: tokenAtivacao.trim() },
      data: { usado: true },
    });

    return res.status(200).json({
      message: 'Conta ativada com sucesso!',
    });
  } catch (error) {
    console.error('ERRO REAL AO ATIVAR:', error);

    return res.status(500).json({
      error: 'Erro ao ativar conta.',
      message: error.message,
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    const campoVazio = [
      { valor: email, campoNome: 'E-mail' },
      { valor: senha, campoNome: 'Senha' },
    ].find((campo) => !campo.valor?.trim());

    if (campoVazio) {
      return res.status(400).json({
        error: `O campo "${campoVazio.campoNome}" é obrigatório.`,
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.trim() },
    });

    if (!usuario) {
      return res.status(400).json({
        error: 'O E-mail não foi encontrado. Tente novamente.',
      });
    }

    if (!usuario.ativo) {
      return res.status(400).json({
        error: 'Conta ainda não ativada.',
      });
    }

    if (!usuario.senha_hash) {
      return res.status(400).json({
        error: 'Conta sem senha cadastrada. Ative sua conta primeiro.',
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(400).json({
        error: 'Senha incorreta. Tente novamente.',
      });
    }

    const [admin, professor, aluno] = await Promise.all([
      prisma.admin.findUnique({ where: { usuario_id: usuario.id } }),
      prisma.professor.findUnique({ where: { usuario_id: usuario.id } }),
      prisma.aluno.findUnique({ where: { usuario_id: usuario.id } }),
    ]);

    let tipo = 'USER';
    let admin_id = null;
    let professor_id = null;
    let aluno_id = null;

    if (admin) {
      tipo = 'ADMIN';
      admin_id = admin.id.toString();
    } else if (professor) {
      tipo = 'PROFESSOR';
      professor_id = professor.id.toString();
    } else if (aluno) {
      tipo = 'ALUNO';
      aluno_id = aluno.id.toString();
    }

    console.log('LOGIN USUARIO:', usuario.email);
    console.log('ADMIN:', !!admin);
    console.log('PROFESSOR:', !!professor);
    console.log('ALUNO:', !!aluno);
    console.log('TIPO RETORNADO:', tipo);

    const tokenPayload = {
      usuario_id: usuario.id.toString(),
      email: usuario.email,
      tipo,
      academia_id: usuario.academia_id?.toString() || null,
      admin_id,
      professor_id,
      aluno_id,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(200).json({
      token,
      tipo,
      ids: {
        admin_id,
        professor_id,
        aluno_id,
      },
      usuario: formatBigInt(usuario),
    });
  } catch (error) {
    console.error('Erro:', error);

    return res.status(500).json({
      error: 'Não é possível fazer o login.',
      message: error.message,
    });
  }
});

router.post('/solicitacao-codigo', async (req, res) => {
  try {
    const { telefone } = req.body;

    if (!telefone?.trim()) {
      return res.status(400).json({
        error: 'O campo "Telefone" é obrigatório.',
      });
    }

    const codigoVerificacao = await solicitarCodigoVerificacao(telefone);

    if (!codigoVerificacao.success) {
      return res.status(400).json({
        error: codigoVerificacao.error,
      });
    }

    return res.status(200).json({
      message: codigoVerificacao.message,
    });
  } catch (error) {
    console.error('Erro:', error);

    return res.status(500).json({
      error: 'Erro ao solicitar código de verificação.',
      message: error.message,
    });
  }
});

router.post('/redefinicao-senha', async (req, res) => {
  try {
    const { codigoVerificacao, novaSenha } = req.body;

    const campoVazio = [
      { valor: codigoVerificacao, campoNome: 'Código de Verificação' },
      { valor: novaSenha, campoNome: 'Senha' },
    ].find((campo) => !campo.valor?.trim());

    if (campoVazio) {
      return res.status(400).json({
        error: `O campo "${campoVazio.campoNome}" é obrigatório.`,
      });
    }

    if (!regexSenha.test(novaSenha)) {
      return res.status(400).json({
        error: 'A senha deve ter no mínimo 8 caracteres, com pelo menos 1 letra e 1 número.',
      });
    }

    const senhaRedefinida = await redefinirSenha(codigoVerificacao, novaSenha);

    if (!senhaRedefinida.success) {
      return res.status(400).json({
        error: senhaRedefinida.error,
      });
    }

    return res.status(200).json({
      message: senhaRedefinida.message,
    });
  } catch (error) {
    console.error('Erro:', error);

    return res.status(500).json({
      error: 'Erro ao redefinir a senha.',
      message: error.message,
    });
  }
});

export default router;