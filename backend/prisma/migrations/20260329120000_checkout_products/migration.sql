-- CreateTable
CREATE TABLE "analysis_purchases" (
    "id" TEXT NOT NULL,
    "stripe_checkout_session_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL DEFAULT '',
    "pack" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_subscriptions" (
    "id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL DEFAULT '',
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_purchases_stripe_checkout_session_id_key" ON "analysis_purchases"("stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_subscriptions_stripe_subscription_id_key" ON "membership_subscriptions"("stripe_subscription_id");
