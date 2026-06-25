import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';
import { parse } from 'date-fns'; // Importando a função de conversão

const router = express.Router();

// Função auxiliar para converter strings DD-MM-YYYY ou DD/MM/YYYY para Objeto Date
const parseDataBr = (dataString) => {
  if (!dataString) return undefined;
  // Substitui barras por hífens caso o usuário mande "25/06/2026"
  const stringPadronizada = dataString.replace(/\//g, '-');
  return parse(stringPadronizada, 'dd-MM-yyyy', new Date());
};

// Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

// 1. Criar uma ficha de treino
router.post('/', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nome, aluno_id, grupo_id, data_inicio, data_fim, exercicios } = req.body;

    if (!nome?.trim()) {
      return res.status(400).json({ error: "O campo 'Nome' é obrigatório." });
    }

    if (!exercicios || !Array.isArray(exercicios) || exercicios.length === 0) {
      return res
        .status(400)
        .json({ error: 'A ficha de treino deve conter pelo menos um exercício.' });
    }

    const novaFicha = await prisma.fichaTreino.create({
      data: {
        nome,
        aluno_id: aluno_id ? BigInt(aluno_id) : null,
        professor_id: professor_id ? BigInt(professor_id) : null,
        grupo_id: grupo_id ? BigInt(grupo_id) : null,
        // CORREÇÃO: Tratando as datas na criação
        data_inicio: parseDataBr(data_inicio),
        data_fim: parseDataBr(data_fim),

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

// 2. Listar todas as fichas de treino (com opção de filtrar por nível)
router.get('/nivel', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nivel } = req.query;

    const fichasTreino = await prisma.fichaTreino.findMany({
      where: {
        professor_id: professor_id ? BigInt(professor_id) : undefined,
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

    res.json(formatBigInt(fichasTreino));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro no sistema.',
      message: error.message,
    });
  }
});

// 3. Buscar as fichas de treino por ID do aluno
// BUGFIX: Movido para cima do GET genérico para evitar conflito de rotas
router.get('/aluno/:aluno_id', auth, async (req, res) => {
  try {
    // BUGFIX ORIGINAL: Você pegava do req.query mas o parâmetro está na URL (:aluno_id), ou seja, req.params
    const { aluno_id } = req.params;

    if (isNaN(Number(aluno_id))) {
      return res.status(400).json({
        error: 'O ID do aluno é inválido.',
      });
    }

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

    return res.status(200).json(formatBigInt(fichasTreinoDoAluno));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao buscar ficha de treino.',
      message: error.message,
    });
  }
});

// 4. Buscar a ficha de treino por nome
router.get('/', auth, async (req, res) => {
  try {
    const { nome } = req.query;

    if (nome && String(nome).trim() !== '') {
      const fichasTreinoPorNome = await prisma.fichaTreino.findMany({
        where: {
          nome: {
            contains: String(nome),
          },
        },
      });

      return res.status(200).json(formatBigInt(fichasTreinoPorNome));
    }

    return res.status(400).json({ error: "Parâmetro 'nome' não informado." });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao buscar ficha de treino.',
      message: error.message,
    });
  }
});

// 5. Atualizar ficha de treino
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, grupo_id, data_inicio, data_fim } = req.body;

    const fichaTreinoExiste = await prisma.fichaTreino.findFirst({
      where: { id: BigInt(id) },
    });

    if (!fichaTreinoExiste) {
      return res.status(404).json({ error: 'Ficha de treino não encontrada.' });
    }

    const dadosFichaTreino = {};

    if (nome !== undefined) dadosFichaTreino.nome = nome;
    if (grupo_id !== undefined) dadosFichaTreino.grupo_id = BigInt(grupo_id);

    // CORREÇÃO: Aplicando o date-fns no update dinâmico
    if (data_inicio !== undefined) dadosFichaTreino.data_inicio = parseDataBr(data_inicio);
    if (data_fim !== undefined) dadosFichaTreino.data_fim = parseDataBr(data_fim);

    const fichaTreinoAtualizada = await prisma.fichaTreino.update({
      where: { id: BigInt(id) },
      data: dadosFichaTreino,
    });

    return res.status(200).json({
      message: 'Ficha de treino atualizada com sucesso.',
      ficha: formatBigInt(fichaTreinoAtualizada), // Ajustado termo aqui
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar ficha de treino.',
      message: error.message,
    });
  }
});

// 6. Adicionar exercicio em uma ficha
router.post('/:id/exercicios', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { exercicio_id, series, repeticoes, descanso_segundos, carga_sugerida } = req.body;

    const exercicioExiste = await prisma.exercicio.findUnique({
      where: { id: BigInt(exercicio_id) },
    });

    if (!exercicioExiste) {
      return res.status(404).json({ erro: 'O exercício informado não existe.' });
    }

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
          select: { nome: true },
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

// 7. Atualizar o exercício da ficha de treino
router.patch('/exercicios/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { series, repeticoes, descanso_segundos, carga_sugerida } = req.body;

    const dadosFichaExercicio = {};

    if (series !== undefined) dadosFichaExercicio.series = series;
    if (repeticoes !== undefined) dadosFichaExercicio.repeticoes = repeticoes;
    if (descanso_segundos !== undefined) dadosFichaExercicio.descanso_segundos = descanso_segundos;
    if (carga_sugerida !== undefined) dadosFichaExercicio.carga_sugerida = carga_sugerida;

    const fichaExercicioAtualizada = await prisma.fichaExercicio.update({
      where: { id: BigInt(id) },
      data: dadosFichaExercicio,
    });

    return res.status(200).json({
      message: 'Exercício atualizado com sucesso.',
      // BUGFIX ORIGINAL: Sua variável começava com 'F' maiúsculo e quebrava aqui
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

// 8. Remover exercício da ficha
router.delete('/:id/exercicios/:exercicio_id', auth, async (req, res) => {
  try {
    const { id, exercicio_id } = req.params;

    await prisma.fichaExercicio.deleteMany({
      where: {
        id: BigInt(id),
        exercicio_id: BigInt(exercicio_id),
      },
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

// 9. Vincular Aluno
router.put('/:id/vincular-aluno', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { aluno_id } = req.body;

    const fichaTreinoExiste = await prisma.fichaTreino.findUnique({
      where: { id: BigInt(id) },
    });

    if (!fichaTreinoExiste) {
      return res.status(404).json({ message: 'Ficha de treino não encontrada.' });
    }

    const aluno = await prisma.aluno.findUnique({
      where: { id: BigInt(aluno_id) },
    });

    if (!aluno) {
      return res.status(404).json({ message: 'Aluno não encontrado' });
    }

    const ficha = await prisma.fichaTreino.update({
      where: { id: BigInt(id) },
      data: { aluno_id: BigInt(aluno_id) },
    });

    res.json(formatBigInt(ficha));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao vincular ficha de treino ao aluno.',
      message: error.message,
    });
  }
});

// 10. Desvincular ficha a um aluno
router.delete('/:id/desvincular-aluno/:aluno_id', auth, async (req, res) => {
  try {
    const { id, aluno_id } = req.params;

    const fichaTreinoVinculada = await prisma.fichaTreino.findUnique({
      where: {
        id: BigInt(id),
        aluno_id: BigInt(aluno_id),
      },
    });

    if (!fichaTreinoVinculada) {
      return res.status(404).json({
        message: 'Esta ficha de treino não foi vinculada a esse aluno.',
      });
    }

    const fichaTreinoAtualizada = await prisma.fichaTreino.update({
      where: { id: BigInt(id) },
      data: { aluno_id: null },
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

// 11. Excluir ficha
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
