import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';
import { processarGamificacaoTreino } from '../services/gamificacao.js';

const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Iniciar treino
router.post('/iniciar/:ficha_id', auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;
    const { ficha_id } = req.params;

    //Verificar se já não existe um treino em andamento
    const treinoAndamento = await prisma.execucaoFicha.findFirst({
      where: {
        ficha_id: BigInt(ficha_id),
        aluno_id: BigInt(aluno_id),
        status: 'EM_ANDAMENTO',
      },
    });

    if (treinoAndamento) {
      return res.status(400).json({
        error: 'Você já possui uma sessão desse treino em andamento.',
        execucao: formatBigInt(treinoAndamento),
      });
    }

    //Caso não exista, iniciar o treino
    const execucao = await prisma.execucaoFicha.create({
      data: {
        ficha_id: BigInt(ficha_id),
        aluno_id: BigInt(aluno_id),
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

//Atualizar a carga real e a data de execução de um exercício específico
router.post('/exercicios/registrar/:execucao_id/:ficha_exercicio_id', auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;
    const { execucao_id, ficha_exercicio_id } = req.params;
    const { carga_real } = req.body;

    // 1. Validação de Segurança: Garante que o usuário logado é de fato um aluno
    if (!aluno_id) {
      return res.status(403).json({ error: 'Apenas alunos podem registrar treinos.' });
    }

    // 2. Validação dos IDs da URL para evitar quebra do BigInt
    if (isNaN(Number(execucao_id)) || isNaN(Number(ficha_exercicio_id))) {
      return res.status(400).json({ error: 'Os identificadores fornecidos são inválidos.' });
    }

    const idExecucao = BigInt(execucao_id);
    const idFichaExercicio = BigInt(ficha_exercicio_id);
    const idAluno = BigInt(aluno_id);

    // 3. Validação Opcional: Se houver um registro existente, garantir que pertence a este aluno
    const registroExistente = await prisma.registroTreino.findUnique({
      where: {
        execucao_id_ficha_exercicio_id: {
          execucao_id: idExecucao,
          ficha_exercicio_id: idFichaExercicio,
        },
      },
    });

    if (registroExistente && registroExistente.aluno_id !== idAluno) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar este registro.' });
    }

    // 4. Executa o Upsert com segurança
    const registro = await prisma.registroTreino.upsert({
      where: {
        execucao_id_ficha_exercicio_id: {
          execucao_id: idExecucao,
          ficha_exercicio_id: idFichaExercicio,
        },
      },
      update: {
        // Se carga_real for enviada, valida e converte, senão mantém nula/não altera
        carga_real: carga_real !== undefined && carga_real !== null ? parseFloat(carga_real) : null,
        data_execucao: new Date(), // Gera o objeto Date padrão aceito pelo Prisma
      },
      create: {
        aluno_id: idAluno,
        execucao_id: idExecucao,
        ficha_exercicio_id: idFichaExercicio,
        carga_real: carga_real !== undefined && carga_real !== null ? parseFloat(carga_real) : null,
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

//Finalizar treino
router.post('/finalizar/:ficha_id', auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;
    const { ficha_id } = req.params;

    if (!aluno_id) {
      return res.status(403).json({
        error: 'Apenas alunos podem finalizar treinos.',
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const execucao = await tx.execucaoFicha.findFirst({
        where: {
          ficha_id: BigInt(ficha_id),
          aluno_id: BigInt(aluno_id),
          status: 'EM_ANDAMENTO',
        },
        orderBy: { iniciado_em: 'desc' },
      });

      if (!execucao) {
        throw new Error('Nenhuma execução de treino em andamento encontrada para esta ficha.');
      }

      const dozeHorasAtras = new Date(Date.now() - 10 * 1000);

      const finalizouNasUltimas12Horas = await tx.execucaoFicha.findFirst({
        where: {
          aluno_id: BigInt(aluno_id),
          status: 'FINALIZADA',
          finalizado_em: {
            gte: dozeHorasAtras,
          },
        },
      });

      if (finalizouNasUltimas12Horas) {
        throw new Error('Você só pode finalizar uma ficha a cada 12 horas.');
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
          `Finalize todos os exercícios antes de finalizar a ficha. Concluídos: ${exerciciosRespondidos}/${totalExerciciosFicha}.`
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
      mensagem: 'Treino finalizado com sucesso!',
      execucao: formatBigInt(resultado),
      conquistasGanhas,
    });
  } catch (error) {
    console.error('Erro:', error);

    return res.status(400).json({
      error: error.message || 'Erro ao finalizar treino.',
    });
  }
});

export default router;
