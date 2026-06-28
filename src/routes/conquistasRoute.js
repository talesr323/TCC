import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';

const router = express.Router();

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  );

// Cadastrar conquista
router.post('/', auth, async (req, res) => {
  try {
    const admin_id = req.usuario.admin_id;
    const { nome, descricao, condicao_treinos } = req.body;

    if (!admin_id) {
      return res.status(403).json({
        error: 'Apenas administradores podem cadastrar conquistas.',
      });
    }

    const validacaoBasica = [
      { valor: nome, campoNome: 'Nome' },
      { valor: descricao, campoNome: 'Descrição' },
      { valor: condicao_treinos, campoNome: 'Quantidade de fichas finalizadas' },
    ];

    const campoVazio = validacaoBasica.find((campo) => {
      if (campo.valor === null || campo.valor === undefined) return true;
      if (typeof campo.valor === 'string') return !campo.valor.trim();
      return false;
    });

    if (campoVazio) {
      return res.status(400).json({
        error: `O campo "${campoVazio.campoNome}" é obrigatório.`,
      });
    }

    if (isNaN(Number(condicao_treinos)) || Number(condicao_treinos) < 0) {
      return res.status(400).json({
        error:
          'A quantidade de fichas finalizadas deve ser um número válido e maior ou igual a zero.',
      });
    }

    const conquistaExiste = await prisma.conquista.findUnique({
      where: {
        nome: nome.trim(),
      },
    });

    if (conquistaExiste) {
      return res.status(409).json({
        error: 'Já existe uma conquista cadastrada com esse nome.',
      });
    }

    const conquista = await prisma.conquista.create({
      data: {
        nome: nome.trim(),
        descricao: descricao.trim(),
        condicao_treinos: parseInt(condicao_treinos, 10),
      },
    });

    return res.status(201).json(formatBigInt(conquista));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao cadastrar conquista.',
      message: error.message,
    });
  }
});

// Listar conquistas
router.get('/', auth, async (req, res) => {
  try {
    const conquistas = await prisma.conquista.findMany({
      orderBy: {
        condicao_treinos: 'asc',
      },
    });

    return res.json(formatBigInt(conquistas));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro no sistema.',
      message: error.message,
    });
  }
});
// Listar todas as conquistas com status do aluno logado
router.get('/minhas/status', auth, async (req, res) => {
  try {
    const aluno_id = req.usuario.aluno_id;

    if (!aluno_id) {
      return res.status(403).json({
        error: 'Apenas alunos podem visualizar suas conquistas.',
      });
    }

    const conquistas = await prisma.conquista.findMany({
      orderBy: {
        condicao_treinos: 'asc',
      },
    });

    const conquistasDoAluno = await prisma.alunoConquista.findMany({
      where: {
        aluno_id: BigInt(aluno_id),
      },
    });

    const idsConcluidas = conquistasDoAluno.map((item) =>
      item.conquista_id.toString(),
    );

    const resultado = conquistas.map((conquista) => ({
      id: conquista.id.toString(),
      nome: conquista.nome,
      descricao: conquista.descricao,
      condicao_treinos: conquista.condicao_treinos,
      concluida: idsConcluidas.includes(conquista.id.toString()),
    }));

    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar conquistas.',
      message: error.message,
    });
  }
});

// Listar conquistas de um aluno específico
router.get('/:aluno_id', auth, async (req, res) => {
  try {
    const { aluno_id } = req.params;

    if (!aluno_id || isNaN(Number(aluno_id))) {
      return res.status(400).json({
        error: 'O ID do aluno fornecido é inválido.',
      });
    }

    const conquistasDoAluno = await prisma.alunoConquista.findMany({
      where: {
        aluno_id: BigInt(aluno_id),
      },
      include: {
        conquista: true,
      },
      orderBy: {
        recebido_em: 'desc',
      },
    });

    return res.status(200).json(formatBigInt(conquistasDoAluno));
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao buscar as conquistas do aluno.',
      message: error.message,
    });
  }
});

// Atualizar conquista
router.patch('/:id', auth, async (req, res) => {
  try {
    const admin_id = req.usuario.admin_id;
    const { id } = req.params;
    const { nome, descricao, condicao_treinos } = req.body;

    if (!admin_id) {
      return res.status(403).json({
        error: 'Apenas administradores podem atualizar conquistas.',
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        error: 'O ID da conquista é inválido.',
      });
    }

    const conquistaExiste = await prisma.conquista.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!conquistaExiste) {
      return res.status(404).json({
        error: 'Conquista não encontrada.',
      });
    }

    const dadosConquista = {};

    if (nome !== undefined) {
      if (!nome.trim()) {
        return res.status(400).json({
          error: 'O nome da conquista não pode ser vazio.',
        });
      }

      dadosConquista.nome = nome.trim();
    }

    if (descricao !== undefined) {
      if (!descricao.trim()) {
        return res.status(400).json({
          error: 'A descrição da conquista não pode ser vazia.',
        });
      }

      dadosConquista.descricao = descricao.trim();
    }

    if (condicao_treinos !== undefined) {
      if (isNaN(Number(condicao_treinos)) || Number(condicao_treinos) < 0) {
        return res.status(400).json({
          error:
            'A quantidade de fichas finalizadas deve ser um número válido e maior ou igual a zero.',
        });
      }

      dadosConquista.condicao_treinos = parseInt(condicao_treinos, 10);
    }

    const conquistaAtualizada = await prisma.conquista.update({
      where: {
        id: BigInt(id),
      },
      data: dadosConquista,
    });

    return res.status(200).json({
      message: 'Conquista atualizada com sucesso.',
      conquista: formatBigInt(conquistaAtualizada),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar conquista.',
      message: error.message,
    });
  }
});

// Excluir conquista
router.delete('/:id', auth, async (req, res) => {
  try {
    const admin_id = req.usuario.admin_id;
    const { id } = req.params;

    if (!admin_id) {
      return res.status(403).json({
        error: 'Apenas administradores podem excluir conquistas.',
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        error: 'O ID da conquista é inválido.',
      });
    }

    const conquistaExiste = await prisma.conquista.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!conquistaExiste) {
      return res.status(404).json({
        error: 'Conquista não encontrada.',
      });
    }

    await prisma.conquista.delete({
      where: {
        id: BigInt(id),
      },
    });

    return res.json({
      message: 'Conquista excluída com sucesso.',
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao excluir conquista.',
      message: error.message,
    });
  }
});

export default router;