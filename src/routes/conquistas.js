import express from 'express';
import prisma from '../../prisma/client.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

// LISTAR CONQUISTAS
router.get('/', auth, async (req, res) => {
  try {
    const conquistas = await prisma.conquista.findMany();

    return res.json(conquistas);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

// CRIAR CONQUISTA (admin)
router.post('/', auth, async (req, res) => {
  try {
    const { nome, descricao, xp_bonus } = req.body;

    const conquista = await prisma.conquista.create({
      data: {
        nome,
        descricao,
        xp_bonus,
      },
    });

    return res.status(201).json(conquista);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
