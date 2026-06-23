import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';
import { processarGamificacaoTreino } from '../services/gamificacao.js';

const router = express.Router();

//Iniciar treino
router.post('/iniciar/:fichaId', auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;
    const fichaId = req.params.fichaId;

    const execucao = await prisma.execucaoFicha.create({
      data: {
        ficha_id: fichaId,
        aluno_id,
      },
    });

    res.status(201).json(execucao);
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao inicializar ficha.',
      message: error.message,
    });
  }
});

//Finalizar treino e aplicar a gamificação
router.post('/finalizar/:fichaId', auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;
    const fichaId = req.params.fichaId;

    const XP_PADRAO_TREINO = 100; //Valor padrão de XP que o treino vai dar

    //1. Executar tudo dentro de uma transação para garantir a consistência
    const resultado = await prisma.$transaction(async (tx) => {
      //1.1. Buscar a execução, garantindo que ela pertença a um aluno e está em andamento
      const execucao = await tx.execucaoFicha.findFirst({
        where: {
          id: fichaId,
          aluno_id: aluno_id,
          status: 'EM_ANDAMENTO',
        },
      });

      if (!execucao) {
        throw new Error('Falha na execução de treino.');
      }

      //1.2. Atualizar o status de execução para "Finalizada"
      const execucaoAtualizada = await tx.execucaoFicha.update({
        where: { id: execucaoId },
        data: {
          status: 'FINALIZADA',
          finalizado_em: new Date(),
          xp_ganha: XP_PADRAO_TREINO,
        },
      });

      return execucaoAtualizada;
    });

    //2. Processar os ganhos de XP, moedas e conquistas
    await processarGamificacaoTreino(aluno_id, XP_PADRAO_TREINO, 15);

    res.status(200).json({
      mensagem: 'Treino finalizado com sucesso! Recompensas computadas.',
      execucao: resultado,
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao finalizar treino.',
      message: error.message,
    });
  }
});

export default router;
