/*
  Warnings:

  - You are about to drop the column `grupo_muscular` on the `exercicios` table. All the data in the column will be lost.
  - Added the required column `grupo_id` to the `exercicios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `exercicios` DROP COLUMN `grupo_muscular`,
    ADD COLUMN `grupo_id` BIGINT NOT NULL;

-- CreateTable
CREATE TABLE `grupos_musculares` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `grupos_musculares_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exercicios` ADD CONSTRAINT `exercicios_grupo_id_fkey` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_musculares`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
