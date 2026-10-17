export type CommissionTier = {
  id: "starter" | "standard" | "premium";
  range: string;
  summary: string;
  /** Flat fee added on top of the percentage, in NGN. */
  flatFee: number;
  /** Percentage applied to the selling price, as a decimal (0.075 = 7.5%). */
  rate: number;
  min: number;
  max: number | null;
};

export const commissionTiers: CommissionTier[] = [
  {
    id: "starter",
    range: "Below ₦1,500",
    summary: "7.5% of the selling price",
    flatFee: 0,
    rate: 0.075,
    min: 0,
    max: 1500,
  },
  {
    id: "standard",
    range: "₦1,500 – ₦5,000",
    summary: "₦150 + 7.5% of the selling price",
    flatFee: 150,
    rate: 0.075,
    min: 1500,
    max: 5000,
  },
  {
    id: "premium",
    range: "Above ₦5,000",
    summary: "11% of the selling price",
    flatFee: 0,
    rate: 0.11,
    min: 5000,
    max: null,
  },
];

export type CommissionBreakdown = {
  price: number;
  tier: CommissionTier;
  commission: number;
  sellerNet: number;
  effectiveRate: number;
};

const roundToKobo = (value: number) => Math.round(value * 100) / 100;

export function commissionTierFor(price: number): CommissionTier {
  if (price < 1500) return commissionTiers[0]!;
  if (price <= 5000) return commissionTiers[1]!;
  return commissionTiers[2]!;
}

export function calculateCommission(price: number): CommissionBreakdown {
  const safePrice = Number.isFinite(price) && price > 0 ? price : 0;
  const tier = commissionTierFor(safePrice);
  const commission = roundToKobo(safePrice * tier.rate + tier.flatFee);
  const cappedCommission = Math.min(commission, safePrice);
  const sellerNet = roundToKobo(safePrice - cappedCommission);
  return {
    price: safePrice,
    tier,
    commission: cappedCommission,
    sellerNet,
    effectiveRate: safePrice > 0 ? cappedCommission / safePrice : 0,
  };
}

export function formatCommissionRate(rate: number) {
  return `${(rate * 100).toFixed((rate * 100) % 1 === 0 ? 0 : 1)}%`;
}
