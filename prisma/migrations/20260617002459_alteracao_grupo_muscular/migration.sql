/*
  Warnings:

  - You are about to drop the column `grupo_id` on the `exercicios` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `exercicios` DROP FOREIGN KEY `exercicios_grupo_id_fkey`;

-- DropIndex
DROP INDEX `exercicios_grupo_id_fkey` ON `exercicios`;

-- AlterTable
ALTER TABLE `exercicios` DROP COLUMN `grupo_id`;
