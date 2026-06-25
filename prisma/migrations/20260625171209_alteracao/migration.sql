/*
  Warnings:

  - You are about to drop the column `repeticoes_real` on the `registros_treino` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `execucao_ficha` MODIFY `status` ENUM('NAO_INICIADA', 'EM_ANDAMENTO', 'INCOMPLETA', 'FINALIZADA', 'CANCELADA') NOT NULL DEFAULT 'NAO_INICIADA';

-- AlterTable
ALTER TABLE `registros_treino` DROP COLUMN `repeticoes_real`;
