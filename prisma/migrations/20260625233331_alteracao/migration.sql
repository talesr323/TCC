/*
  Warnings:

  - A unique constraint covering the columns `[execucao_id,ficha_exercicio_id]` on the table `registros_treino` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `execucao_id` to the `registros_treino` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `registros_treino` ADD COLUMN `execucao_id` BIGINT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `registros_treino_execucao_id_ficha_exercicio_id_key` ON `registros_treino`(`execucao_id`, `ficha_exercicio_id`);

-- AddForeignKey
ALTER TABLE `registros_treino` ADD CONSTRAINT `registros_treino_execucao_id_fkey` FOREIGN KEY (`execucao_id`) REFERENCES `execucao_ficha`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
