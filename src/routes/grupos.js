import express from "express"
import prisma from "../../prisma/client.js"
import auth from "../middlewares/auth.js"

const router = express.Router()

const formatBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  )

// LISTAR GRUPOS
router.get("/", auth, async (req, res) => {

  try {

    const grupos = await prisma.grupoTreino.findMany({
      include: {
        professor: true
      }
    })

    res.json(grupos)

  } catch (error) {

    res.status(500).json(error)

  }

})


// CRIAR GRUPO
router.post("/", auth, async (req, res) => {

  try {

    const professor_id = req.usuario.professor_id

    const {
      nome,
      descricao,
      nivel
    } = req.body

    const grupo = await prisma.grupoTreino.create({
      data: {
        nome,
        descricao,
        nivel,
        criado_por: professor_id
      }
    })

    res.status(201).json(grupo)

  } catch (error) {

    res.status(500).json(error)

  }

})

//ALTERAR GRUPO
router.put("/:id", async (req, res) => {
  try{
    const { id } = req.params;
    const { nome, descricao, nivel } = req.body;
    const professor_id = req.usuario.professor_id;

    if(!nome){
      return res.status(400).json({
        error: "Preencha o campo Nome."
      })
    }

    const grupoExiste = await prisma.grupoTreino.findUnique({
      where: { id: BigInt(id) }
    });

    if (!grupoExiste) {
      return res.status(404).json({
        error: "O grupo não existe."
      });
    }

    const grupoAtualizado = await prisma.grupoTreino.update({
      where: { id: BigInt(id) },
      data: {
        nome,
        descricao,
        nivel,
        criado_por: professor_id, 
      }
    });

    res.json({
      message: "Grupo atualizado com sucesso.",
      grupo: formatBigInt(grupoAtualizado)
    });
 
  }catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try{
    const { id } = req.params;

    const grupoExiste = await prisma.grupoTreino.findUnique({
      where: { id: BigInt(id) }
    });

    if(!grupoExiste){
      return res.status(404).json({
        error: "O grupo não existe."
      });
    }

    await prisma.grupoTreino.delete({
      where: { id: BigInt(id) }
    });

    res.json({
      message: "Grupo excluido com sucesso."
    });

  }catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
})

export default router