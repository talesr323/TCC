import auth from '../middlewares/auth.js';
import express from 'express';
import prisma from '../../prisma/client.js';

const router = express.Router();

const GRUPOS_MUSCULARES = [
  'Abdômen',
  'Antebraço',
  'Bíceps',
  'Cardio',
  'Costas',
  'Glúteos',
  'Ombro',
  'Panturrilha',
  'Peito',
  'Perna',
  'Trapézio',
  'Tríceps',
];

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

  router.get('/select/grupos-musculares', auth, (req, res) => {
  return res.json(GRUPOS_MUSCULARES);
  });

//Criar exercício
router.post('/', auth, async (req, res) => {
  try {
    const professor_id = req.usuario.professor_id;
    const { nome, descricao, grupo_muscular, midia_url } = req.body;

    // 1. Fazer a validação básica
    const camposValidacao = [
      { valor: nome, campoNome: 'Nome' },
      { valor: grupo_muscular, campoNome: 'Grupo Muscular' },
    ];

    const campoVazio = camposValidacao.find((campo) => {
      if (typeof campo.valor === 'string') return !campo.valor.trim();
    });

    if (campoVazio) {
      return res.status(400).json({
        error: `O campo "${campoVazio.campoNome}" é obrigatório.`,
      });
    }

    //1.1. Fazer a validação do grupo muscular selecionado
    if (!GRUPOS_MUSCULARES.includes(grupo_muscular)) {
      return res.status(400).json({
        error: `Grupo muscular inválido. Escolha uma das opções: ${GRUPOS_MUSCULARES.join(', ')}.`,
      });
    }

    //2. Verificar se o exercício já existe
    const exercicioExiste = await prisma.exercicio.findFirst({
      where: {
        nome: {
          equals: nome.trim(),
        },
      },
    });

    if (exercicioExiste) {
      return res.status(400).json({
        error: 'Esse exercício já foi cadastrado.',
      });
    }

    //3. Criar o exercício
    const exercicio = await prisma.exercicio.create({
      data: {
        nome: nome.trim(),
        descricao,
        grupo_muscular,
        midia_url: midia_url ? midia_url.trim() : null,
        professor: {
          connect: { id: professor_id },
        },
      },
    });

    return res.status(201).json(exercicio);
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao cadastrar exercício.',
      message: error.message,
    });
  }
});

//Listar todos os exercícios (com opção de filtrar por grupo muscular)
router.get('/grupo-muscular/', auth, async (req, res) => {
  try {
    //1. Capturar o grupo muscular dos parâmetros da URL (Ex: /exercicios?grupo_muscular=Pernas)
    const { grupo_muscular } = req.query;

    //2. Criar o objeto de condições para a busca
    const onde = {};

    //2.1. Se o filtro foi enviado na URL, adiciona ele na busca de forma inteligente
    if (grupo_muscular) {
      onde.grupo_muscular = {
        equals: grupo_muscular.trim(),
      };
    }

    //3. Executar a busca no Prisma aplicando o filtro (se houver)
    const exercicios = await prisma.exercicio.findMany({
      where: onde,
      orderBy: {
        nome: 'asc',
      },
    });

    return res.json(exercicios);
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro no sistema.',
      message: error.message,
    });
  }
});

// Buscar exercício por nome
router.get('/', auth, async (req, res) => {
  try {
    const { nome } = req.query;

    //1. Buscar por nome
    if (nome && String(nome).trim() !== '') {
      const exerciciosPorNome = await prisma.exercicio.findMany({
        where: {
          nome: {
            contains: String(nome),
          },
        },
      });

      if (!exerciciosPorNome) {
        return res.status(404).json({
          error: 'O exercício não existe.',
        });
      }

      return res.status(200).json(exerciciosPorNome);
    }
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao buscar exercício.',
      message: error.message,
    });
  }
});

//Atualizar os dados do exercício
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, grupo_muscular, midia_url } = req.body;

    //1. Verificar se o exercício existe
    const exercicioExiste = await prisma.exercicio.findFirst({
      where: {
        id: BigInt(id),
      },
    });

    if (!exercicioExiste) {
      return res.status(400).json({
        error: 'O exercício não existe.',
      });
    }

    //2. Criar um objeto dinâmico com os campos que serão atualizados na tabela Exercicio
    const dadosExercicio = {};

    if (nome !== undefined) dadosExercicio.nome = nome;
    if (descricao !== undefined) dadosExercicio.descricao = descricao;
    if (grupo_muscular !== undefined) dadosExercicio.grupo_muscular = grupo_muscular;
    if (midia_url !== undefined) dadosExercicio.midia_url = midia_url;

    //3. Executar a atualização no banco de dados
    const exercicioAtualizado = await prisma.exercicio.update({
      where: { id: BigInt(id) },
      data: dadosExercicio,
    });

    return res.status(200).json({
      message: 'Exercício atualizado com sucesso.',
      exercicio: formatBigInt(exercicioAtualizado),
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar exercício.',
      message: error.message,
    });
  }
});

//Excluir exercício
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    //1. Buscar o exercício
    const exercicioExiste = await prisma.exercicio.findUnique({
      where: { id: BigInt(id) },
    });

    //1.1. Se o exercício não existir
    if (!exercicioExiste) {
      return res.status(400).json({
        error: 'Exercício não encontrado.',
      });
    }

    //2. Deletar o exercício
    await prisma.exercicio.delete({
      where: { id: BigInt(id) },
    });

    res.json({
      message: 'Exercício excluído com sucesso',
    });
  } catch (error) {
    console.error('Erro:', error);

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'O exercício está em uso na ficha.',
      });
    }

    return res.status(500).json({
      error: 'Erro ao excluir exercício.',
      message: error.message,
    });
  }
});

export default router;
