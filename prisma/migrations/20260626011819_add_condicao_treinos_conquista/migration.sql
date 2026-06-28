/*
  Warnings:

  - Added the required column `condicao_treinos` to the `conquistas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `conquistas` ADD COLUMN `condicao_treinos` INTEGER NOT NULL;
