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
        text: `*Bestill trusselmodellering*

Dette skjemaet brukes for å bestille trusselmodellering av systemer og applikasjoner.

*Hva skjer etter at du sender inn?*
1. Vi oppretter automatisk en Trello-sak for oppfølging
2. Sikkerhetsteamet blir varslet og tar kontakt for å avtale tidspunkt
3. Vi ønsker at hele teamet deltar i trusselmodelleringen, ikke bare utviklere

*Viktig:* Ikke skriv sensitiv informasjon som passord, personopplysninger eller forretningshemmeligheter i dette skjemaet.`
      }
    },
    {
      type: 'input',
      block_id: 'project_name',
      element: {
        type: 'plain_text_input',
        action_id: 'project_name_input',
        placeholder: {
          type: 'plain_text',
          text: 'Skriv inn system- eller applikasjonsnavn'
        }
      },
      label: {
        type: 'plain_text',
        text: 'System/applikasjonsnavn'
      }
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
          text: 'Kort beskrivelse av systemet/applikasjonen, hva den gjør, hvilke data den håndterer, osv.'
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
          text: 'Velg årsak for trusselmodellering'
        },
        options: [
          {
            text: { type: 'plain_text', text: 'Enkeltstående trusselmodellering' },
            value: 'standalone'
          },
          {
            text: { type: 'plain_text', text: 'Del av en risikovurdering av system' },
            value: 'risk_assessment_part'
          }
        ]
      },
      label: {
        type: 'plain_text',
        text: 'Formål med trusselmodellering'
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
          text: 'F.eks. "i løpet av januar", "før lansering i mars", "fleksibelt", osv.'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Ønsket tidsperiode'
      },
      optional: true,
      hint: {
        type: 'plain_text',
        text: 'Gi en indikasjon på når det passer best for teamet'
      }
    },
    {
      type: 'input',
      block_id: 'additional_info',
      element: {
        type: 'plain_text_input',
        action_id: 'additional_info_input',
        multiline: true,
        placeholder: {
          type: 'plain_text',
          text: 'Del gjerne annen relevant informasjon eller spørsmål'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Tilleggsinformasjon'
      },
      optional: true
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '_Når forespørselen er sendt, opprettes det automatisk en Trello-sak og sikkerhetsteamet blir varslet._'
        }
      ]
    }
  ]
});

module.exports = {
  getThreatModelingRequestModal
};
