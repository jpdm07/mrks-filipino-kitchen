-- Additive: scheduling banner override on singleton pricing settings.

ALTER TABLE "PricingSettings" ADD COLUMN "schedulingBannerForceStateA" BOOLEAN NOT NULL DEFAULT false;
