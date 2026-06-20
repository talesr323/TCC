/*
  Warnings:

  - You are about to drop the `aluno_gamificacao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `alunos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gamificacao` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `aluno_gamificacao` DROP FOREIGN KEY `aluno_gamificacao_aluno_id_fkey`;

-- DropForeignKey
ALTER TABLE `aluno_gamificacao` DROP FOREIGN KEY `aluno_gamificacao_gamificacao_id_fkey`;

-- DropForeignKey
ALTER TABLE `alunos` DROP FOREIGN KEY `alunos_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `fichas_treino` DROP FOREIGN KEY `fichas_treino_aluno_id_fkey`;

-- DropForeignKey
ALTER TABLE `ranking` DROP FOREIGN KEY `ranking_aluno_id_fkey`;

-- DropForeignKey
ALTER TABLE `registro_treino` DROP FOREIGN KEY `registro_treino_aluno_id_fkey`;

-- DropIndex
DROP INDEX `fichas_treino_aluno_id_fkey` ON `fichas_treino`;

-- DropIndex
DROP INDEX `registro_treino_aluno_id_fkey` ON `registro_treino`;

-- DropTable
DROP TABLE `aluno_gamificacao`;

-- DropTable
DROP TABLE `alunos`;

-- DropTable
DROP TABLE `gamificacao`;

-- CreateTable
CREATE TABLE `Aluno` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT NOT NULL,
    `experiencia` INTEGER NOT NULL DEFAULT 0,
    `nivel` INTEGER NOT NULL DEFAULT 1,
    `moedas` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Aluno_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExecucaoFicha` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ficha_id` BIGINT NOT NULL,
    `aluno_id` BIGINT NOT NULL,
    `iniciado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finalizado_em` DATETIME(3) NULL,
    `xp_ganha` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA') NOT NULL DEFAULT 'EM_ANDAMENTO',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conquista` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `xp_bonus` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Conquista_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlunoConquista` (
    `aluno_id` BIGINT NOT NULL,
    `conquista_id` BIGINT NOT NULL,
    `recebido_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`aluno_id`, `conquista_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Aluno` ADD CONSTRAINT `Aluno_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichas_treino` ADD CONSTRAINT `fichas_treino_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `Aluno`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro_treino` ADD CONSTRAINT `registro_treino_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `Aluno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ranking` ADD CONSTRAINT `ranking_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `Aluno`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExecucaoFicha` ADD CONSTRAINT `ExecucaoFicha_ficha_id_fkey` FOREIGN KEY (`ficha_id`) REFERENCES `fichas_treino`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExecucaoFicha` ADD CONSTRAINT `ExecucaoFicha_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `Aluno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlunoConquista` ADD CONSTRAINT `AlunoConquista_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `Aluno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlunoConquista` ADD CONSTRAINT `AlunoConquista_conquista_id_fkey` FOREIGN KEY (`conquista_id`) REFERENCES `Conquista`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
