import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';
import { parse } from 'date-fns';

const router = express.Router();

const parseDataBr = (dataString) => {
  if (!dataString) return undefined;
  const stringPadronizada = dataString.replace(/\//g, '-');
  return parse(stringPadronizada, 'dd-MM-yyyy', new Date());
};

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );

// Criar ficha de treino vinculada a um treino
router.post('/', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nome, treino_id, grupo_id, data_inicio, data_fim, exercicios } = req.body;

    if (!professor_id) {
      return res.status(403).json({
        error: 'Apenas professores podem criar fichas.',
      });
    }

    if (!nome?.trim()) {
      return res.status(400).json({
        error: "O campo 'Nome' é obrigatório.",
      });
    }

    if (!treino_id) {
      return res.status(400).json({
        error: "O campo 'Treino' é obrigatório.",
      });
    }

    if (!exercicios || !Array.isArray(exercicios) || exercicios.length === 0) {
      return res.status(400).json({
        error: 'A ficha de treino deve conter pelo menos um exercício.',
      });
    }

    const treinoExiste = await prisma.treino.findFirst({
      where: {
        id: BigInt(treino_id),
        professor_id: BigInt(professor_id),
      },
    });

    if (!treinoExiste) {
      return res.status(404).json({
        error: 'Treino não encontrado para este professor.',
      });
    }

    const novaFicha = await prisma.fichaTreino.create({
      data: {
        nome: nome.trim(),
        treino_id: BigInt(treino_id),
        aluno_id: null,
        professor_id: BigInt(professor_id),
        grupo_id: grupo_id ? BigInt(grupo_id) : null,
        data_inicio: parseDataBr(data_inicio),
        data_fim: parseDataBr(data_fim),

        exercicios: {
          create: exercicios.map((ex) => ({
            exercicio_id: BigInt(ex.exercicio_id),
            series: Number(ex.series),
            repeticoes: Number(ex.repeticoes),
            descanso_segundos: ex.descanso_segundos
              ? Number(ex.descanso_segundos)
              : null,
            carga_sugerida: ex.carga_sugerida ?? null,
          })),
        },
      },
      include: {
        treino: true,
        grupo: true,
        exercicios: {
          include: {
            exercicio: true,
          },
        },
      },
    });

    return res.status(201).json(formatBigInt(novaFicha));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao cadastrar ficha de treino.',
      message: error.message,
    });
  }
});

// Listar fichas do professor por nível
router.get('/nivel', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nivel } = req.query;

    const fichasTreino = await prisma.fichaTreino.findMany({
      where: {
        professor_id: professor_id ? BigInt(professor_id) : undefined,
        ...(nivel && {
          grupo: {
            nivel,
          },
        }),
      },
      include: {
        treino: true,
        grupo: true,
        exercicios: {
          include: {
            exercicio: true,
          },
        },
      },
    });

    return res.json(formatBigInt(fichasTreino));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro no sistema.',
      message: error.message,
    });
  }
});

// Buscar fichas por treino
router.get('/treino/:treino_id', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const aluno_id = req.usuario.aluno_id;
    const { treino_id } = req.params;

    if (isNaN(Number(treino_id))) {
      return res.status(400).json({
        error: 'O ID do treino é inválido.',
      });
    }

    const treino = await prisma.treino.findFirst({
      where: {
        id: BigInt(treino_id),
        ...(professor_id && { professor_id: BigInt(professor_id) }),
        ...(aluno_id && { aluno_id: BigInt(aluno_id) }),
      },
    });

    if (!treino) {
      return res.status(404).json({
        error: 'Treino não encontrado.',
      });
    }

    const fichas = await prisma.fichaTreino.findMany({
      where: {
        treino_id: BigInt(treino_id),
      },
      include: {
        treino: true,
        grupo: true,
        exercicios: {
          include: {
            exercicio: true,
          },
        },
      },
    });

    return res.status(200).json(formatBigInt(fichas));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao buscar fichas do treino.',
      message: error.message,
    });
  }
});

// Buscar ficha por nome
router.get('/', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nome } = req.query;

    if (!nome || String(nome).trim() === '') {
      return res.status(400).json({
        error: "Parâmetro 'nome' não informado.",
      });
    }

    const fichasTreinoPorNome = await prisma.fichaTreino.findMany({
      where: {
        professor_id: professor_id ? BigInt(professor_id) : undefined,
        nome: {
          contains: String(nome),
        },
      },
      include: {
        treino: true,
        grupo: true,
        exercicios: {
          include: {
            exercicio: true,
          },
        },
      },
    });

    return res.status(200).json(formatBigInt(fichasTreinoPorNome));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao buscar ficha de treino.',
      message: error.message,
    });
  }
});

// Atualizar ficha
router.patch('/:id', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { id } = req.params;
    const { nome, treino_id, grupo_id, data_inicio, data_fim } = req.body;

    const fichaTreinoExiste = await prisma.fichaTreino.findFirst({
      where: {
        id: BigInt(id),
        professor_id: professor_id ? BigInt(professor_id) : undefined,
      },
    });

    if (!fichaTreinoExiste) {
      return res.status(404).json({
        error: 'Ficha de treino não encontrada.',
      });
    }

    const dadosFichaTreino = {};

    if (nome !== undefined) dadosFichaTreino.nome = nome;
    if (treino_id !== undefined) dadosFichaTreino.treino_id = BigInt(treino_id);
    if (grupo_id !== undefined) dadosFichaTreino.grupo_id = BigInt(grupo_id);
    if (data_inicio !== undefined) dadosFichaTreino.data_inicio = parseDataBr(data_inicio);
    if (data_fim !== undefined) dadosFichaTreino.data_fim = parseDataBr(data_fim);

    const fichaTreinoAtualizada = await prisma.fichaTreino.update({
      where: { id: BigInt(id) },
      data: dadosFichaTreino,
      include: {
        treino: true,
        grupo: true,
        exercicios: {
          include: {
            exercicio: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: 'Ficha de treino atualizada com sucesso.',
      ficha: formatBigInt(fichaTreinoAtualizada),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar ficha de treino.',
      message: error.message,
    });
  }
});

// Adicionar exercício em uma ficha
router.post('/:id/exercicios', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { id } = req.params;
    const { exercicio_id, series, repeticoes, descanso_segundos, carga_sugerida } = req.body;

    const ficha = await prisma.fichaTreino.findFirst({
      where: {
        id: BigInt(id),
        professor_id: professor_id ? BigInt(professor_id) : undefined,
      },
    });

    if (!ficha) {
      return res.status(404).json({
        error: 'Ficha de treino não encontrada.',
      });
    }

    const exercicioExiste = await prisma.exercicio.findUnique({
      where: { id: BigInt(exercicio_id) },
    });

    if (!exercicioExiste) {
      return res.status(404).json({
        error: 'O exercício informado não existe.',
      });
    }

    const exercicio = await prisma.fichaExercicio.create({
      data: {
        ficha_id: BigInt(id),
        exercicio_id: BigInt(exercicio_id),
        series: Number(series),
        repeticoes: Number(repeticoes),
        descanso_segundos: descanso_segundos ? Number(descanso_segundos) : null,
        carga_sugerida: carga_sugerida ?? null,
      },
      include: {
        exercicio: {
          select: { nome: true },
        },
      },
    });

    return res.status(201).json({
      mensagem: 'Exercício adicionado com sucesso.',
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

// Atualizar exercício da ficha
router.patch('/exercicios/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { series, repeticoes, descanso_segundos, carga_sugerida } = req.body;

    const dadosFichaExercicio = {};

    if (series !== undefined) dadosFichaExercicio.series = Number(series);
    if (repeticoes !== undefined) dadosFichaExercicio.repeticoes = Number(repeticoes);
    if (descanso_segundos !== undefined)
      dadosFichaExercicio.descanso_segundos = Number(descanso_segundos);
    if (carga_sugerida !== undefined) dadosFichaExercicio.carga_sugerida = carga_sugerida;

    const fichaExercicioAtualizada = await prisma.fichaExercicio.update({
      where: { id: BigInt(id) },
      data: dadosFichaExercicio,
    });

    return res.status(200).json({
      message: 'Exercício atualizado com sucesso.',
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

// Remover exercício da ficha
router.delete('/:id/exercicios/:exercicio_id', auth, async (req, res) => {
  try {
    const { id, exercicio_id } = req.params;

    const resultado = await prisma.fichaExercicio.deleteMany({
      where: {
        ficha_id: BigInt(id),
        exercicio_id: BigInt(exercicio_id),
      },
    });

    if (resultado.count === 0) {
      return res.status(404).json({
        error: 'Exercício não encontrado nesta ficha.',
      });
    }

    return res.json({
      mensagem: 'Exercício removido com sucesso.',
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao remover exercício da ficha de treino.',
      message: error.message,
    });
  }
});

// Excluir ficha
router.delete('/:id', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { id } = req.params;

    const ficha = await prisma.fichaTreino.findFirst({
      where: {
        id: BigInt(id),
        professor_id: professor_id ? BigInt(professor_id) : undefined,
      },
    });

    if (!ficha) {
      return res.status(404).json({
        error: 'Ficha de treino não encontrada.',
      });
    }

    await prisma.fichaExercicio.deleteMany({
      where: {
        ficha_id: BigInt(id),
      },
    });

    await prisma.fichaTreino.delete({
      where: {
        id: BigInt(id),
      },
    });

    return res.json({
      mensagem: 'Ficha de treino excluída com sucesso.',
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Erro ao excluir ficha de treino.',
      message: error.message,
    });
  }
});

export default router;  