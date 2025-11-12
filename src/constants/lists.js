// Constants for threat modeling modal form fields
// These match the structure used in the threat modeling modal

const THREAT_MODELING_REASONS = [
  { value: 'standalone', label: 'Enkeltstående trusselmodellering' },
  { value: 'risk_assessment_part', label: 'Del av en risikovurdering av system' }
];

// Modal form field identifiers
const MODAL_FIELDS = Object.freeze({
  PROJECT_NAME: 'project_name',
  TEAM_NAME: 'team_name', 
  SYSTEM_DESCRIPTION: 'system_description',
  THREAT_MODELING_REASON: 'threat_modeling_reason',
  PREFERRED_TIMEFRAME: 'preferred_timeframe', 
});

// Modal callback identifiers
const MODAL_CALLBACKS = Object.freeze({
  THREAT_MODELING_REQUEST: 'threatmodeling_request_modal'
});

// Helper function to get label for threat modeling reason
const getThreatModelingReasonLabel = (value) => {
  const reason = THREAT_MODELING_REASONS.find(r => r.value === value);
  return reason ? reason.label : value;
};

module.exports = {
  THREAT_MODELING_REASONS,
  MODAL_FIELDS,
  MODAL_CALLBACKS,
  getThreatModelingReasonLabel
};
