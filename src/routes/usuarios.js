import admin from '../middlewares/admin.js';
import auth from '../middlewares/auth.js';
import bycrypt from 'bcryptjs';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import crypto from 'crypto';
import express from 'express';
import { PrismaClient } from '@prisma/client';

const crefRegex = /^\d{6}-[A-Z]{1,2}\/[A-Z]{2}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const prisma = new PrismaClient();
const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Cadastrar usuário (com token, mas sem senha)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { nome, email, cpf, tipo, cref, telefone, foto_perfil } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: "O campo 'Nome' é obrigatório." });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({ error: "O campo 'E-mail' é obrigatório." });
    } else if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    // Corrigido para usar o validador renomeado
    if (!cpfValidator.isValid(cpf)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    if (!tipo || tipo.trim() === '') {
      return res.status(400).json({ error: "O campo 'Tipo' é obrigatório." });
    }

    //🔒 Bloquear cadastro de admin
    if (tipo === 'ADMIN') {
      return res.status(403).json({ error: 'Não é permitido criar administrador.' });
    }

    //✅ Validação do tipo
    if (!['ALUNO', 'PROFESSOR'].includes(tipo)) {
      return res.status(400).json({ error: "O campo 'Tipo' deve ser ALUNO ou PROFESSOR." });
    }

    //✅ Validação do CREF
    if ((tipo === 'PROFESSOR' && !cref) || (tipo === 'PROFESSOR' && cref.trim() === '')) {
      return res.status(400).json({ error: "O campo 'CREF' deve ser obrigatório." });
    } else if (tipo === 'PROFESSOR' && !crefRegex.test(cref)) {
      return res.status(400).json({ error: 'CREF inválido.' });
    }

    //Criar usuário
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        cpf,
        telefone,
        foto_perfil,
        ativo: false,
        academia_id: req.usuario.academia_id,
      },
    });

    //Criar perfil
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

    //Gerar token de ativação
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
    console.error(error);

    if (error.code === 'P2002') {
      let campo = error.meta?.target;
      if (Array.isArray(campo)) campo = campo[0];

      if (typeof campo === 'string') {
        if (campo.includes('email')) campo = 'Email';
        else if (campo.includes('cpf')) campo = 'CPF';
        else if (campo.includes('cref')) campo = 'CREF';
      }

      return res.status(400).json({
        error: `${campo} já cadastrado.`,
      });
    }

    return res.status(500).json({ error: error.message });
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

    // 2. Construir a query base filtrando pela academia do usuário logado
    const WHERE_CLAUSE = {
      academia_id: academia_id,
    };

    // 3. Se houver filtro de tipo, filtramos trazendo apenas quem tem aquele perfil vinculado
    if (tipo) {
      const tipoFormatado = tipo.toUpperCase();
      if (tipoFormatado === 'ALUNO') {
        WHERE_CLAUSE.aluno = { isNot: null }; // Garante que a relação com Aluno existe
      } else if (tipoFormatado === 'PROFESSOR') {
        WHERE_CLAUSE.professor = { isNot: null }; // Garante que a relação com Professor existe
      }
    }

    // 4. Buscar usuários no Prisma trazendo os perfis relacionados
    const usuarios = await prisma.usuario.findMany({
      where: WHERE_CLAUSE,
      include: {
        aluno: true,
        professor: true,
      },
      orderBy: {
        nome: 'asc', // Organiza por ordem alfabética
      },
    });

    // 5. Retornar a lista tratada para evitar problemas com BigInt
    return res.status(200).json(formatBigInt(usuarios));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

//Buscar usuário por id ou por nome
router.get('/', auth, async (req, res) => {
  try {
    const { id, nome } = req.query;
    const academiaId = req.usuario.academia_id; // Isolamento de segurança

    // 1. Definição do include para trazer os relacionamentos e identificar o tipo
    const incluirRelacionamentos = {
      aluno: true,
      professor: true,
    };

    // 2. Busca por ID (se o ID for fornecido via Query Params)
    if (id) {
      if (isNaN(Number(id))) {
        return res.status(400).json({ error: 'O ID fornecido é inválido.' });
      }

      const usuario = await prisma.usuario.findFirst({
        where: {
          id: BigInt(id),
          academia_id: academiaId,
        },
        include: incluirRelacionamentos,
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const usuarioFormatado = {
        ...usuario,
        tipo: usuario.professor ? 'professor' : usuario.aluno ? 'aluno' : 'usuario_comum',
      };

      return res.json(formatBigInt(usuarioFormatado));
    }

    // 3. Busca por Nome (Corrigida sem o 'mode')
    if (nome && String(nome).trim() !== '') {
      const usuarios = await prisma.usuario.findMany({
        where: {
          academia_id: academiaId, // 🔒 Isolando por academia
          nome: {
            contains: String(nome), // O MySQL/MariaDB já faz a busca sem diferenciar maiúsculas/minúsculas por padrão
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

    return res
      .status(400)
      .json({ error: 'Informe um ID ou um Nome válido para realizar a busca.' });
  } catch (error) {
    console.error('ERRO DETALHADO NA BUSCA:', error);
    res.status(500).json({ error: 'Erro interno do servidor.', detalhe: error.message });
  }
});

//Atualizar dados cadastrais do usuário
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const academiaId = req.usuario.academia_id; // Segurança: Garante isolamento por academia

    // Adicionado 'senha' na desestruturação do body
    const { nome, email, cpf, telefone, foto_perfil, cref, senha } = req.body;

    // Regra de Negócio: CPF e CREF não podem ser alterados
    if (cpf !== undefined || cref !== undefined) {
      return res.status(400).json({
        error: 'Não é permitido alterar o CPF ou o CREF após o cadastro.',
      });
    }

    // 1. Verificar se o usuário existe e pertence à mesma academia
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        id: BigInt(id),
        academia_id: academiaId,
      },
      include: {
        aluno: true,
        professor: true,
      },
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuário não encontrado nesta academia.' });
    }

    // 2. Objeto dinâmico com os campos que serão atualizados na tabela Usuario
    const dadosParaAtualizar = {};

    if (nome !== undefined) {
      if (nome.trim() === '') {
        return res.status(400).json({ error: "O campo 'Nome' não pode ser vazio." });
      }
      dadosParaAtualizar.nome = nome;
    }

    if (email !== undefined) {
      if (email.trim() === '') {
        return res.status(400).json({ error: "O campo 'E-mail' não pode ser vazio." });
      }
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'E-mail inválido.' });
      }
      dadosParaAtualizar.email = email;
    }

    if (telefone !== undefined) dadosParaAtualizar.telefone = telefone;
    if (foto_perfil !== undefined) dadosParaAtualizar.foto_perfil = foto_perfil;

    // --- NOVA REGRA: Validação e Criptografia da Senha ---
    if (senha !== undefined) {
      if (senha.trim() === '' || senha.length < 8) {
        // Ajuste o tamanho mínimo conforme sua regra
        return res
          .status(400)
          .json({ error: 'A senha deve conter pelo menos 8 caracteres e não pode ser vazia.' });
      }

      // Compara a nova senha enviada com o hash da senha atual no banco
      const senhaIgual = await bycrypt.compare(senha, usuarioExistente.senha_hash);
      if (senhaIgual) {
        return res.status(400).json({ error: 'A nova senha não pode ser igual à senha anterior.' });
      }

      // Gera o hash da nova senha (ajuste o 'salt' de 10 se seu padrão for diferente)
      const salt = await bycrypt.genSalt(10);
      dadosParaAtualizar.senha_hash = await bycrypt.hash(senha, salt);
    }
    // -----------------------------------------------------

    // Se o corpo veio vazio e nenhum campo válido foi mapeado
    if (Object.keys(dadosParaAtualizar).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido enviado para atualização.' });
    }

    // 4. Executar a atualização no banco de dados (Serve tanto para Aluno quanto Professor)
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: BigInt(id) },
      data: dadosParaAtualizar,
      include: {
        aluno: true,
        professor: true,
      },
    });

    return res.status(200).json({
      message: 'Dados cadastrais atualizados com sucesso.',
      usuario: formatBigInt(usuarioAtualizado),
    });
  } catch (error) {
    console.error(error);

    // Tratamento de duplicidade do Prisma (P2002) para campos Unique como Email
    if (error.code === 'P2002') {
      let campo = error.meta?.target;
      if (Array.isArray(campo)) campo = campo[0];

      if (typeof campo === 'string' && campo.includes('email')) {
        campo = 'Email';
      }

      return res.status(400).json({ error: `${campo} já está em uso por outro usuário.` });
    }

    return res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
  }
});

//Excluir usuário (professor ou aluno)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const academiaId = req.usuario.academia_id; // 🔒 Isolamento de segurança por academia

    // 1. Busca o usuário incluindo as relações de aluno e professor
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: BigInt(id),
        academia_id: academiaId, // Garante que pertence à mesma academia do usuário logado
      },
      include: {
        aluno: true,
        professor: true,
      },
    });

    // 2. Se o usuário não existir nesta academia, retorna 404
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado nesta academia.' });
    }

    // 3. Regra de negócio: Só permite deletar se for ALUNO ou PROFESSOR
    if (!usuario.aluno && !usuario.professor) {
      return res
        .status(403)
        .json({ error: 'Não é permitido excluir administradores por esta rota.' });
    }

    // 💡 SOLUÇÃO: Deletar manualmente os vínculos antes de apagar o usuário (Garante o funcionamento sem Cascade no BD)
    const usuarioIdBigInt = BigInt(id);

    // Apaga os tokens de ativação gerados para este usuário
    await prisma.tokenAtivacao.deleteMany({
      where: { usuario_id: usuarioIdBigInt },
    });

    // Apaga o perfil de Professor, caso exista
    if (usuario.professor) {
      await prisma.professor.delete({
        where: { usuario_id: usuarioIdBigInt },
      });
    }

    // Apaga o perfil de Aluno, caso exista
    if (usuario.aluno) {
      await prisma.aluno.delete({
        where: { usuario_id: usuarioIdBigInt },
      });
    }

    // 4. Agora que os vínculos foram limpos, deleta o usuário da tabela pai com segurança
    await prisma.usuario.delete({
      where: { id: usuarioIdBigInt },
    });

    return res.json({
      message: 'Usuário excluído com sucesso.',
    });
  } catch (error) {
    // 💡 MELHORIA: Mostra o erro real no console para te dar total visibilidade se algo mais falhar
    console.error('ERRO DETALHADO AO DELETAR USUÁRIO:', error);
    return res
      .status(500)
      .json({ error: 'Erro interno ao excluir o usuário.', detalhe: error.message });
  }
});

export default router;
