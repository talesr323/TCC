import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';

const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Criar grupo
router.post('/', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nome, descricao, nivel } = req.body;

    //1. Fazer a validação básica dos campos obrigatórios
    if (!nome?.trim()) {
      return res.status(400).json({ error: "O campo 'Grupo de Treino' é obrigatório" });
    }

    //2. Verificar a existência do grupo de treino
    const grupoTreinoExiste = await prisma.grupoTreino.findFirst({
      where: { nome: { equals: nome.trim() } },
    });

    if (grupoTreinoExiste) {
      return res.status(409).json({
        error: 'Já existe um grupo de treino cadastrado com esse nome.',
      });
    }

    //3. Criar o grupo de treino
    const grupoTreino = await prisma.grupoTreino.create({
      data: {
        nome: nome.trim(),
        descricao,
        nivel,
        professor: {
          connect: { id: professor_id },
        },
      },
    });

    return res.status(201).json(grupoTreino);
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao cadastrar grupo de treino.',
      message: error.message,
    });
  }
});

//Listar todos os grupos de treino (com opção de filtrar por nível)
router.get('/nivel', auth, async (req, res) => {
  try {
    //1. Capturar o nível dos parâmetros da URL
    const { nivel } = req.query;

    //2. Criar o objeto de condições para a busca
    const onde = {};

    //2.1. Se o filtro foi enviado na URL, adiciona ele na busca de forma inteligente
    if (nivel) {
      onde.nivel = { equals: nivel.trim() };
    }

    //3. ExecutaR a busca no Prisma aplicando o filtro (se houver)
    const grupoTreino = await prisma.grupoTreino.findMany({
      where: onde,
      orderBy: {
        nome: 'asc',
      },
    });

    return res.json(grupoTreino);
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro no sistema.',
      message: error.message,
    });
  }
});

// Buscar exercício por nome
router.get('/', auth, async (req, res) => {
  try {
    const { nome } = req.query;

    //1. Buscar por nome
    if (nome && String(nome).trim() !== '') {
      const grupoTreinoPorNome = await prisma.grupoTreino.findMany({
        where: {
          nome: {
            contains: String(nome),
          },
        },
      });

      if (!grupoTreinoPorNome) {
        return res.status(404).json({
          error: 'O grupo de treino não existe.',
        });
      }

      return res.status(200).json(grupoTreinoPorNome);
    }
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao buscar grupo de treino.',
      message: error.message,
    });
  }
});

//Atualizar os dados do grupo de treino
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, nivel } = req.body;

    //1. Verificar se o grupo de treino existe
    const grupoTreinoExiste = await prisma.grupoTreino.findFirst({
      where: {
        id: BigInt(id),
      },
    });

    if (!grupoTreinoExiste) {
      return res.status(404).json({
        error: 'Grupo treino não encontrado.',
      });
    }

    //2. Criar um objeto dinâmico com os campos que serão atualizados na tabela Exercicio
    const dadosGrupoTreino = {};

    if (nome !== undefined) dadosGrupoTreino.nome = nome;
    if (descricao !== undefined) dadosGrupoTreino.descricao = descricao;
    if (nivel !== undefined) dadosGrupoTreino.nivel = nivel;

    //3. Executar a atualização no banco de dados
    const grupoTreinoAtualizado = await prisma.grupoTreino.update({
      where: { id: BigInt(id) },
      data: dadosGrupoTreino,
    });

    return res.status(200).json({
      message: 'Grupo de treino atualizados com sucesso.',
      exercicio: formatBigInt(grupoTreinoAtualizado),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar grupo de treino.',
      message: error.message,
    });
  }
});

//Excluir grupo de treino
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const grupoTreinoExiste = await prisma.grupoTreino.findUnique({
      where: { id: BigInt(id) },
    });

    if (!grupoExiste) {
      return res.status(404).json({
        error: 'Grupo de treino não encontrado.',
      });
    }

    await prisma.grupoTreino.delete({
      where: { id: BigInt(id) },
    });

    res.json({
      message: 'Grupo de treino excluído com sucesso',
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao excluir grupo de treino.',
      message: error.message,
    });
  }
});

export default router;
