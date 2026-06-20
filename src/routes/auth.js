import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//🔑 Ativar conta
router.post('/ativacao-conta', async (req, res) => {
  try {
    const { token, senha } = req.body;

    if (!token || token.trim() === '') {
      return res.status(400).json({ error: "O campo 'Token' é obrigatório." });
    }

    if (!senha || senha.trim() === '') {
      return res.status(400).json({ error: "O campo 'Senha' é obrigatório." });
    }

    // Verifica se a senha tem menos de 8 caracteres
    if (senha.length < 8) {
      return res.status(400).json({ error: 'A senha deve conter no mínimo 8 caracteres.' });
    }

    //✅ Validação token
    const registroToken = await prisma.tokenAtivacao.findUnique({
      where: { token },
    });

    if (!registroToken || registroToken.usado) {
      return res.status(400).json({ error: 'Token inválido.' });
    } else if (registroToken.expira_em < new Date()) {
      return res.status(400).json({ error: 'Token expirado. Tente novamente.' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    await prisma.usuario.update({
      where: { id: registroToken.usuario_id },
      data: {
        senha_hash,
        ativo: true,
      },
    });

    // Retorno de sucesso (ajuste conforme a necessidade do seu app)
    return res.status(200).json({ message: 'Conta ativada com sucesso!' });
  } catch (error) {
    console.error('ERRO NA ATIVAÇÃO:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//🔑 Login do usuário
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    //✅ Validação campos obrigatórios
    if (!email || email.trim() === '') {
      return res.status(400).json({ error: "O campo 'E-mail' é obrigatório." });
    }

    if (!senha || senha.trim() === '') {
      return res.status(400).json({ error: "O campo 'Senha' é obrigatório." });
    }

    //✅ Validação campos obrigatórios
    const login = await prisma.usuario.findUnique({
      where: { email },

      include: {
        admin: true,
        professor: true,
        aluno: true,
      },
    });

    if (!login) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    if (!login.ativo) {
      return res.status(400).json({ error: 'Conta do usuário inativa.' });
    }

    if (!login.senha_hash) {
      return res.status(400).json({ error: 'A senha não foi definida.' });
    }

    if (!login.academia_id) {
      return res.status(400).json({ error: 'Usuário não vinculado à academia.' });
    }

    //✅ Validação da senha
    const loginSenha = await bcrypt.compare(senha, login.senha_hash);

    if (!loginSenha) {
      return res.status(400).json({ error: 'Senha inválida.' });
    }

    let tipo = 'USER';

    if (login.admin) tipo = 'ADMIN';
    else if (login.professor) tipo = 'PROFESSOR';
    else if (login.aluno) tipo = 'ALUNO';

    //Correção do token
    const token = jwt.sign(
      {
        usuario_id: login.id.toString(),
        admin_id: login.admin?.id?.toString() || null,
        professor_id: login.professor?.id?.toString() || null,
        aluno_id: login.aluno?.id?.toString() || null,
        email: login.email,
        tipo,
        academia_id: login.academia_id.toString(),
      },

      process.env.JWT_SECRET,

      {
        expiresIn: '1d',
      },
    );

    return res.json({
      token,
      tipo,
      usuario: formatBigInt(login),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
