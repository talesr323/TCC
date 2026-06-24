import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';

const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Cadastrar conquista
router.post('/', auth, async (req, res) => {
  try {
    const admin_id = req.usuario.admin_id;
    const { nome, descricao, xp_bonus } = req.body;

    //1. Fazer a validação básica
    const validaçãoBasica = [
      { valor: nome, campoNome: 'Nome' },
      { valor: descricao, campoNome: 'Descrição' },
      { valor: xp_bonus, campoNome: 'XP' },
    ];

    const campoVazio = validaçãoBasica.find((campo) => {
      if (campo.valor === null || campo.valor === undefined) return true;

      if (typeof campo.valor === 'string') return !campo.valor.trim();

      return false;
    });

    if (campoVazio) {
      return res.status(400).json({
        error: `O campo "${campoVazio.campoNome}" é obrigatório.`,
      });
    }

    //2. Criar a conquista
    const conquista = await prisma.conquista.create({
      data: {
        nome: nome.trim(),
        descricao,
        xp_bonus,
      },
    });

    return res.status(201).json(conquista);
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao cadastrar conquista.',
      message: error.message,
    });
  }
});

//Listar conquista
router.get('/', auth, async (req, res) => {
  try {
    const conquistas = await prisma.conquista.findMany();

    return res.json(conquistas);
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro no sistema.',
      message: error.message,
    });
  }
});

//Atualizar os dados da conquista
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.usuario.admin_id;
    const { nome, descricao, xp_bonus } = req.body;

    //1. Verificar se a conquista existe
    const conquistaExiste = await prisma.conquista.findFirst({
      where: {
        id: BigInt(id),
      },
    });

    if (!conquistaExiste) {
      return res.status(400).json({
        error: 'Conquista não encontrada.',
      });
    }

    //2. Criar um objeto dinâmico com os campos que serão atualizados na tabela Conquistas
    const dadosConquista = {};

    if (nome !== undefined) dadosConquista.nome = nome;
    if (descricao !== undefined) dadosConquista.descricao = descricao;
    if (xp_bonus !== undefined) dadosConquista.xp_bonus = xp_bonus;

    //3. Executar a atualização no banco de dados
    const conquistaAtualizada = await prisma.conquista.update({
      where: { id: BigInt(id) },
      data: dadosConquista,
    });

    return res.status(200).json({
      message: 'Conquista atualizada com sucesso.',
      exercicio: formatBigInt(conquistaAtualizada),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar conquista.',
      message: error.message,
    });
  }
});

//Excluir a conquista
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.usuario.admin_id;

    //1. Buscar conquista
    const conquistaExiste = await prisma.conquista.findUnique({
      where: { id: BigInt(id) },
    });

    if (!conquistaExiste) {
      return res.status(400).json({
        error: 'Conquista não encontrada.',
      });
    }

    //2. Deletar a conquista
    await prisma.conquista.delete({
      where: { id: BigInt(id) },
    });

    res.json({
      message: 'Conquista excluida com sucesso.',
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
