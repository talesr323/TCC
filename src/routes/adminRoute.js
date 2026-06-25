import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { cnpj as cnpjValidator, cpf as cpfValidator } from 'cpf-cnpj-validator';
import express from 'express';

const prisma = new PrismaClient();
const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //formato "usuario@dominio.com"
const regexSenha = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/; //min de 8 caracteres, com 1 letra e 1 número
const router = express.Router();

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Cadastrar administrador
router.post('/', async (req, res) => {
  try {
    const {
      nomeAcademia,
      cnpj,
      endereco,
      cep,
      cidade,
      estado,

      nome,
      sobrenome,
      email,
      cpf,
      telefone,
      senha,
    } = req.body;

    //1. Fazer a validação básica (verificar se o campo obrigatório foi preenchido)
    const validacaoBasica = [
      { valor: nomeAcademia, campoNome: 'Nome Fantasia' },
      { valor: cnpj, campoNome: 'CNPJ' },
      { valor: nome, campoNome: 'Nome' },
      { valor: email, campoNome: 'E-mail' },
      { valor: cpf, campoNome: 'CPF' },
      { valor: telefone, campoNome: 'Telefone' },
      { valor: senha, campoNome: 'Senha' },
    ];

    const campoVazio = validacaoBasica.find((campo) => {
      if (typeof campo.valor === 'string') return !campo.valor.trim();
    });

    if (campoVazio) {
      return res.status(400).json({
        error: `O campo "${campoVazio.campoNome}" é obrigatório.`,
      });
    }

    //1.2. Fazer a validação específica
    const validacaoEspecifica = [
      { isValid: cnpjValidator.isValid(cnpj), campoNome: 'CNPJ' },
      { isValid: regexEmail.test(email), campoNome: 'E-Mail' },
      { isValid: cpfValidator.isValid(cpf), campoNome: 'CPF' },
      { isValid: regexSenha.test(senha), campoNome: 'Senha' },
    ];

    const campoInvalido = validacaoEspecifica.find((campoValor) => !campoValor.isValid);

    if (campoInvalido) {
      return res.status(400).json({ error: `O campo "${campoInvalido.campoNome}" é inválido.` });
    }

    //1.2. Verificar se o telefone já foi cadastrado
    const telefoneExiste = await prisma.usuario.findFirst({
      where: {
        telefone: {
          equals: telefone.trim(),
        },
      },
    });

    if (telefoneExiste) {
      return res.status(400).json({
        error: 'Esse telefone já foi cadastrado.',
      });
    }

    //2. Verificar se o sistema já foi inicializado
    const adminExiste = await prisma.admin.findFirst();

    if (adminExiste) {
      return res.status(400).json({ error: 'O sistema já foi inicializado.' });
    }

    const senha_hash = await bcrypt.hash(senha, 10); //Gerar o hash da senha

    //3. Criar o administrador
    const novaAcademia = await prisma.academia.create({
      data: {
        nome: nomeAcademia,
        cnpj,
        endereco,
        cep,
        cidade,
        estado,
      },
    });

    const novoAdmin = await prisma.usuario.create({
      data: {
        nome: `${nome} ${sobrenome}`,
        email,
        cpf,
        telefone,
        senha_hash,
        ativo: true,
        academia_id: novaAcademia.id,
      },
    });

    await prisma.admin.create({
      data: {
        usuario_id: novoAdmin.id,
      },
    });

    return res.status(201).json({
      message: 'Sistema inicializado com sucesso',
      usuario: novoAdmin,
      academia: novaAcademia,
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao inicializar o sistema.',
      message: error.message,
    });
  }
});

//Checar a inicialização do aplicativo
router.get('/inicializado', async (req, res) => {
  try {
    const admin = await prisma.admin.findFirst({
      select: {
        id: true,
      },
    });

    return res.json({
      inicializado: !!admin,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao verificar inicialização',
    });
  }
});

export default router;
