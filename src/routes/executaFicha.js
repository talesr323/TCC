import express from 'express';
import prisma from '../../prisma/client.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.post('/iniciar/:fichaId', auth, async (req, res) => {
  try {
    const aluno_id = BigInt(req.usuario.aluno_id);

    const fichaId = BigInt(req.params.fichaId);

    const execucao = await prisma.execucaoFicha.create({
      data: {
        ficha_id: fichaId,
        aluno_id,
      },
    });

    res.status(201).json(execucao);
  } catch (error) {
    res.status(500).json({
      erro: error.message,
    });
  }
});

export default router;
