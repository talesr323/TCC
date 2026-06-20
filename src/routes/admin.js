import bcrypt from 'bcrypt';
import { cnpj as cnpjValidator, cpf as cpfValidator } from 'cpf-cnpj-validator';
import express from 'express';
import { PrismaClient } from '@prisma/client';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const prisma = new PrismaClient();
const router = express.Router();

//Função para tratar BigInt
const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );

//Cadastrar admin/academia
router.post('/', async (req, res) => {
  try {
    const {
      //academia
      nomeAcademia,
      cnpj,
      endereco,
      cep,
      cidade,
      estado,

      //admin
      nome,
      sobrenome,
      email,
      cpf,
      telefone,
      senha,
    } = req.body;

    //✅ Validação básica
    if (!nomeAcademia || nomeAcademia.trim() === '') {
      return res.status(400).json({ error: "O campo 'Nome Fantasia' é obrigatório." });
    }

    // Corrigido para usar o validador renomeado
    if (!cnpjValidator.isValid(cnpj)) {
      return res.status(400).json({ error: 'CNPJ inválido.' });
    }

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: "O campo 'Nome' é obrigatório." });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({ error: "O campo 'E-mail' é obrigatório." });
    } else if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Campo 'E-mail inválido." });
    }

    // Corrigido para usar o validador renomeado
    if (!cpfValidator.isValid(cpf)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    // Corrigido de .lenght para .length
    if (!senha || senha.length < 8) {
      return res.status(400).json({ error: 'A senha tem que ter no mínimo 8 caracteres.' });
    }

    //✅ Verificar se sistema já foi inicializado
    const adminExiste = await prisma.admin.findFirst();

    if (adminExiste) {
      return res.status(400).json({ error: 'O sistema já foi inicializado.' });
    }

    //🔒 Hash da senha
    const senha_hash = await bcrypt.hash(senha, 10);

    //✅ Iniciar uma transação
    const resultadoTransacao = await prisma.$transaction(async (tx) => {
      // Alterado o nome da constante para 'novaAcademia'
      const novaAcademia = await tx.academia.create({
        data: {
          nome: nomeAcademia,
          cnpj,
          endereco,
          cep,
          cidade,
          estado,
        },
      });

      const usuario = await tx.usuario.create({
        data: {
          nome: `${nome} ${sobrenome}`,
          email,
          cpf,
          telefone,
          senha_hash,
          ativo: true,
          academia_id: novaAcademia.id, // Corrigido para pegar de novaAcademia
        },
      });

      await tx.admin.create({
        data: {
          usuario_id: usuario.id,
        },
      });

      return { usuario, academia: novaAcademia }; // Corrigido aqui também
    });

    return res.status(201).json({
      message: 'Sistema inicializado com sucesso',
      usuario: formatBigInt(resultadoTransacao.usuario),
      academia: formatBigInt(resultadoTransacao.academia),
    });
  } catch (error) {
    console.error(error); // Fique de olho no seu terminal/console para ver os detalhes se algo mais falhar!
    return res.status(500).json({ error: 'Erro ao inicializar sistema' });
  }
});

export default router;
