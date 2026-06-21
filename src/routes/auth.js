import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const regexSenha = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/; //min de 8 caracteres, com 1 letra e 1 número
const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//🔓 Ativar conta
router.post('/ativacao-conta', async (req, res) => {
  try {
    const { token, senha } = req.body;

    //1. Fazer a validação básica
    if (!token?.trim()) {
      return res.status(400).json({ error: "O campo 'Token' é obrigatório." });
    }

    if (!senha?.trim()) {
      return res.status(400).json({ error: "O campo 'Senha' é obrigatório." });
    } else if (!regexSenha.test(senha)) {
      return res.status(400).json({ error: 'Senha inválida.' });
    }

    //2. Fazer a validação do token
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

    return res.status(200).json({ message: 'Conta ativada com sucesso!' });
  } catch (error) {
    console.error('Erro ao ativar a conta:', error);
    return res.status(500).json({ error: 'Falha na ativação da conta. Tente novamente.' });
  }
});

//🔑 Login do usuário
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    //1. Fazer a validação básica
    if (!email?.trim() || !senha?.trim()) {
      return res.status(400).json({ error: "Os campos 'Email' e 'Senha' são obrigatórios." });
    }

    //2. Fazer a busca do usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.trim() },
    });

    //3. Fazer a validação de segurança básicas
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!usuario || !senhaValida) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos. Tente novamente.' });
    }

    //4. Fazer a descoberta dinâmica do tipo de usuário (admin, aluno ou professor)
    let tipo = 'USER';
    let papelId = null;

    //Busca paralelas otimizadas (só serão disparadas após a senha estar correta)
    const [admin, professor, aluno] = await Promise.all([
      prisma.admin.findUnique({ where: { usuario_id: usuario.id } }),
      prisma.professor.findUnique({ where: { usuario_id: usuario.id } }),
      prisma.aluno.findUnique({ where: { usuario_id: usuario.id } }),
    ]);

    if (admin) {
      tipo = 'ADMIN';
      papelId = admin.id;
    } else if (professor) {
      tipo = 'PROFESSOR';
      papelId = professor.id;
    } else if (aluno) {
      tipo = 'ALUNO';
      papelId = aluno.id;
    }

    //5. Gerar o Token JWT
    const tokenPayload = {
      usuario_id: usuario.id.toString(),
      admin_id: tipo === 'ADMIN' ? papelId?.toString() : null,
      professor_id: tipo === 'PROFESSOR' ? papelId?.toString() : null,
      aluno_id: tipo === 'ALUNO' ? papelId?.toString() : null,
      email: usuario.email,
      tipo,
      academia_id: usuario.academia_id.toString(),
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

    //6. Obter resposta de sucesso
    return res.json({
      token,
      tipo,
      usuario: formatBigInt(usuario),
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Falha interna no login.' });
  }
});

export default router;
