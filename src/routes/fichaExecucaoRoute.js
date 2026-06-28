import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';
import { processarGamificacaoTreino } from '../services/gamificacao.js';

const router = express.Router();

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );

// Iniciar ficha
router.post('/iniciar/:ficha_id', auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;
    const { ficha_id } = req.params;

    if (!aluno_id) {
      return res.status(403).json({
        error: 'Apenas alunos podem iniciar fichas.',
      });
    }

    const ficha = await prisma.fichaTreino.findUnique({
      where: { id: BigInt(ficha_id) },
    });

    if (!ficha) {
      return res.status(404).json({
        error: 'Ficha não encontrada.',
      });
    }

    if (!ficha.treino_id) {
      return res.status(400).json({
        error: 'Esta ficha não está vinculada a nenhum treino.',
      });
    }

    const execucaoTreino = await prisma.execucaoTreino.findFirst({
      where: {
        treino_id: BigInt(ficha.treino_id),
        aluno_id: BigInt(aluno_id),
        status: 'EM_ANDAMENTO',
      },
      orderBy: {
        iniciado_em: 'desc',
      },
    });

    if (!execucaoTreino) {
      return res.status(400).json({
        error: 'Inicie o treino antes de iniciar a ficha.',
      });
    }

    const fichaAndamento = await prisma.execucaoFicha.findFirst({
      where: {
        ficha_id: BigInt(ficha_id),
        aluno_id: BigInt(aluno_id),
        execucao_treino_id: execucaoTreino.id,
        status: 'EM_ANDAMENTO',
      },
      orderBy: {
        iniciado_em: 'desc',
      },
    });

    if (fichaAndamento) {
      return res.status(200).json(formatBigInt(fichaAndamento));
    }

    const fichaFinalizadaNesteTreino = await prisma.execucaoFicha.findFirst({
      where: {
        ficha_id: BigInt(ficha_id),
        aluno_id: BigInt(aluno_id),
        execucao_treino_id: execucaoTreino.id,
        status: 'FINALIZADA',
      },
    });

    if (fichaFinalizadaNesteTreino) {
      return res.status(400).json({
        error: 'Esta ficha já foi finalizada nesta execução do treino.',
      });
    }

    const execucao = await prisma.execucaoFicha.create({
      data: {
        ficha_id: BigInt(ficha_id),
        aluno_id: BigInt(aluno_id),
        execucao_treino_id: execucaoTreino.id,
        status: 'EM_ANDAMENTO',
      },
    });

    return res.status(201).json(formatBigInt(execucao));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao inicializar ficha.',
      message: error.message,
    });
  }
});

// Registrar exercício da ficha
router.post('/exercicios/registrar/:execucao_id/:ficha_exercicio_id', auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;
    const { execucao_id, ficha_exercicio_id } = req.params;
    const { carga_real } = req.body;

    if (!aluno_id) {
      return res.status(403).json({
        error: 'Apenas alunos podem registrar treinos.',
      });
    }

    if (isNaN(Number(execucao_id)) || isNaN(Number(ficha_exercicio_id))) {
      return res.status(400).json({
        error: 'Os identificadores fornecidos são inválidos.',
      });
    }

    const idExecucao = BigInt(execucao_id);
    const idFichaExercicio = BigInt(ficha_exercicio_id);
    const idAluno = BigInt(aluno_id);

    const execucaoFicha = await prisma.execucaoFicha.findFirst({
      where: {
        id: idExecucao,
        aluno_id: idAluno,
        status: 'EM_ANDAMENTO',
      },
    });

    if (!execucaoFicha) {
      return res.status(404).json({
        error: 'Execução da ficha não encontrada ou não está em andamento.',
      });
    }

    const fichaExercicio = await prisma.fichaExercicio.findFirst({
      where: {
        id: idFichaExercicio,
        ficha_id: execucaoFicha.ficha_id,
      },
    });

    if (!fichaExercicio) {
      return res.status(404).json({
        error: 'Este exercício não pertence à ficha em execução.',
      });
    }

    const registroExistente = await prisma.registroTreino.findUnique({
      where: {
        execucao_id_ficha_exercicio_id: {
          execucao_id: idExecucao,
          ficha_exercicio_id: idFichaExercicio,
        },
      },
    });

    if (registroExistente && registroExistente.aluno_id !== idAluno) {
      return res.status(403).json({
        error: 'Você não tem permissão para alterar este registro.',
      });
    }

    const dezSegundosAtras = new Date(Date.now() - 10 * 1000);

    const ultimoExercicioFinalizado = await prisma.registroTreino.findFirst({
      where: {
        aluno_id: idAluno,
        execucao_id: idExecucao,
        data_execucao: {
          gte: dezSegundosAtras,
        },
        NOT: {
          ficha_exercicio_id: idFichaExercicio,
        },
      },
      orderBy: {
        data_execucao: 'desc',
      },
    });

    if (ultimoExercicioFinalizado && !registroExistente) {
      return res.status(400).json({
        error: 'Você deve aguardar 10 segundos para concluir outro exercício.',
      });
    }

    const registro = await prisma.registroTreino.upsert({
      where: {
        execucao_id_ficha_exercicio_id: {
          execucao_id: idExecucao,
          ficha_exercicio_id: idFichaExercicio,
        },
      },
      update: {
        carga_real:
          carga_real !== undefined && carga_real !== null
            ? parseFloat(carga_real)
            : null,
        data_execucao: new Date(),
      },
      create: {
        aluno_id: idAluno,
        execucao_id: idExecucao,
        ficha_exercicio_id: idFichaExercicio,
        carga_real:
          carga_real !== undefined && carga_real !== null
            ? parseFloat(carga_real)
            : null,
        data_execucao: new Date(),
      },
    });

    return res.status(200).json({
      message: 'Exercício registrado com sucesso!',
      registro: formatBigInt(registro),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao registrar execução do exercício.',
      message: error.message,
    });
  }
});

// Finalizar ficha
router.post('/finalizar/:ficha_id', auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;
    const { ficha_id } = req.params;

    if (!aluno_id) {
      return res.status(403).json({
        error: 'Apenas alunos podem finalizar fichas.',
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const ficha = await tx.fichaTreino.findUnique({
        where: { id: BigInt(ficha_id) },
      });

      if (!ficha) {
        throw new Error('Ficha não encontrada.');
      }

      if (!ficha.treino_id) {
        throw new Error('Esta ficha não está vinculada a nenhum treino.');
      }

      const execucaoTreino = await tx.execucaoTreino.findFirst({
        where: {
          treino_id: BigInt(ficha.treino_id),
          aluno_id: BigInt(aluno_id),
          status: 'EM_ANDAMENTO',
        },
        orderBy: { iniciado_em: 'desc' },
      });

      if (!execucaoTreino) {
        throw new Error('Nenhuma execução de treino em andamento encontrada.');
      }

      const execucao = await tx.execucaoFicha.findFirst({
        where: {
          ficha_id: BigInt(ficha_id),
          aluno_id: BigInt(aluno_id),
          execucao_treino_id: execucaoTreino.id,
          status: 'EM_ANDAMENTO',
        },
        orderBy: { iniciado_em: 'desc' },
      });

      if (!execucao) {
      throw new Error('Nenhuma execução em andamento encontrada para esta ficha.');
      }

      const totalExerciciosFicha = await tx.fichaExercicio.count({
        where: { ficha_id: BigInt(ficha_id) },
      });

      const exerciciosRespondidos = await tx.registroTreino.count({
        where: {
          aluno_id: BigInt(aluno_id),
          execucao_id: execucao.id,
          fichaExercicio: {
            ficha_id: BigInt(ficha_id),
          },
        },
      });

      if (exerciciosRespondidos < totalExerciciosFicha) {
        throw new Error(
          `Finalize todos os exercícios antes de finalizar a ficha. Concluídos: ${exerciciosRespondidos}/${totalExerciciosFicha}.`,
        );
      }

      const execucaoAtualizada = await tx.execucaoFicha.update({
        where: { id: execucao.id },
        data: {
          status: 'FINALIZADA',
          finalizado_em: new Date(),
        },
      });

      return execucaoAtualizada;
    });

    const conquistasGanhas = await processarGamificacaoTreino(aluno_id);

    return res.status(200).json({
      mensagem: 'Ficha finalizada com sucesso!',
      execucao: formatBigInt(resultado),
      conquistasGanhas,
    });
  } catch (error) {
    console.error('Erro:', error);

    return res.status(400).json({
      error: error.message || 'Erro ao finalizar ficha.',
    });
  }
});

export default router;