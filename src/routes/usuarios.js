const express = require("express");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

router.post("/", async (req, res) => {
  try {
    const { email, cpf, senha, nome, telefone, foto_perfil, tipo, cref } = req.body;
    // tipo = "ADMIN" | "ALUNO" | "PROFESSOR"

    if (!email || !cpf || !senha || !nome) {
      return res.status(400).json({
        error: "Email, CPF, senha e nome são obrigatórios."
      });
    }

//Verificando se existe Admin Cadastrado
    const totalAdmins = await prisma.admin.count();

    let tipoFinal = tipo;

    if (totalAdmins === 0) {
      tipoFinal = "ADMIN";
    } else {
      if (!req.headers["x-admin"]) {
        return res.status(403).json({
          error: "Apenas administradores podem cadastrar usuários."
        });
      }

      if (!tipo) {
        return res.status(400).json({
          error: "Tipo de usuário é obrigatório (ADMIN, ALUNO, PROFESSOR)."
        });
      }
    }

    // Criptografa a senha
    const senha_hash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        email,
        cpf,
        senha_hash,
        nome,
        telefone,
        foto_perfil
      }
    });

    let perfil = null;

    if (tipoFinal === "ADMIN") {
      perfil = await prisma.admin.create({
        data: {
          usuario_id: usuario.id
        }
      });
    }

    if (tipoFinal === "PROFESSOR") {
      if (!cref) {
        return res.status(400).json({ error: "CREF é obrigatório para professor." });
      }

      perfil = await prisma.professor.create({
        data: {
          usuario_id: usuario.id,
          cref
        }
      });
    }

    if (tipoFinal === "ALUNO") {
      perfil = await prisma.aluno.create({
        data: {
          usuario_id: usuario.id
        }
      });
    }

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso",
      tipo: tipoFinal,
      usuario: formatBigInt(usuario),
      perfil: formatBigInt(perfil)
    });

  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      let campo = error.meta?.target;
      if (Array.isArray(campo)) campo = campo[0];

      if (typeof campo === "string") {
        if (campo.includes("email")) campo = "Email";
        else if (campo.includes("cpf")) campo = "CPF";
        else if (campo.includes("cref")) campo = "CREF";
      }

      return res.status(400).json({
        error: `${campo} já cadastrado.`
      });
    }

    return res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { id } = req.query;

    // Se buscar usuario por id
    if (id) {
      const usuario = await prisma.usuario.findUnique({
        where: { id: BigInt(id) }
      });

      if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      return res.json(formatBigInt(usuario));
    }

    // se n passar id
    const usuarios = await prisma.usuario.findMany();

    const usuariosFormatados = usuarios.map(user => ({
      ...user,
      id: user.id.toString()
    }));

    res.json(usuariosFormatados);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, cpf, senha, nome, telefone, foto_perfil } = req.body;

    //  usuário existe?
    const usuarioExiste = await prisma.usuario.findUnique({
      where: { id: BigInt(id) }
    });

    if (!usuarioExiste) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    let senha_hash = usuarioExiste.senha_hash;

    // Se vier nova senha, criptografa
    if (senha) {
      senha_hash = await bcrypt.hash(senha, 10);
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: BigInt(id) },
      data: {
        email,
        cpf,
        senha_hash,
        nome,
        telefone,
        foto_perfil
      }
    });

    return res.json({
      message: "Usuário atualizado com sucesso",
      usuario: formatBigInt(usuarioAtualizado)
    });

  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      let campo = error.meta?.target;
      if (Array.isArray(campo)) campo = campo[0];

      if (typeof campo === "string") {
        if (campo.includes("email")) campo = "Email";
        else if (campo.includes("cpf")) campo = "CPF";
      }

      return res.status(400).json({
        error: `${campo} já cadastrado.`
      });
    }

    return res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // verifica se existe usuariio?
    const usuarioExiste = await prisma.usuario.findUnique({
      where: { id: BigInt(id) }
    });

    if (!usuarioExiste) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    await prisma.usuario.delete({
      where: { id: BigInt(id) }
    });

    return res.json({
      message: "Usuário excluído com sucesso"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});


module.exports = router;

/*
1) Admin é criado
2) Admin cria usuário (sem senha real)
3) Sistema gera token de ativação
4) Usuário recebe token de ativação
5) Usuário define senha
6) Conta ativada
7) Login liberado
*/ 