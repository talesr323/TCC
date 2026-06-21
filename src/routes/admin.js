import bcrypt from 'bcrypt';
import { cnpj as cnpjValidator, cpf as cpfValidator } from 'cpf-cnpj-validator';
import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //formato "usuario@dominio.com"
const regexSenha = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/; //min de 8 caracteres, com 1 letra e 1 número
const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Cadastrar admin/academia
router.post('/', async (req, res) => {
  try {
    const {
      //academia
      nomeAcademia,
      cnpj,
      endereco,
      cep,
      cidade,
      estado,

      //admin
      nome,
      sobrenome,
      email,
      cpf,
      telefone,
      senha,
    } = req.body;

    //1. Fazer a validação básica
    if (!nomeAcademia?.trim()) {
      return res.status(400).json({ error: "O campo 'Nome Fantasia' é obrigatório." });
    }

    if (!cnpjValidator.isValid(cnpj)) {
      return res.status(400).json({ error: 'CNPJ inválido.' });
    }

    if (!nome?.trim()) {
      return res.status(400).json({ error: "O campo 'Nome' é obrigatório." });
    }

    if (!email?.trim()) {
      return res.status(400).json({ error: "O campo 'E-mail' é obrigatório." });
    } else if (!regexEmail.test(email)) {
      return res.status(400).json({ error: "Campo 'E-mail inválido." });
    }

    if (!cpfValidator.isValid(cpf)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    if (!senha?.trim()) {
      return res.status(400).json({ error: "O campo 'Senha' é obrigatório." });
    } else if (!regexSenha.test(senha)) {
      return res.status(400).json({ error: 'Senha inválida.' });
    }

    //2. Verificar se o sistema já foi inicializado
    const adminExiste = await prisma.admin.findFirst();

    if (adminExiste) {
      return res.status(400).json({ error: 'O sistema já foi inicializado.' });
    }

    const senha_hash = await bcrypt.hash(senha, 10); //🔒 Gerar o hash da senha

    //3. Iniciar uma transação (confirmar as alterações ou desfazer tudo caso dê erro)
    const resultadoTransacao = await prisma.$transaction(async (tx) => {
      const novaAcademia = await tx.academia.create({
        data: {
          nome: nomeAcademia,
          cnpj,
          endereco,
          cep,
          cidade,
          estado,
        },
      });

      const novoAdmin = await tx.usuario.create({
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

      await tx.admin.create({
        data: {
          usuario_id: novoAdmin.id,
        },
      });

      return { usuario: novoAdmin, academia: novaAcademia };
    });

    return res.status(201).json({
      message: 'Sistema inicializado com sucesso',
      usuario: formatBigInt(resultadoTransacao.usuario),
      academia: formatBigInt(resultadoTransacao.academia),
    });
  } catch (error) {
    console.error('Erro ao inicializar sistema:', error);
    return res.status(500).json({ error: 'Falha interna na inicialização do sistema.' });
  }
});

export default router;
