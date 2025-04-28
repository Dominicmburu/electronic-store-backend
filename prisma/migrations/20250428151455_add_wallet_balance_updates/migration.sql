-- CreateTable
CREATE TABLE "WalletBalanceUpdate" (
    "id" SERIAL NOT NULL,
    "walletId" INTEGER NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletBalanceUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletBalanceUpdate_transactionId_key" ON "WalletBalanceUpdate"("transactionId");

-- AddForeignKey
ALTER TABLE "WalletBalanceUpdate" ADD CONSTRAINT "WalletBalanceUpdate_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletBalanceUpdate" ADD CONSTRAINT "WalletBalanceUpdate_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
