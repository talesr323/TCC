/*
  Warnings:

  - You are about to drop the column `experiencia` on the `aluno` table. All the data in the column will be lost.
  - You are about to drop the column `moedas` on the `aluno` table. All the data in the column will be lost.
  - You are about to drop the column `nivel` on the `aluno` table. All the data in the column will be lost.
  - You are about to drop the column `xp_bonus` on the `conquista` table. All the data in the column will be lost.
  - You are about to drop the column `xp_ganha` on the `execucaoficha` table. All the data in the column will be lost.
  - You are about to drop the `ranking` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ranking` DROP FOREIGN KEY `ranking_aluno_id_fkey`;

-- AlterTable
ALTER TABLE `aluno` DROP COLUMN `experiencia`,
    DROP COLUMN `moedas`,
    DROP COLUMN `nivel`;

-- AlterTable
ALTER TABLE `conquista` DROP COLUMN `xp_bonus`;

-- AlterTable
ALTER TABLE `execucaoficha` DROP COLUMN `xp_ganha`;

-- DropTable
DROP TABLE `ranking`;
