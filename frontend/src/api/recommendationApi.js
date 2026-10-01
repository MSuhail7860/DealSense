// DealSense AI Copilot & Recommendations API
import { request, API_BASE_URL } from './api';

/**
 * Generate AI Copilot next-action recommendation for a deal.
 * 
 * Contract matches Backend/src/backend/api/v1/copilot.py:
 * POST /api/v1/deals/{deal_id}/copilot/suggest
 * Body: { prompt: string }
 * Response: { id, deal_id, prompt, retrieved_context_ids, suggestion, accepted, created_at }
 */
export async function getDealSuggestion(dealId, prompt, dealContext = null, allowFallback = true) {
  try {
    const data = await request(`${API_BASE_URL}/api/v1/deals/${dealId}/copilot/suggest`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });

    return {
      ...data,
      isLiveBackend: true,
    };
  } catch (error) {
    if (allowFallback && (error.status === 0 || error.status === 404 || error.status === 503)) {
      console.warn('Backend Copilot service unreachable, using simulated RAG recommendation:', error.message);
      return simulateCopilotSuggestion(dealId, prompt, dealContext);
    }
    throw error;
  }
}

/**
 * Mark a copilot suggestion as accepted
 * PATCH /api/v1/deals/{deal_id}/copilot/suggestions/{suggestion_id}/accept
 */
export async function acceptSuggestion(dealId, suggestionId) {
  try {
    const data = await request(
      `${API_BASE_URL}/api/v1/deals/${dealId}/copilot/suggestions/${suggestionId}/accept`,
      { method: 'PATCH' }
    );
    return data;
  } catch (error) {
    if (error.status === 0 || error.status === 404) {
      // In offline/demo mode, succeed locally
      return {
        id: suggestionId,
        deal_id: dealId,
        accepted: true,
        updated_at: new Date().toISOString(),
      };
    }
    throw error;
  }
}

/**
 * Get interactions for a deal (history used in RAG)
 */
export async function getDealInteractions(dealId) {
  try {
    return await request(`${API_BASE_URL}/api/v1/deals/${dealId}/interactions`);
  } catch {
    return [];
  }
}

/**
 * Fallback generator that produces suggestions matching the Cohere Command prompt format in copilot_service.py
 */
function simulateCopilotSuggestion(dealId, prompt, dealContext) {
  const stage = dealContext?.stage || 'proposal';
  const winProb = dealContext?.win_probability !== undefined ? dealContext.win_probability : 0.65;
  const churnRisk = dealContext?.churn_risk !== undefined ? dealContext.churn_risk : 0.35;
  const dealValue = dealContext?.deal_value ? `$${dealContext.deal_value.toLocaleString()}` : '$65,000';

  let strategyText = '';

  if (churnRisk > 0.45) {
    strategyText = `High Churn Risk Mitigation Strategy (${(churnRisk * 100).toFixed(0)}% Risk)
    
1. Immediate Intervention: Client engagement latency is degrading. Reach out to primary stakeholder via a direct executive check-in call.
2. Value Proposition Alignment: Schedule a 20-minute alignment session focusing specifically on ROI metrics rather than technical feature lists.
3. Objection Handling: Prepare a flexible quarterly billing concession to counter budget freezes.

Draft Follow-up Note:
"Hi team, following up on our recent discussion regarding the ${dealValue} rollout. We noticed key priorities may have shifted this quarter. Let's carve out 15 minutes this Thursday to align on timing and ensure our commercial terms directly support your targets."`;
  } else if (stage === 'negotiation' || winProb > 0.70) {
    strategyText = `Closing Momentum & Contract Finalization (${(winProb * 100).toFixed(0)}% Win Probability)

1. Next Best Action: Send contract execution draft with redline turnaround agreement within 48 hours.
2. Stakeholder Activation: Engage the finance team to clear procurement checklist before month-end.
3. Deal Acceleration: Offer complimentary enterprise onboarding support if agreement is executed prior to the upcoming quarter milestone.

Draft Follow-up Note:
"Hi team, great momentum on our last call. I have prepared the execution package for the ${dealValue} contract. To ensure immediate provisioning on Monday, please review the final scope and confirm if we have green light to send via DocuSign."`;
  } else {
    strategyText = `Stage Progression Recommendation for ${stage.toUpperCase()}

1. Engagement Deepening: Increase interaction frequency with technical and procurement evaluators.
2. Discovery Validation: Verify customer decision criteria and confirm if competitor alternatives are in active evaluation.
3. Scheduled Milestone: Lock in the next decision review date on calendar before concluding any asynchronous communication.

Draft Follow-up Note:
"Hi team, following our discussion on DealSense capabilities, I'd like to share an overview of how teams in your sector achieved measurable efficiency gains within 30 days of deployment. Are you open for a short review on Tuesday?"`;
  }

  return {
    id: 'sugg-' + Math.random().toString(36).substring(2, 9),
    deal_id: dealId || 'deal-demo-1',
    prompt: prompt || 'Suggest next best action',
    retrieved_context_ids: ['ctx-int-01', 'ctx-int-04'],
    suggestion: strategyText,
    accepted: false,
    created_at: new Date().toISOString(),
    isLiveBackend: false,
    warning: 'Displaying simulated AI Copilot suggestion matching DealSense RAG prompt schema.',
  };
}
