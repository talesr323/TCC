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

//Ativar conta
router.post('/ativacao-conta', async (req, res) => {
  try {
    const { tokenAtivacao, senha } = req.body;

    //1. Fazer a validação básica (verificar se o campo obrigatório foi preenchido)
    const validacaoBasica = [
      { valor: tokenAtivacao, campoNome: 'Token de Ativação' },
      { valor: senha, campoNome: 'Senha' },
    ];

    const campoVazio = validacaoBasica.find((campo) => {
      if (typeof campo.valor === 'string') return !campo.valor.trim();
    });

    if (campoVazio) {
      return res.status(400).json({
        error: 'Falha na ativação.',
        message: `O campo "${campoVazio.nome}" é obrigatório.`,
      });
    }

    //2. Fazer a validação do token de ativação
    const registroToken = await prisma.tokenAtivacao.findUnique({
      where: { token },
    });

    if (!registroToken || registroToken.usado) {
      return res.status(400).json({
        error: 'Falha na validação do token.',
        message: 'Token de autenticação inválido ou corrompido.',
      });
    } else if (registroToken.expira_em < new Date()) {
      return res.status(400).json({
        error: 'Falha na validação do token.',
        message: 'O token fornecido expirou. Por favor, tente novamente',
        expiredAt: error.expiredAt,
      });
    }

    //3. Fazer a validação da senha cadastrada
    if (!regexSenha.test(senha)) {
      return res.status(400).json({
        error: 'Falha na validação da senha cadastrada.',
        message: 'Senha não atende aos requisitos de segurança.',
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

    return res.status(200).json({ message: 'Conta ativada com sucesso!' });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao ativar conta.',
      message: error.message,
    });
  }
});

//Login do usuário
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    //1. Fazer a validação básica
    const camposValidacao = [
      { valor: email, campoNome: 'E-mail' },
      { valor: senha, campoNome: 'Senha' },
    ];

    const campoVazio = camposValidacao.find((campo) => !campo.valor?.trim());

    if (campoVazio) {
      return res.status(400).json({
        error: 'Falha no login.',
        message: `O campo "${campoVazio.campoNome}" é obrigatório.`,
      });
    }

    //2. Fazer a busca do usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.trim() },
    });

    //3. Fazer a validação de segurança básicas
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!usuario || !senhaValida) {
      return res.status(400).json({
        error: 'Login negado.',
        message: 'Credenciais inválidas. Tente novamente.',
      });
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
      email: usuario.email,
      academia_id: usuario.academia_id.toString(),
      [`${tipo.toLowerCase()}_id`]: papelId?.toString() || null, //Cria dinamicamente a propriedade
    };

    ['admin_id', 'professor_id', 'aluno_id'].forEach((key) => {
      if (!(key in tokenPayload)) tokenPayload[key] = null; //Garante que as outras chaves de ID existam como null
    });

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    //6. Obter resposta de sucesso
    return res.json({
      token,
      tipo,
      usuario: formatBigInt(usuario),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro no login.',
      message: error.message,
    });
  }
});

export default router;
