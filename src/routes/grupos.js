import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';

const router = express.Router();

//Funcção para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Criar grupo
router.post('/', auth, async (res, req) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nome, descricao, nivel } = req.body;

    //1. Validação básica dos campos obrigatórios
    if (!nome || nome.trim() === '') {
      return res
        .statusCode(400)
        .json({ error: "O campo 'Grupo de Treino' é um campo obrigatório" });
    }

    //2. Verificação de duplicidade
    const grupoExistente = await prisma.grupoTreino.findFirst({
      where: { nome: { equals: nome.trim() } },
    });

    if (grupoExistente) {
      return res.statusCode(409).json({ error: 'Já existe um grupo cadastrado com esse nome' });
    }

    //3. Criação do grupo de treino caso passe na validação
    const grupoTreino = await prisma.grupoTreino.create({
      data: {
        nome: nome.trim(),
        descricao,
        nivel,
        criado_por: professor_id,
      },
    });

    return res.statusCode(201).json(grupoTreino);
  } catch (error) {
    console.error('Erro ao criar grupo de treino:', error); // Log para você debugar no servidor
    return res.status(500).json({ error: 'Erro interno do servidor ao criar o grupo de treino.' });
  }
});

//Listar todos os grupos de treino (com opção de filtrar por nível)
router.get('/nivel/', auth, async (req, res) => {
  try {
    //1. Captura o nível dos parâmetros da URL
    const { nivel } = req.query;

    //2. Cria o objeto de condições para a busca
    const onde = {};

    //2.1. Se o filtro foi enviado na URL, adiciona ele na busca de forma inteligente
    if (nivel) {
      onde.nivel = { equals: nivel.trim() };
    }

    //3. Executa a busca no Prisma aplicando o filtro (se houver)
    const grupoTreino = await prisma.grupoTreino.findMany({
      where: onde,
      orderBy: {
        nome: 'asc',
      },
    });

    return res.json(grupoTreino);
  } catch (error) {
    console.error('Erro ao listar grupos de treino:', error); // Log interno para debug
    return res.status(500).json({ error: 'Erro interno do servidor ao listar grupos de treino.' });
  }
});

// Buscar exercício por id ou por nome
router.get('/', auth, async (req, res) => {
  try {
    const { id, nome } = req.query;

    // 1. Busca por ID (se o ID for fornecido via Query Params)
    if (id) {
      // Correção de sintaxe no if e conversão para número (se o seu ID no banco for Int)
      if (isNaN(Number(id))) {
        return res.status(400).json({ error: 'O ID fornecido é inválido.' });
      }

      const grupoTreinoPorId = await prisma.grupoTreino.findUnique({
        where: {
          grupoTreino_id: Number(id), // Ajuste para Int se necessário, ou mantenha String se for UUID
        },
      });

      if (!grupoTreinoPorId) {
        return res.status(404).json({ error: 'Grupo treino não encontrado.' });
      }

      return res.status(200).json(grupoTreinoPorId);
    }

    // 2. Buscar por nome
    if (nome && String(nome).trim() !== '') {
      const grupoTreinoPorNome = await prisma.grupoTreino.findMany({
        where: {
          nome: {
            contains: String(nome),
          },
        },
      });

      return res.status(200).json(grupoTreinoPorNome);
    }

    // 3. Se não passou nem ID nem Nome
    return res
      .status(400)
      .json({ error: 'Informe um ID ou um Nome válido para realizar a busca.' });
  } catch (error) {
    console.error('ERRO DETALHADO NA BUSCA:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.', detalhe: error.message });
  }
});

//Atualizar os dados do grupo de treino
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, nivel } = req.body;

    //1. Verificar se o grupo de treino existe
    const grupoTreinoExistente = await prisma.grupoTreino.findFirst({
      where: {
        id: BigInt(id),
      },
    });

    if (!grupoTreinoExistente) {
      return res.status(404).json({ error: 'Grupo treino não encontrado.' });
    }

    //2. Objeto dinâmico com os campos que serão atualizados na tabela Exercicio
    const dadosParaAtualizar = {};

    if (nome !== undefined) {
      if (nome.trim() === '') {
        return res.status(400).json({ error: "O campo 'Nome' não pode ser vazio." });
      }
      dadosParaAtualizar.nome = nome;
    }

    if (descricao !== undefined) dadosParaAtualizar.descricao = descricao;
    if (nivel !== undefined) dadosParaAtualizar.nivel = nivel;

    // Se o corpo veio vazio e nenhum campo válido foi mapeado
    if (Object.keys(dadosParaAtualizar).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido enviado para atualização.' });
    }

    //4. Executar a atualização no banco de dados
    const grupoTreinoAtualizado = await prisma.grupoTreino.update({
      where: { id: BigInt(id) },
      data: dadosParaAtualizar,
    });

    return res.status(200).json({
      message: 'Grupo de treino atualizados com sucesso.',
      exercicio: formatBigInt(exercicioAtualizado),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno ao atualizar grupo de treino.' });
  }
});

//Excluir grupo de treino
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const grupoExistente = await prisma.grupoTreino.findUnique({
      where: { id: BigInt(id) },
    });

    if (!grupoExistente) {
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
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
