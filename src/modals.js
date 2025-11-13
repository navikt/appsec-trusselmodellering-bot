const getThreatModelingRequestModal = () => ({
  type: 'modal',
  callback_id: 'threatmodeling_request_modal',
  title: {
    type: 'plain_text',
    text: 'Trusselmodellering'
  },
  submit: {
    type: 'plain_text',
    text: 'Send inn'
  },
  close: {
    type: 'plain_text',
    text: 'Avbryt'
  },
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Bestill Trusselmodellering*
*Hva skjer etter at du sender inn?*
1. Vi oppretter automatisk en Trello-sak for oppfølging
2. AppSec blir varslet og tar kontakt for å avtale tidspunkt

_Vi setter pris på at både utviklere, produkteiere, designere og andre relevante teammedlemmer deltar i trusselmodelleringen._`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'input',
      block_id: 'team_name',
      element: {
        type: 'plain_text_input',
        action_id: 'team_name_input',
        placeholder: {
          type: 'plain_text',
          text: 'F.eks. Platform Team, Identity Team, osv.'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Hvilket team'
      }
    },
    {
      type: 'input',
      block_id: 'system_description',
      element: {
        type: 'plain_text_input',
        action_id: 'system_description_input',
        multiline: true,
        placeholder: {
          type: 'plain_text',
          text: 'Kort beskrivelse av systemet/applikasjonen'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Systembeskrivelse'
      }
    },
    {
      type: 'input',
      block_id: 'threat_modeling_reason',
      element: {
        type: 'static_select',
        action_id: 'threat_modeling_reason_select',
        placeholder: {
          type: 'plain_text',
          text: 'Velg årsak'
        },
        options: [
          {
            text: { type: 'plain_text', text: 'Enkeltstående trusselmodellering' },
            value: 'standalone'
          },
          {
            text: { type: 'plain_text', text: 'Del av risikovurderingsprosess' },
            value: 'risk_assessment_part'
          }
        ]
      },
      label: {
        type: 'plain_text',
        text: 'Formål'
      }
    },
    {
      type: 'input',
      block_id: 'preferred_timeframe',
      element: {
        type: 'plain_text_input',
        action_id: 'preferred_timeframe_input',
        placeholder: {
          type: 'plain_text',
          text: 'F.eks. "i løpet av januar", "fleksibelt", osv.'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Ønsket tidsperiode'
      },
      optional: true
    }
  ]
});

module.exports = {
  getThreatModelingRequestModal
};
