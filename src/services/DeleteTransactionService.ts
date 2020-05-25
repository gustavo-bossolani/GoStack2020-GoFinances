import { getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const checkIfTransactionExists = await transactionRepository.findOne(id);

    if (!checkIfTransactionExists) {
      throw new AppError('Transaction was not found.');
    }

    await transactionRepository.remove(checkIfTransactionExists);
  }
}

export default DeleteTransactionService;
