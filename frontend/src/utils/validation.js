// Form validation rules matching DealSense ML schema

export const STAGES = [
  { value: 'lead', label: 'Lead', description: 'Initial contact, prospecting stage' },
  { value: 'qualified', label: 'Qualified', description: 'Requirements confirmed, ICP match' },
  { value: 'proposal', label: 'Proposal', description: 'Quote/proposal delivered for review' },
  { value: 'negotiation', label: 'Negotiation', description: 'Terms, pricing, and contract discussion' },
  { value: 'won', label: 'Won', description: 'Deal closed and won' },
  { value: 'lost', label: 'Lost', description: 'Deal closed and lost' },
];

export function validateDealFeatures(values) {
  const errors = {};

  // Deal Value
  if (values.deal_value === '' || values.deal_value === null || values.deal_value === undefined) {
    errors.deal_value = 'Deal value is required.';
  } else if (isNaN(values.deal_value) || Number(values.deal_value) < 0) {
    errors.deal_value = 'Deal value must be a positive number.';
  }

  // Stage
  if (!values.stage) {
    errors.stage = 'Deal stage is required.';
  } else if (!STAGES.some((s) => s.value === values.stage)) {
    errors.stage = 'Invalid deal stage.';
  }

  // Days in Stage
  if (values.days_in_stage === '' || values.days_in_stage === null || values.days_in_stage === undefined) {
    errors.days_in_stage = 'Days in stage is required.';
  } else if (isNaN(values.days_in_stage) || Number(values.days_in_stage) < 0) {
    errors.days_in_stage = 'Must be zero or greater.';
  }

  // Num Interactions
  if (values.num_interactions === '' || values.num_interactions === null || values.num_interactions === undefined) {
    errors.num_interactions = 'Number of interactions is required.';
  } else if (isNaN(values.num_interactions) || Number(values.num_interactions) < 0) {
    errors.num_interactions = 'Must be 0 or greater.';
  }

  // Average Response Time
  if (values.avg_response_min === '' || values.avg_response_min === null || values.avg_response_min === undefined) {
    errors.avg_response_min = 'Average response time is required.';
  } else if (isNaN(values.avg_response_min) || Number(values.avg_response_min) < 0) {
    errors.avg_response_min = 'Must be 0 or greater.';
  }

  // Days Since Last
  if (values.days_since_last === '' || values.days_since_last === null || values.days_since_last === undefined) {
    errors.days_since_last = 'Days since last interaction is required.';
  } else if (isNaN(values.days_since_last) || Number(values.days_since_last) < 0) {
    errors.days_since_last = 'Must be 0 or greater.';
  }

  // Sentiment Trend
  if (values.sentiment_trend === '' || values.sentiment_trend === null || values.sentiment_trend === undefined) {
    errors.sentiment_trend = 'Sentiment trend is required.';
  } else {
    const sentiment = Number(values.sentiment_trend);
    if (isNaN(sentiment) || sentiment < -1.0 || sentiment > 1.0) {
      errors.sentiment_trend = 'Sentiment trend must be between -1.0 and +1.0.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
