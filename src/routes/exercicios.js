import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';

const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Criar exercício
router.post('/', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nome, descricao, grupo_muscular } = req.body;

    // 1. Fazer a validação básica
    if (!nome?.trim() || !grupo_muscular?.trim()) {
      return res.status(400).json({ error: 'Nome e grupo muscular são obrigatórios.' });
    }

    //2. Verificar se o exercício já existe
    const exercicioExistente = await prisma.exercicio.findFirst({
      where: {
        nome: {
          equals: nome.trim(),
        },
      },
    });

    if (exercicioExistente) {
      return res.status(409).json({ error: 'Já existe um exercício cadastrado com esse nome.' });
    }

    //3. Criar o exercício
    const exercicio = await prisma.exercicio.create({
      data: {
        nome: nome.trim(),
        descricao,
        grupo_muscular,
        professor: {
          connect: { id: professor_id },
        },
      },
    });

    return res.status(201).json(exercicio);
  } catch (error) {
    console.error('Erro ao criar exercício:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Listar todos os exercícios (com opção de filtrar por grupo muscular)
router.get('/grupo-muscular/', auth, async (req, res) => {
  try {
    //1. Capturar o grupo muscular dos parâmetros da URL (Ex: /exercicios?grupo_muscular=Pernas)
    const { grupo_muscular } = req.query;

    //2. Criar o objeto de condições para a busca
    const onde = {};

    //2.1. Se o filtro foi enviado na URL, adiciona ele na busca de forma inteligente
    if (grupo_muscular) {
      onde.grupo_muscular = {
        equals: grupo_muscular.trim(),
      };
    }

    //3. Executar a busca no Prisma aplicando o filtro (se houver)
    const exercicios = await prisma.exercicio.findMany({
      where: onde,
      orderBy: {
        nome: 'asc',
      },
    });

    return res.json(exercicios);
  } catch (error) {
    console.error('Erro ao listar exercícios:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Buscar exercício por id ou por nome
router.get('/', auth, async (req, res) => {
  try {
    const { id, nome } = req.query;

    //1. Buscar por ID (se o ID for fornecido via Query Params)
    if (id) {
      if (isNaN(Number(id))) {
        return res.status(400).json({ error: 'O ID fornecido é inválido.' });
      }

      const exercicioPorId = await prisma.exercicio.findUnique({
        where: {
          id: BigInt(id),
        },
      });

      if (!exercicioPorId) {
        return res.status(404).json({ error: 'Exercício não encontrado.' });
      }

      return res.status(200).json(exercicioPorId);
    }

    //2. Buscar por nome
    if (nome && String(nome).trim() !== '') {
      const exerciciosPorNome = await prisma.exercicio.findMany({
        where: {
          nome: {
            contains: String(nome),
          },
        },
      });

      return res.status(200).json(exerciciosPorNome);
    }

    return res
      .status(400)
      .json({ error: 'Informe um ID ou um Nome válido para realizar a busca.' });
  } catch (error) {
    console.error('Erro ao buscar exercício:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Atualizar os dados do exercício
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, grupo_muscular } = req.body;

    //1. Verificar se o exercício existe
    const exercicioExistente = await prisma.exercicio.findFirst({
      where: {
        id: BigInt(id),
      },
    });

    if (!exercicioExistente) {
      return res.status(404).json({ error: 'Exercício não encontrado.' });
    }

    //2. Criar um objeto dinâmico com os campos que serão atualizados na tabela Exercicio
    const dadosParaAtualizar = {};

    if (nome !== undefined) dadosParaAtualizar.nome = nome;
    if (descricao !== undefined) dadosParaAtualizar.descricao = descricao;
    if (grupo_muscular !== undefined) dadosParaAtualizar.grupo_muscular = grupo_muscular;

    //2.1 Se o corpo veio vazio e nenhum campo válido foi mapeado
    if (Object.keys(dadosParaAtualizar).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido enviado para atualização.' });
    }

    //3. Executar a atualização no banco de dados
    const exercicioAtualizado = await prisma.exercicio.update({
      where: { id: BigInt(id) },
      data: dadosParaAtualizar,
    });

    return res.status(200).json({
      message: 'Exercício atualizados com sucesso.',
      exercicio: formatBigInt(exercicioAtualizado),
    });
  } catch (error) {
    console.error('Erro ao atualizar o exercício:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Excluir exercício
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    //1. Buscar o exercício
    const exercicioExiste = await prisma.exercicio.findUnique({
      where: { id: BigInt(id) },
    });

    //1.1. Se o exercício não existir
    if (!exercicioExiste) {
      return res.status(404).json({
        error: 'Exercício não encontrado.',
      });
    }

    //2. Deletar o exercício
    await prisma.exercicio.delete({
      where: { id: BigInt(id) },
    });

    res.json({
      message: 'Exercício excluído com sucesso',
    });
  } catch (error) {
    console.error('Erro ao excluir o exercício:', error);

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Não é possível deletar: exercício já está em uso em fichas.',
      });
    }

    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

export default router;
