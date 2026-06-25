/*
  Warnings:

  - You are about to drop the column `foto_perfil` on the `usuarios` table. All the data in the column will be lost.
  - You are about to drop the `alunoconquista` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conquista` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `execucaoficha` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ficha_exercicios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `registro_treino` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `relatorios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `senhas_recuperadas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuario_senhas` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[telefone]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.
  - Made the column `telefone` on table `usuarios` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `alunoconquista` DROP FOREIGN KEY `AlunoConquista_aluno_id_fkey`;

-- DropForeignKey
ALTER TABLE `alunoconquista` DROP FOREIGN KEY `AlunoConquista_conquista_id_fkey`;

-- DropForeignKey
ALTER TABLE `execucaoficha` DROP FOREIGN KEY `ExecucaoFicha_aluno_id_fkey`;

-- DropForeignKey
ALTER TABLE `execucaoficha` DROP FOREIGN KEY `ExecucaoFicha_ficha_id_fkey`;

-- DropForeignKey
ALTER TABLE `ficha_exercicios` DROP FOREIGN KEY `ficha_exercicios_exercicio_id_fkey`;

-- DropForeignKey
ALTER TABLE `ficha_exercicios` DROP FOREIGN KEY `ficha_exercicios_ficha_id_fkey`;

-- DropForeignKey
ALTER TABLE `registro_treino` DROP FOREIGN KEY `registro_treino_aluno_id_fkey`;

-- DropForeignKey
ALTER TABLE `registro_treino` DROP FOREIGN KEY `registro_treino_ficha_exercicio_id_fkey`;

-- DropForeignKey
ALTER TABLE `relatorios` DROP FOREIGN KEY `relatorios_gerado_por_fkey`;

-- DropForeignKey
ALTER TABLE `senhas_recuperadas` DROP FOREIGN KEY `senhas_recuperadas_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `usuario_senhas` DROP FOREIGN KEY `usuario_senhas_usuario_id_fkey`;

-- AlterTable
ALTER TABLE `usuarios` DROP COLUMN `foto_perfil`,
    MODIFY `telefone` VARCHAR(20) NOT NULL;

-- DropTable
DROP TABLE `alunoconquista`;

-- DropTable
DROP TABLE `conquista`;

-- DropTable
DROP TABLE `execucaoficha`;

-- DropTable
DROP TABLE `ficha_exercicios`;

-- DropTable
DROP TABLE `registro_treino`;

-- DropTable
DROP TABLE `relatorios`;

-- DropTable
DROP TABLE `senhas_recuperadas`;

-- DropTable
DROP TABLE `usuario_senhas`;

-- CreateTable
CREATE TABLE `fichas_exercicios` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ficha_id` BIGINT NOT NULL,
    `exercicio_id` BIGINT NOT NULL,
    `series` INTEGER NOT NULL,
    `repeticoes` INTEGER NOT NULL,
    `descanso_segundos` INTEGER NULL,
    `carga_sugerida` DECIMAL(6, 2) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registros_treino` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `aluno_id` BIGINT NOT NULL,
    `ficha_exercicio_id` BIGINT NOT NULL,
    `carga_real` DECIMAL(6, 2) NULL,
    `repeticoes_real` INTEGER NULL,
    `data_execucao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `execucao_ficha` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ficha_id` BIGINT NOT NULL,
    `aluno_id` BIGINT NOT NULL,
    `iniciado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finalizado_em` DATETIME(3) NULL,
    `status` ENUM('NAO_INICIADA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA') NOT NULL DEFAULT 'NAO_INICIADA',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conquistas` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `conquistas_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aluno_conquistas` (
    `aluno_id` BIGINT NOT NULL,
    `conquista_id` BIGINT NOT NULL,
    `recebido_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`aluno_id`, `conquista_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `codigos_verificacao` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT NOT NULL,
    `codigo_verificacao` VARCHAR(255) NOT NULL,
    `expira_em` DATETIME(3) NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `codigos_verificacao_codigo_verificacao_key`(`codigo_verificacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `usuarios_telefone_key` ON `usuarios`(`telefone`);

-- AddForeignKey
ALTER TABLE `fichas_exercicios` ADD CONSTRAINT `fichas_exercicios_ficha_id_fkey` FOREIGN KEY (`ficha_id`) REFERENCES `fichas_treino`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichas_exercicios` ADD CONSTRAINT `fichas_exercicios_exercicio_id_fkey` FOREIGN KEY (`exercicio_id`) REFERENCES `exercicios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_treino` ADD CONSTRAINT `registros_treino_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `Aluno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_treino` ADD CONSTRAINT `registros_treino_ficha_exercicio_id_fkey` FOREIGN KEY (`ficha_exercicio_id`) REFERENCES `fichas_exercicios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `execucao_ficha` ADD CONSTRAINT `execucao_ficha_ficha_id_fkey` FOREIGN KEY (`ficha_id`) REFERENCES `fichas_treino`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `execucao_ficha` ADD CONSTRAINT `execucao_ficha_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `Aluno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aluno_conquistas` ADD CONSTRAINT `aluno_conquistas_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `Aluno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aluno_conquistas` ADD CONSTRAINT `aluno_conquistas_conquista_id_fkey` FOREIGN KEY (`conquista_id`) REFERENCES `conquistas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `codigos_verificacao` ADD CONSTRAINT `codigos_verificacao_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
