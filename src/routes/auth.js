const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

/*Cadastro do Primeiro Administrador*/
router.post("/primeiro-admin", async (req, res) => {
  const { email, senha, nome, cpf } = req.body;

  const adminExiste = await prisma.admin.findFirst();

  if (adminExiste) {
    return res.status(403).json({ error: "Sistema já inicializado" });
  }

  const senha_hash = await bcrypt.hash(senha, 10);

  const user = await prisma.usuario.create({
    data: {
      email,
      cpf,
      nome,
      senha_hash,
      ativo: true,
      admin: { create: {} }
    }
  });

  res.json({ message: "ADMIN criado", id: user.id.toString() });
});

/*Ativação de Usuario*/
router.post("/ativar", async (req, res) => {
  const { token, senha } = req.body;

  const registro = await prisma.tokenAtivacao.findUnique({
    where: { token },
    include: { usuario: true }
  });

  if (!registro || registro.usado)
    return res.status(400).json({ error: "Token inválido" });

  if (registro.expira_em < new Date())
    return res.status(400).json({ error: "Token expirado" });

  const senha_hash = await bcrypt.hash(senha, 10);

  await prisma.usuario.update({
    where: { id: registro.usuario_id },
    data: { senha_hash, ativo: true }
  });

  await prisma.tokenAtivacao.update({
    where: { id: registro.id },
    data: { usado: true }
  });

  res.json({ message: "Conta ativada com sucesso" });
});

/* Login */
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const user = await prisma.usuario.findUnique({
    where: { email },
    include: { admin: true, professor: true, aluno: true }
  });

  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  if (!user.ativo) return res.status(403).json({ error: "Conta não ativada" });
  if (!user.senha_hash) return res.status(403).json({ error: "Senha não definida" });

  const valid = await bcrypt.compare(senha, user.senha_hash);
  if (!valid) return res.status(401).json({ error: "Senha inválida" });

  let tipo = "USER";
  if (user.admin) tipo = "ADMIN";
  else if (user.professor) tipo = "PROFESSOR";
  else if (user.aluno) tipo = "ALUNO";

  const token = jwt.sign(
    { id: user.id.toString(), tipo },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token, tipo });
});

module.exports = router;