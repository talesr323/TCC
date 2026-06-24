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
    if (!nome?.trim()) {
      return res.status(400).json({ error: "O campo 'Nome' é obrigatório." });
    }

    if (!exercicios || !Array.isArray(exercicios) || exercicios.length === 0) {
      return res
        .status(400)
        .json({ error: 'A ficha de treino deve conter pelo menos um exercício.' }); //Obriga o usuário a adicionar pelo menos um exercício na ficha
    }

    //2. Criar a ficha de treino
    const novaFicha = await prisma.fichaTreino.create({
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

    res.status(201).json(formatBigInt(novaFicha));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao cadastrar ficha de treino.',
      message: error.message,
    });
  }
});

//Listar todas as fichas de treino (com opção de filtrar por nível)
router.get('/nivel/:nivel', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nivel } = req.query;

    const fichasTreino = await prisma.fichaTreino.findMany({
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

    res.json(fichasTreino);
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro no sistema.',
      message: error.message,
    });
  }
});

//Buscar a ficha de treino por nome
router.get('/', auth, async (req, res) => {
  try {
    const { nome } = req.query;

    //2. Buscar por nome
    if (nome && String(nome).trim() !== '') {
      const fichasTreinoPorNome = await prisma.fichaTreino.findMany({
        where: {
          nome: {
            contains: String(nome),
          },
        },
      });

      if (!fichasTreinoPorNome) {
        return res.status(404).json({ error: 'Ficha de treino não encontrada.' });
      }

      return res.status(200).json(fichasTreinoPorNome);
    }
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao buscar ficha de treino.',
      message: error.message,
    });
  }
});

// Buscar as fichas de treino por ID do aluno
router.get('/aluno/:id', auth, async (req, res) => {
  try {
    const { aluno_id } = req.query;

    //1. Validar se o ID enviado é um número válido antes de converter para BigInt
    if (isNaN(Number(aluno_id))) {
      return res.status(400).json({
        error: 'O ID do aluno é inválido.',
      });
    }

    //2. Buscar todas as fichas associadas ao aluno_id
    const fichasTreinoDoAluno = await prisma.fichaTreino.findMany({
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

    return res.status(200).json(fichasTreinoDoAluno);
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao buscar ficha de treino.',
      message: error.message,
    });
  }
});

//Atualizar ficha de treino
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, grupo_id, data_inicio, data_fim } = req.body;

    //1. Verificar se o exercício existe
    const fichaTreinoExiste = await prisma.fichaTreino.findFirst({
      where: {
        id: BigInt(id),
      },
    });

    if (!fichaTreinoExiste) {
      return res.status(404).json({ error: 'Ficha de treino não encontrada.' });
    }

    //2. Criar um objeto dinâmico com os campos que serão atualizados na tabela Exercicio
    const dadosFichaTreino = {};

    if (nome !== undefined) dadosFichaTreino.nome = nome;
    if (grupo_id !== undefined) dadosFichaTreino.grupo_id = grupo_id;
    if (data_inicio !== undefined) dadosFichaTreino.data_inicio = data_inicio;
    if (data_fim !== undefined) dadosFichaTreino.data_fim = data_fim;

    //3. Executar a atualização no banco de dados
    const fichaTreinoAtualizada = await prisma.fichaTreino.update({
      where: { id: BigInt(id) },
      data: dadosFichaTreino,
    });

    return res.status(200).json({
      message: 'Ficha de treino atualizada com sucesso.',
      exercicio: formatBigInt(fichaTreinoAtualizada),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar ficha de treino.',
      message: error.message,
    });
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
    const exercicio = await prisma.fichaExercicio.create({
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
      item: formatBigInt(exercicio),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao adicionar exercício na ficha de treino.',
      message: error.message,
    });
  }
});

//Atualizar o exercício da ficha de treino
router.patch('/exercicios/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { series, repeticoes, descanso_segundos, carga_sugerida } = req.body;

    //1. Criar um objeto dinâmico com os campos que serão atualizados na tabela FichaExercício
    const dadosFichaExercicio = {};

    if (series !== undefined) dadosFichaExercicio.series = series;
    if (repeticoes !== undefined) dadosFichaExercicio.repeticoes = repeticoes;
    if (descanso_segundos !== undefined) dadosFichaExercicio.descanso_segundos = descanso_segundos;
    if (carga_sugerida !== undefined) dadosFichaExercicio.carga_sugerida = carga_sugerida;

    //2. Executar a atualização no banco de dados
    const FichaExercicioAtualizada = await prisma.fichaExercicio.update({
      where: { id: BigInt(id) },
      data: dadosFichaExercicio,
    });

    return res.status(200).json({
      message: 'Exercício atualizados com sucesso.',
      exercicio: formatBigInt(fichaExercicioAtualizada),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar exercício da ficha de treino.',
      message: error.message,
    });
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
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao remover exercício da ficha de treino.',
      message: error.message,
    });
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
        message: 'Aluno não encontrado',
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
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao vincular ficha de treino ao aluno.',
      message: error.message,
    });
  }
});

//Desvincular ficha a um aluno
router.put('/:id/desvincular-aluno', auth, async (req, res) => {
  try {
    const { id } = req.params;

    //1. Verificar se a ficha realmente existe antes de tentar atualizar
    const fichaTreinoExiste = await prisma.fichaTreino.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!fichaTreinoExiste) {
      return res.status(404).json({
        message: 'Ficha de treino não encontrada.',
      });
    }

    //2. Verificar se a ficha já está desvinculada (opcional, mas boa prática)
    if (fichaTreinoExiste.aluno_id === null) {
      return res.status(400).json({
        error: 'Erro no sistema.',
        message: 'Esta ficha de treino já não está vinculada a nenhum aluno.',
      });
    }

    //3. Atualizar a ficha definindo o aluno_id como null
    const fichaTreinoAtualizada = await prisma.fichaTreino.update({
      where: {
        id: BigInt(id),
      },
      data: {
        aluno_id: null, //Remove o vínculo com o aluno
      },
    });

    res.json({
      mensagem: 'Ficha de treino desvinculada com sucesso.',
      ficha: formatBigInt(fichaTreinoAtualizada),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao desvincular ficha de treino ao aluno.',
      message: error.message,
    });
  }
});

//Excluir ficha
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.fichaTreino.delete({
      where: { id: BigInt(req.params.id) },
    });
    res.json({ mensagem: 'Ficha de treino excluída com sucesso' });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao excluir ficha de treino.',
      message: error.message,
    });
  }
});

export default router;
