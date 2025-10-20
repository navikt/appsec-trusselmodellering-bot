const getPentestRequestModal = () => ({
  type: 'modal',
  callback_id: 'pentest_request_modal',
  title: {
    type: 'plain_text',
    text: 'Pentest-forespørsel'
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
        text: `*Bestill en pentest eller start en dialog*

Dette skjemaet er den raskeste veien for å komme i gang med en sikkerhetstest. Det er helt uforpliktende og ment for å melde interesse – du trenger **ikke** ha alle svarene klare nå.

**Hva skjer etter at du sender inn?**
1.  Vi mottar forespørselen og oppretter en privat Slack-kanal og en Jira-sak.
2.  Du og teamet ditt blir invitert, sammen med sikkerhetsteamet.
3.  I kanalen avklarer vi scope, finner riktig tidspunkt og planlegger testen sammen.

**For å gjøre prosessen smidigere, tenk gjerne gjennom:**
*   **Hva skal testes?** (F.eks. en nettside, et API, en app)
*   **Tilganger:** Trenger vi testbrukere eller spesielle tilganger? (Ikke del passord her!)
*   **Miljø:** Finnes det et eget testmiljø vi kan bruke?
*   **Team:** Hvem fra ditt team bør være involvert?

Jo mer informasjon du gir oss nå, jo raskere kan vi hjelpe deg. Men det viktigste er at du melder fra – så tar vi resten av dialogen i etterkant.

**Viktig:** Ikke skriv sensitiv informasjon som passord, personopplysninger eller forretningshemmeligheter i dette skjemaet.`
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
          text: 'Skriv inn prosjekt- eller applikasjonsnavn'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Prosjektnavn'
      }
    },
    {
      type: 'input',
      block_id: 'target_scope',
      element: {
        type: 'plain_text_input',
        action_id: 'target_scope_input',
        multiline: true,
        placeholder: {
          type: 'plain_text',
          text: 'F.eks. https://example.com, API-endepunkter, mobilapp, testmiljø, osv.'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Hva skal testes?'
      },
      optional: true
    },
    {
      type: 'input',
      block_id: 'pentest_type',
      element: {
        type: 'static_select',
        action_id: 'pentest_type_select',
        placeholder: {
          type: 'plain_text',
          text: 'Velg testtype (hvis du vet)'
        },
        options: [
          { text: { type: 'plain_text', text: 'Webapplikasjon' }, value: 'web_app' },
          { text: { type: 'plain_text', text: 'Mobilapplikasjon' }, value: 'mobile_app' },
          { text: { type: 'plain_text', text: 'API' }, value: 'api' },
          { text: { type: 'plain_text', text: 'Nettverk' }, value: 'network' },
          { text: { type: 'plain_text', text: 'Skyinfrastruktur' }, value: 'cloud' },
          { text: { type: 'plain_text', text: 'Annet / usikker' }, value: 'other' }
        ]
      },
      label: {
        type: 'plain_text',
        text: 'Type test'
      },
      optional: false
    },
    {
      type: 'input',
      block_id: 'urgency',
      element: {
        type: 'static_select',
        action_id: 'urgency_select',
        placeholder: {
          type: 'plain_text',
          text: 'Velg omtrentlig hastegrad'
        },
        options: [
          { text: { type: 'plain_text', text: 'Kritisk (innen 1 uke)' }, value: 'critical' },
          { text: { type: 'plain_text', text: 'Høy (1–2 uker)' }, value: 'high' },
          { text: { type: 'plain_text', text: 'Normal (2–4 uker)' }, value: 'medium' },
          { text: { type: 'plain_text', text: 'Lav (4+ uker eller fleksibelt)' }, value: 'low' },
          { text: { type: 'plain_text', text: 'Usikker enda' }, value: 'unknown' }
        ]
      },
      label: {
        type: 'plain_text',
        text: 'Hastegrad'
      },
      optional: false
    },
    {
      type: 'input',
      block_id: 'full_report',
      element: {
        type: 'radio_buttons',
        action_id: 'full_report_choice',
        options: [
          {
            text: { type: 'plain_text', text: 'Ja, jeg ønsker fullstendig rapport i tillegg til Jira-saker' },
            value: 'yes'
          },
          {
            text: { type: 'plain_text', text: 'Nei, Jira-saker er tilstrekkelig' },
            value: 'no'
          }
        ]
      },
      label: {
        type: 'plain_text',
        text: 'Fullstendig rapport?'
      },
      hint: {
        type: 'plain_text',
        text: 'Velg om du ønsker en rapport (PDF) i tillegg til Jira-saker'
      },
      optional: true
    },
    {
      type: 'input',
      block_id: 'team_members',
      element: {
        type: 'multi_users_select',
        action_id: 'team_members_select',
        placeholder: {
          type: 'plain_text',
          text: 'Velg relevante personer (valgfritt)'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Teammedlemmer'
      },
      optional: true,
      hint: {
        type: 'plain_text',
        text: 'Velg personer som kan være med i dialogen eller følge opp'
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
          text: 'Del gjerne annen info eller spørsmål'
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
          text: '_Når forespørselen er sendt, oppretter vi en Slack-kanal og Jira-sak for videre dialog og detaljer._'
        }
      ]
    }
  ]
});


const getRejectReasonModal = (requestId) => ({
  type: 'modal',
  callback_id: 'reject_reason_modal',
  private_metadata: requestId,
  title: {
    type: 'plain_text',
    text: 'Avvis forespørsel'
  },
  submit: {
    type: 'plain_text',
    text: 'Avvis'
  },
  close: {
    type: 'plain_text',
    text: 'Avbryt'
  },
  blocks: [
    {
      type: 'input',
      block_id: 'rejection_reason',
      element: {
        type: 'plain_text_input',
        action_id: 'reason_input',
        multiline: true,
        placeholder: {
          type: 'plain_text',
          text: 'Vennligst oppgi grunn for avvisning...'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Grunn til avvisning'
      }
    }
  ]
});

const getRequestInfoModal = (requestId) => ({
  type: 'modal',
  callback_id: 'request_info_modal',
  private_metadata: requestId,
  title: {
    type: 'plain_text',
    text: 'Forespør informasjon'
  },
  submit: {
    type: 'plain_text',
    text: 'Send'
  },
  close: {
    type: 'plain_text',
    text: 'Avbryt'
  },
  blocks: [
    {
      type: 'input',
      block_id: 'info_request',
      element: {
        type: 'plain_text_input',
        action_id: 'message_input',
        multiline: true,
        placeholder: {
          type: 'plain_text',
          text: 'Hvilken tilleggsinformasjon trenger du?'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Melding til forespørrer'
      }
    }
  ]
});

const getReplyModal = (requestId) => ({
  type: 'modal',
  callback_id: 'reply_modal',
  private_metadata: requestId,
  title: {
    type: 'plain_text',
    text: 'Svar til administrator'
  },
  submit: {
    type: 'plain_text',
    text: 'Send'
  },
  close: {
    type: 'plain_text',
    text: 'Avbryt'
  },
  blocks: [
    {
      type: 'input',
      block_id: 'reply_message',
      element: {
        type: 'plain_text_input',
        action_id: 'message_input',
        multiline: true,
        placeholder: {
          type: 'plain_text',
          text: 'Ditt svar...'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Ditt svar'
      }
    }
  ]
});

const getStatusUpdateModal = (requestId) => ({
  type: 'modal',
  callback_id: 'status_update_modal',
  private_metadata: requestId,
  title: {
    type: 'plain_text',
    text: 'Oppdater status'
  },
  submit: {
    type: 'plain_text',
    text: 'Oppdater'
  },
  close: {
    type: 'plain_text',
    text: 'Avbryt'
  },
  blocks: [
    {
      type: 'input',
      block_id: 'status_select',
      element: {
        type: 'static_select',
        action_id: 'status_input',
        placeholder: {
          type: 'plain_text',
          text: 'Velg status'
        },
        options: [
          { text: { type: 'plain_text', text: 'Pågår' }, value: 'in_progress' },
          { text: { type: 'plain_text', text: 'Gjennomgang av funn' }, value: 'review' },
          { text: { type: 'plain_text', text: 'Rapportskriving' }, value: 'reporting' },
          { text: { type: 'plain_text', text: 'Fullført' }, value: 'complete' },
          { text: { type: 'plain_text', text: 'På vent' }, value: 'on_hold' }
        ]
      },
      label: {
        type: 'plain_text',
        text: 'Status'
      }
    },
    {
      type: 'input',
      block_id: 'status_note',
      element: {
        type: 'plain_text_input',
        action_id: 'note_input',
        multiline: true,
        placeholder: {
          type: 'plain_text',
          text: 'Legg til notater eller oppdateringer...'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Notater'
      },
      optional: true
    }
  ]
});

const getRequestDetailsModal = (request, requestId, statusHistory = []) => {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Forespørselsdetaljer: ${request.projectName}`
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Forespørsels-ID:*\n${requestId}` },
        { type: 'mrkdwn', text: `*Status:*\n${request.currentStatus || request.status}` }
      ]
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Forespurt av:*\n<@${request.requestedBy}>` },
        { type: 'mrkdwn', text: `*Godkjent av:*\n${request.approvedBy ? `<@${request.approvedBy}>` : 'Ikke godkjent'}` }
      ]
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Testområde:*\n${request.targetScope}\n\n*Tilleggsinformasjon:*\n${request.additionalInfo || 'Ingen'}`
      }
    }
  ];

  if (statusHistory && statusHistory.length > 0) {
    blocks.push({
      type: 'divider'
    });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Statushistorikk:*\n${statusHistory.map(h => 
          `• ${h.statusText} - <@${h.updatedBy}> (${new Date(h.timestamp).toLocaleString('nb-NO')})`
        ).join('\n')}`
      }
    });
  }

  return {
    type: 'modal',
    title: {
      type: 'plain_text',
      text: 'Forespørselsdetaljer'
    },
    close: {
      type: 'plain_text',
      text: 'Lukk'
    },
    blocks
  };
};

const getApprovalModal = (requestId) => ({
  type: 'modal',
  callback_id: 'approve_with_jira_modal',
  private_metadata: requestId,
  title: {
    type: 'plain_text',
    text: 'Godkjenn forespørsel'
  },
  submit: {
    type: 'plain_text',
    text: 'Godkjenn'
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
        text: 'Du er i ferd med å godkjenne denne pentest-forespørselen. Du kan eventuelt knytte en Jira-sak for oppfølging.'
      }
    },
    {
      type: 'input',
      block_id: 'jira_ticket_url',
      element: {
        type: 'url_text_input',
        action_id: 'jira_url_input',
        placeholder: {
          type: 'plain_text',
          text: 'https://firma.atlassian.net/browse/SEC-123'
        }
      },
      label: {
        type: 'plain_text',
        text: 'Jira-sak URL'
      },
      hint: {
        type: 'plain_text',
        text: 'Valgfritt: Lenke til Jira-saken for denne pentesten'
      },
      optional: true
    }
  ]
});

module.exports = {
  getPentestRequestModal,
  getRejectReasonModal,
  getRequestInfoModal,
  getReplyModal,
  getStatusUpdateModal,
  getRequestDetailsModal,
  getApprovalModal
};
