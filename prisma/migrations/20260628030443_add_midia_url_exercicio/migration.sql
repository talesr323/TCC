/*
  Warnings:

  - You are about to drop the `exercicios` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `exercicios` DROP FOREIGN KEY `exercicios_criado_por_fkey`;

-- DropForeignKey
ALTER TABLE `fichas_exercicios` DROP FOREIGN KEY `fichas_exercicios_exercicio_id_fkey`;

-- DropIndex
DROP INDEX `fichas_exercicios_exercicio_id_fkey` ON `fichas_exercicios`;

-- DropTable
DROP TABLE `exercicios`;

-- CreateTable
CREATE TABLE `Exercicio` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `grupo_muscular` VARCHAR(191) NOT NULL,
    `midia_url` VARCHAR(255) NULL,
    `criado_por` BIGINT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Exercicio` ADD CONSTRAINT `Exercicio_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `professores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fichas_exercicios` ADD CONSTRAINT `fichas_exercicios_exercicio_id_fkey` FOREIGN KEY (`exercicio_id`) REFERENCES `Exercicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
