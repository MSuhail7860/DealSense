// Formatting utilities for DealSense

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '0m';
  const mins = Number(minutes);
  if (mins < 60) {
    return `${Math.round(mins)} min`;
  }
  const hours = (mins / 60).toFixed(1);
  return `${hours} hrs`;
}

export function getStageBadge(stage) {
  const stageMap = {
    won: { label: 'Closed Won', color: 'badge-success' },
    negotiation: { label: 'Negotiation', color: 'badge-primary' },
    proposal: { label: 'Proposal', color: 'badge-cyan' },
    qualified: { label: 'Qualified', color: 'badge-primary' },
    lead: { label: 'Lead', color: 'badge-warning' },
    lost: { label: 'Closed Lost', color: 'badge-danger' },
  };
  return stageMap[stage] || { label: stage, color: 'badge-primary' };
}

export function getSentimentDetails(score) {
  const num = Number(score);
  if (num >= 0.25) {
    return {
      label: 'Positive',
      color: '#10B981',
      badgeClass: 'badge-success',
      description: 'Customer sentiment is warm and trending upward',
    };
  }
  if (num <= -0.25) {
    return {
      label: 'Negative',
      color: '#F43F5E',
      badgeClass: 'badge-danger',
      description: 'Customer sentiment is cool or expressing friction',
    };
  }
  return {
    label: 'Neutral',
    color: '#94A3B8',
    badgeClass: 'badge-primary',
    description: 'Even communication tone with standard inquiry signals',
  };
}

export function getProbabilityCategory(winProbability) {
  const prob = Number(winProbability);
  if (prob >= 0.70) {
    return {
      status: 'High Win Potential',
      variant: 'emerald',
      color: '#10B981',
      badgeClass: 'badge-success',
      advice: 'Strong closing momentum. Focus on removing minor procurement hurdles.',
    };
  }
  if (prob >= 0.40) {
    return {
      status: 'Moderate Opportunity',
      variant: 'amber',
      color: '#F59E0B',
      badgeClass: 'badge-warning',
      advice: 'Balanced probability. Requires active intervention and stakeholder re-engagement.',
    };
  }
  return {
    status: 'High Churn Risk',
    variant: 'rose',
    color: '#F43F5E',
    badgeClass: 'badge-danger',
    advice: 'Critical risk of deal stagnation or loss. Immediate executive intervention recommended.',
  };
}
