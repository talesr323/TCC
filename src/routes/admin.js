const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middlewares/auth");
const onlyAdmin = require("../middlewares/admin");
const crypto = require("crypto");

const router = express.Router();

/*Admin Cria Usuario*/
router.post("/criar-usuario", auth, onlyAdmin, async (req, res) => {
  try {

    const { email, nome, cpf, tipo, cref } = req.body;

    if (!["ALUNO", "PROFESSOR"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo inválido" });
    }

    if (tipo === "PROFESSOR" && !cref) {
      return res.status(400).json({ error: "CREF é obrigatório para professor" });
    }

    const user = await prisma.usuario.create({
      data: {
        email,
        nome,
        cpf,
        ativo: false,
        ...(tipo === "PROFESSOR" && {
          professor: {
            create: { cref }
          }
        }),
        ...(tipo === "ALUNO" && {
          aluno: { create: {} }
        })
      }
    });

    const token = crypto.randomUUID();

    await prisma.tokenAtivacao.create({
      data: {
        token,
        usuario_id: user.id,
        expira_em: new Date(Date.now() + 86400000)
      }
    });

    res.json({
      message: "Usuário criado",
      tokenAtivacao: token
    });

  } catch (error) {
  console.error("ERRO COMPLETO:", error);
  res.status(500).json({
    error: "Erro interno",
    details: error.message
  });
}
});

module.exports = router;