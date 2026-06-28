/*
  Warnings:

  - You are about to drop the `aluno` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `aluno` DROP FOREIGN KEY `Aluno_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `aluno_conquistas` DROP FOREIGN KEY `aluno_conquistas_aluno_id_fkey`;

-- DropForeignKey
ALTER TABLE `execucao_ficha` DROP FOREIGN KEY `execucao_ficha_aluno_id_fkey`;

-- DropForeignKey
ALTER TABLE `fichas_treino` DROP FOREIGN KEY `fichas_treino_aluno_id_fkey`;

-- DropForeignKey
ALTER TABLE `registros_treino` DROP FOREIGN KEY `registros_treino_aluno_id_fkey`;

-- DropIndex
DROP INDEX `execucao_ficha_aluno_id_fkey` ON `execucao_ficha`;

-- DropIndex
DROP INDEX `fichas_treino_aluno_id_fkey` ON `fichas_treino`;

-- DropIndex
DROP INDEX `registros_treino_aluno_id_fkey` ON `registros_treino`;

-- AlterTable
ALTER TABLE `fichas_treino` ADD COLUMN `treino_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `usuarios` MODIFY `cpf` VARCHAR(255) NOT NULL;

-- DropTable
DROP TABLE `aluno`;

-- CreateTable
CREATE TABLE `alunos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `usuario_id` BIGINT NOT NULL,

    UNIQUE INDEX `alunos_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `treinos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `descricao` VARCHAR(255) NULL,
    `aluno_id` BIGINT NOT NULL,
    `professor_id` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `alunos` ADD CONSTRAINT `alunos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treinos` ADD CONSTRAINT `treinos_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treinos` ADD CONSTRAINT `treinos_professor_id_fkey` FOREIGN KEY (`professor_id`) REFERENCES `professores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichas_treino` ADD CONSTRAINT `fichas_treino_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichas_treino` ADD CONSTRAINT `fichas_treino_treino_id_fkey` FOREIGN KEY (`treino_id`) REFERENCES `treinos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_treino` ADD CONSTRAINT `registros_treino_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `execucao_ficha` ADD CONSTRAINT `execucao_ficha_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aluno_conquistas` ADD CONSTRAINT `aluno_conquistas_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
