import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';

const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Criar uma ficha de treino
router.post('/', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nome, aluno_id, grupo_id, data_inicio, data_fim, exercicios } = req.body;

    //1. Fazer a validação básica dos campos obrigatórios
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome e grupo muscular são obrigatórios.' });
    }

    if (!exercicios || !Array.isArray(exercicios) || exercicios.length === 0) {
      return res.status(400).json({ error: 'A ficha deve conter pelo menos um exercício.' }); //Obriga o usuário a adicionar pelo menos um exercício na ficha
    }

    //2. Criar a ficha de treino
    const ficha = await prisma.fichaTreino.create({
      data: {
        nome,
        aluno_id: aluno_id ? BigInt(aluno_id) : null,
        professor_id: professor_id ? BigInt(professor_id) : null,
        grupo_id: grupo_id ? BigInt(grupo_id) : null,
        data_inicio,
        data_fim,

        exercicios: {
          create:
            exercicios?.map((ex) => ({
              exercicio_id: BigInt(ex.exercicio_id),
              series: ex.series,
              repeticoes: ex.repeticoes,
              descanso_segundos: ex.descanso_segundos,
              carga_sugerida: ex.carga_sugerida,
            })) || [],
        },
      },
      include: {
        exercicios: {
          include: {
            exercicio: true,
          },
        },
      },
    });

    res.status(201).json(formatBigInt(ficha));
  } catch (error) {
    console.error('Erro ao criar a ficha de treino:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Listar todas as fichas de treino (com opção de filtrar por nível)
router.get('/nivel/', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nivel } = req.query;

    const fichas = await prisma.fichaTreino.findMany({
      where: {
        professor_id,
        ...(nivel && {
          grupo: {
            nivel: nivel,
          },
        }),
      },

      include: {
        aluno: true,
        grupo: true,
        exercicios: {
          include: {
            exercicio: true,
          },
        },
      },
    });

    res.json(fichas);
  } catch (error) {
    console.error('Erro ao buscar a ficha de treino:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Buscar a ficha de treino por id ou por nome
router.get('/', auth, async (req, res) => {
  try {
    const { id, nome } = req.query;

    //1. Buscar por id
    if (id) {
      if (isNaN(Number(id))) {
        return res.status(400).json({ error: 'O ID fornecido é inválido.' });
      }

      const fichaPorId = await prisma.fichaTreino.findUnique({
        where: {
          ficha_id: Number(id),
        },
      });

      if (!fichaPorId) {
        return res.status(404).json({ error: 'Ficha de treino não encontrado.' });
      }

      return res.status(200).json(fichaPorIdPorId);
    }

    //2. Buscar por nome
    if (nome && String(nome).trim() !== '') {
      const fichasPorNome = await prisma.fichaTreino.findMany({
        where: {
          nome: {
            contains: String(nome),
          },
        },
      });

      return res.status(200).json(fichasPorNome);
    }

    // 3. Se não passou nem ID nem Nome
    return res
      .status(400)
      .json({ error: 'Informe um ID ou um Nome válido para realizar a busca.' });
  } catch (error) {
    console.error('Erro ao buscar a ficha de treino:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Buscar as fichas de treino por ID do aluno
router.get('/aluno/:id', auth, async (req, res) => {
  try {
    const { aluno_id } = req.query;

    //1. Validar se o ID enviado é um número válido antes de converter para BigInt
    if (isNaN(Number(aluno_id))) {
      return res.status(400).json({ error: 'O ID do aluno fornecido é inválido.' });
    }

    //2. Buscar todas as fichas associadas ao aluno_id
    const fichasDoAluno = await prisma.fichaTreino.findMany({
      where: {
        aluno_id: BigInt(aluno_id),
      },
      include: {
        grupo: true,
        exercicios: {
          include: {
            exercicio: true,
          },
        },
      },
    });

    return res.status(200).json(fichasDoAluno);
  } catch (error) {
    console.error('Erro ao buscar a ficha de treino:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Atualizar ficha de treino
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, grupo_id, data_inicio, data_fim } = req.body;

    //1. Verificar se o exercício existe
    const fichaExistente = await prisma.fichaTreino.findFirst({
      where: {
        id: BigInt(id),
      },
    });

    if (!fichaExistente) {
      return res.status(404).json({ error: 'Ficha não encontrado.' });
    }

    //2. Criar um objeto dinâmico com os campos que serão atualizados na tabela Exercicio
    const dadosParaAtualizar = {};

    if (nome !== undefined) dadosParaAtualizar.nome = nome;
    if (grupo_id !== undefined) dadosParaAtualizar.grupo_id = grupo_id;
    if (data_inicio !== undefined) dadosParaAtualizar.data_inicio = data_inicio;
    if (data_fim !== undefined) dadosParaAtualizar.data_fim = data_fim;

    //2.1. Se o corpo veio vazio e nenhum campo válido foi mapeado
    if (Object.keys(dadosParaAtualizar).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido enviado para atualização.' });
    }

    //3. Executar a atualização no banco de dados
    const fichaAtualizado = await prisma.fichaTreino.update({
      where: { id: BigInt(id) },
      data: dadosParaAtualizar,
    });

    return res.status(200).json({
      message: 'Ficha de treino atualizados com sucesso.',
      exercicio: formatBigInt(fichaAtualizado),
    });
  } catch (error) {
    console.error('Erro ao atualizar a ficha de treino:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Adicionar exercicio em uma ficha
router.post('/:id/exercicios', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { exercicio_id, series, repeticoes, descanso_segundos, carga_sugerida } = req.body;

    //1. Verificar se o exercício realmente existe no banco de dados
    const exercicioExiste = await prisma.exercicio.findUnique({
      where: { id: BigInt(exercicio_id) },
    });

    //1.1 Se não existir, retorna um erro 404 imediatamente
    if (!exercicioExiste) {
      return res.status(404).json({ erro: 'O exercício informado não existe.' });
    }

    //2. Adicionar o exercício
    const item = await prisma.fichaExercicio.create({
      data: {
        ficha_id: BigInt(id),
        exercicio_id: BigInt(exercicio_id),
        series,
        repeticoes,
        descanso_segundos,
        carga_sugerida,
      },
      include: {
        exercicio: {
          select: {
            nome: true,
          },
        },
      },
    });

    res.status(201).json({
      mensagem: 'Exercício adicionado com sucesso',
      item: formatBigInt(item),
    });
  } catch (error) {
    console.error('Erro ao adicionar o exercício na ficha:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Atualizar o exercício da ficha de treino
router.patch('/exercicios/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { series, repeticoes, descanso_segundos, carga_sugerida } = req.body;

    //1. Criar um objeto dinâmico com os campos que serão atualizados na tabela FichaExercício
    const dadosParaAtualizar = {};

    if (series !== undefined) dadosParaAtualizar.series = series;
    if (repeticoes !== undefined) dadosParaAtualizar.repeticoes = repeticoes;
    if (descanso_segundos !== undefined) dadosParaAtualizar.descanso_segundos = descanso_segundos;
    if (carga_sugerida !== undefined) dadosParaAtualizar.carga_sugerida = carga_sugerida;

    if (Object.keys(dadosParaAtualizar).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido enviado para atualização.' });
    }

    //2. Executar a atualização no banco de dados
    const exercicioAtualizado = await prisma.fichaExercicio.update({
      where: { id: BigInt(id) },
      data: dadosParaAtualizar,
    });

    return res.status(200).json({
      message: 'Exercício atualizados com sucesso.',
      exercicio: formatBigInt(exercicioAtualizado),
    });
  } catch (error) {
    console.error('Erro ao atualizar o exercício na ficha:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Remover exercício da ficha
router.delete('/exercicios/:id', auth, async (req, res) => {
  try {
    await prisma.fichaExercicio.delete({
      where: { id: BigInt(req.params.id) },
    });
    res.json({ mensagem: 'Exercício removido com sucesso' });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.put('/:id/vincular-aluno', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { aluno_id } = req.body;

    //1. Verificar se o aluno realmente existe no banco de dados
    const aluno = await prisma.aluno.findUnique({
      where: {
        id: BigInt(aluno_id),
      },
    });

    if (!aluno) {
      return res.status(404).json({
        erro: 'Aluno não encontrado',
      });
    }

    //2. Atualizar a Ficha de Treino injetando o BigInt do aluno_id
    const ficha = await prisma.fichaTreino.update({
      where: {
        id: BigInt(id),
      },
      data: {
        aluno_id: BigInt(aluno_id),
      },
    });

    //3. Retornar a ficha atualizada
    res.json(formatBigInt(ficha));
  } catch (error) {
    console.error('Erro ao vincular a ficha:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Desvincular ficha a um aluno
router.put('/:id/desvincular-aluno', auth, async (req, res) => {
  try {
    const { id } = req.params;

    //1. Verificar se a ficha realmente existe antes de tentar atualizar
    const fichaExistente = await prisma.fichaTreino.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!fichaExistente) {
      return res.status(404).json({
        erro: 'Ficha de treino não encontrada.',
      });
    }

    //2. Verificar se a ficha já está desvinculada (opcional, mas boa prática)
    if (fichaExistente.aluno_id === null) {
      return res.status(400).json({
        erro: 'Esta ficha já não está vinculada a nenhum aluno.',
      });
    }

    //3. Atualizar a ficha definindo o aluno_id como null
    const fichaAtualizada = await prisma.fichaTreino.update({
      where: {
        id: BigInt(id),
      },
      data: {
        aluno_id: null, //Remove o vínculo com o aluno
      },
    });

    res.json({
      mensagem: 'Ficha desvinculada com sucesso.',
      ficha: formatBigInt(fichaAtualizada),
    });
  } catch (error) {
    console.error('Erro ao desvincular a ficha:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

//Excluir ficha
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.fichaTreino.delete({
      where: { id: BigInt(req.params.id) },
    });
    res.json({ mensagem: 'Ficha excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir a ficha:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

export default router;
