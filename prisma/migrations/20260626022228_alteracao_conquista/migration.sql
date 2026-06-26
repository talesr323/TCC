/*
  Warnings:

  - Added the required column `contagem_treinos` to the `conquistas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `conquistas` ADD COLUMN `contagem_treinos` INTEGER NOT NULL;
