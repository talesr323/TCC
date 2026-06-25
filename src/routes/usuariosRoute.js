import admin from '../middlewares/admin.js';
import auth from '../middlewares/auth.js';
import bycrypt from 'bcryptjs';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import crypto from 'crypto';
import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const regexCref = /^\d{6}-[A-Z]{1,2}\/[A-Z]{2}$/;
const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const regexSenha = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/; //min de 8 caracteres, com 1 letra e 1 número
const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Cadastrar usuário (com token, mas sem senha)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { nome, email, cpf, tipo, cref, telefone } = req.body;

    //1. Fazer a validação básica (verificar se o campo obrigatório foi preenchido)
    const validacaoBasica = [
      { valor: nome, campoNome: 'Nome' },
      { valor: email, campoNome: 'E-mail' },
      { valor: cpf, campoNome: 'CPF' },
      { valor: tipo, campoNome: 'Tipo' },
      { valor: telefone, campoNome: 'Telefone' },
    ];

    const campoVazio = validacaoBasica.find((campo) => {
      if (typeof campo.valor === 'string') return !campo.valor.trim();
    });

    if (campoVazio) {
      return res.status(400).json({
        error: 'Cadastro negado.',
        message: `O campo "${campoVazio.campoNome}" é obrigatório.`,
      });
    }

    //1.1. Fazer a validação do CPF
    if (!cpfValidator.isValid(cpf)) {
      return res.status(400).json({
        error: 'Cadastro negado.',
        message: 'CPF inválido.',
      });
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

    //2. Fazer a validação do tipo de usuário
    if (!['ALUNO', 'PROFESSOR'].includes(tipo)) {
      return res.status(400).json({
        error: 'Cadastro negado.',
        message: 'O tipo tem que ser "ALUNO" ou "PROFESSOR".',
      });
    }

    //2.1. Caso o tipo seja "PROFESSOR", fazer a validação do CREF
    if (tipo === 'PROFESSOR' && !cref?.trim()) {
      return res.status(400).json({
        error: 'Cadastro negado.',
        message: 'O campo "CREF" é obrigatório.',
      });
    } else if (tipo === 'PROFESSOR' && !regexCref.test(cref)) {
      return res.status(400).json({
        error: 'Cadastro negado.',
        message: 'CREF inválido.',
      });
    }

    //3. Criar o perfil do usuário
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        cpf,
        telefone,
        ativo: false,
        academia_id: req.usuario.academia_id,
      },
    });

    let perfil = null;

    if (tipo === 'PROFESSOR') {
      perfil = await prisma.professor.create({
        data: { usuario_id: usuario.id, cref },
      });
    }

    if (tipo === 'ALUNO') {
      perfil = await prisma.aluno.create({
        data: { usuario_id: usuario.id },
      });
    }

    //4. Gerar token de ativação
    const tokenAtivacao = crypto.randomBytes(32).toString('hex');

    await prisma.tokenAtivacao.create({
      data: {
        usuario_id: usuario.id,
        token: tokenAtivacao,
        expira_em: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    return res.status(201).json({
      message: 'Usuário criado com sucesso.',
      token: tokenAtivacao,
      usuario: formatBigInt(usuario),
      perfil: formatBigInt(perfil),
    });
  } catch (error) {
    console.error('Erro:', error);

    if (error.code === 'P2002') {
      let campo = error.meta?.target;
      if (Array.isArray(campo)) campo = campo[0];

      if (typeof campo === 'string') {
        if (campo.includes('email')) campo = 'Email';
        else if (campo.includes('cpf')) campo = 'CPF';
        else if (campo.includes('cref')) campo = 'CREF';
      }

      return res.status(400).json({
        error: 'Não é possível cadastrar usuário:',
        message: `${campo} já cadastrado.`,
      });
    }

    return res.status(500).json({
      error: 'Erro no cadastro do usuário.',
      message: error.message,
    });
  }
});

//Listar todos os usuários (com opção de filtrar por tipo)
router.get('/tipo/', auth, async (req, res) => {
  try {
    const { tipo } = req.query;
    const { academia_id } = req.usuario; //Garante que só busca usuários da mesma academia do adm logado

    //1. Validar o filtro se for enviado.
    if (tipo && !['ALUNO', 'PROFESSOR'].includes(tipo.toUpperCase())) {
      return res.status(400).json({ error: "O filtro 'Tipo' deve ser ALUNO ou PROFESSOR." });
    }

    //2. Construir a query base filtrando pela academia do usuário logado
    const WHERE_CLAUSE = {
      academia_id: academia_id,
    };

    //3. Se houver filtro de tipo, filtrar trazendo apenas quem tem aquele perfil vinculado
    if (tipo) {
      const tipoFormatado = tipo.toUpperCase();
      // Garantir que a relação com Aluno/Professor exista
      if (tipoFormatado === 'ALUNO') {
        WHERE_CLAUSE.aluno = { isNot: null };
      } else if (tipoFormatado === 'PROFESSOR') {
        WHERE_CLAUSE.professor = { isNot: null };
      }
    }

    //4. Buscar usuários no Prisma trazendo os perfis relacionados
    const usuarios = await prisma.usuario.findMany({
      where: WHERE_CLAUSE,
      include: {
        aluno: true,
        professor: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    //5. Retornar a lista tratada para evitar problemas com BigInt
    return res.status(200).json(formatBigInt(usuarios));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro no sistema.',
      message: error.message,
    });
  }
});

//Buscar usuário por nome
router.get('/', auth, async (req, res) => {
  try {
    const { nome } = req.query;
    const academiaId = req.usuario.academia_id;

    //1. Definir o include para trazer os relacionamentos e identificar o tipo
    const incluirRelacionamentos = {
      aluno: true,
      professor: true,
    };

    //2. Buscar por Nome
    if (nome && String(nome).trim() !== '') {
      const usuarios = await prisma.usuario.findMany({
        where: {
          academia_id: academiaId,
          nome: {
            contains: String(nome),
          },
        },
        include: incluirRelacionamentos,
      });

      if (!usuarios || usuarios.length === 0) {
        return res.json([]);
      }

      const usuariosFormatados = usuarios.map((u) => ({
        ...u,
        tipo: u.professor ? 'professor' : u.aluno ? 'aluno' : 'usuario_comum',
      }));

      return res.json(formatBigInt(usuariosFormatados));
    }

    return res.status(400).json({
      error: 'Usuario não encontrado.',
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({
      error: 'Erro na busca do usuário.',
      message: error.message,
    });
  }
});

//Atualizar os dados cadastrais do usuário
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const academiaId = req.usuario.academia_id;

    const { nome, email, cpf, telefone, foto_perfil, cref, senha } = req.body;

    //Bloqueio na alteração do CPF ou CREF
    if (cpf !== undefined || cref !== undefined) {
      const campoInvalido = cpf !== undefined ? 'CPF' : 'CREF';

      return res.status(400).json({
        error: `O campo ${campoInvalido} não pode ser alterado.`,
      });
    }

    //1. Verificar se o usuário existe e pertence à mesma academia
    const usuarioExiste = await prisma.usuario.findFirst({
      where: {
        id: BigInt(id),
        academia_id: academiaId,
      },
      include: {
        aluno: true,
        professor: true,
      },
    });

    if (!usuarioExiste) {
      return res.status(404).json({
        error: 'Alteração negada.',
        message: 'Usuário não encontrado nesta academia.',
      });
    }

    //2. Criar um objeto dinâmico com os campos que serão atualizados na tabela Usuario
    const dadosUsuario = {};

    if (nome !== undefined) dadosUsuario.nome = nome;

    if (email !== undefined) {
      if (!regexEmail.test(email)) {
        return res.status(400).json({ error: 'E-mail inválido. Tente novamente.' });
      }
      dadosUsuario.email = email;
    }

    if (telefone !== undefined) dadosUsuario.telefone = telefone;
    if (foto_perfil !== undefined) dadosUsuario.foto_perfil = foto_perfil;

    if (senha !== undefined) {
      if (!regexSenha.test(senha)) {
        return res.status(400).json({
          error: 'A senha não atende aos requisitos de segurança.',
        });
      }

      const senhaIgual = await bycrypt.compare(senha, usuarioExistente.senha_hash);
      if (senhaIgual) {
        return res.status(400).json({
          error: 'A nova senha não pode ser igual à senha anterior.',
        });
      }

      const salt = await bycrypt.genSalt(10);
      dadosUsuario.senha_hash = await bycrypt.hash(senha, salt);
    }

    //3. Executar a atualização no banco de dados (Serve tanto para Aluno quanto Professor)
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: BigInt(id) },
      data: dadosUsuario,
      include: {
        aluno: true,
        professor: true,
      },
    });

    return res.status(200).json({
      message: 'Dados do usuário atualizados com sucesso.',
      usuario: formatBigInt(usuarioAtualizado),
    });
  } catch (error) {
    console.error('Erro:', error);

    if (error.code === 'P2002') {
      let campo = error.meta?.target;
      if (Array.isArray(campo)) campo = campo[0];

      if (typeof campo === 'string' && campo.includes('email')) {
        campo = 'Email';
      }

      return res.status(400).json({
        error: `${campo} já está em uso por outro usuário.`,
      });
    }

    return res.status(500).json({
      error: 'Erro na alteração cadastral do usuário.',
      message: error.message,
    });
  }
});

//Excluir usuário (professor ou aluno)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const academiaId = req.usuario.academia_id;

    //1. Buscar o usuário incluindo as relações de aluno e professor
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: BigInt(id),
        academia_id: academiaId,
      },
      include: {
        aluno: true,
        professor: true,
      },
    });

    //1.1. Se o usuário não existir nesta academia, retorna 404
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuário não encontrado nesta academia.',
      });
    }

    if (!usuario.aluno && !usuario.professor) {
      return res.status(403).json({
        error: 'Não é permitido excluir administradores.',
      });
    }

    //2. Deletar manualmente os vínculos antes de apagar o usuário
    const usuarioIdBigInt = BigInt(id);

    //2.1. Apaga os tokens de ativação gerados para este usuário
    await prisma.tokenAtivacao.deleteMany({
      where: { usuario_id: usuarioIdBigInt },
    });

    if (usuario.professor) {
      await prisma.professor.delete({
        where: { usuario_id: usuarioIdBigInt },
      });
    }

    if (usuario.aluno) {
      await prisma.aluno.delete({
        where: { usuario_id: usuarioIdBigInt },
      });
    }

    //3. Deletar o usuário
    await prisma.usuario.delete({
      where: { id: usuarioIdBigInt },
    });

    return res.json({
      message: 'Usuário excluído com sucesso.',
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao excluir usuário.',
      message: error.message,
    });
  }
});

export default router;
