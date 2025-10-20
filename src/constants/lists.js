const LIST_NAME = 'Pentest-bestillinger';

const STATUS_CHOICES = [
  { value: 'pending', label: 'Avventer', color: 'yellow' },
  { value: 'in_progress', label: 'Pågår', color: 'blue' },
  { value: 'done', label: 'Ferdig', color: 'green' },
  { value: 'rejected', label: 'Avvist', color: 'red' }
];

const URGENCY_CHOICES = [
  { value: 'critical', label: 'Kritisk', color: 'red' },
  { value: 'high', label: 'Høy', color: 'orange' },
  { value: 'medium', label: 'Middels', color: 'yellow' },
  { value: 'low', label: 'Lav', color: 'green' },
  { value: 'unknown', label: 'Usikker', color: 'gray' }
];

const PENTEST_TYPE_CHOICES = [
  { value: 'web_app', label: 'Webapplikasjon', color: 'blue' },
  { value: 'mobile_app', label: 'Mobilapplikasjon', color: 'cyan' },
  { value: 'api', label: 'API', color: 'purple' },
  { value: 'network', label: 'Nettverk', color: 'indigo' },
  { value: 'cloud', label: 'Skyinfrastruktur', color: 'pink' },
  { value: 'other', label: 'Annet', color: 'gray' }
];

const LIST_COLUMNS = Object.freeze({
  projectName: {
    key: 'project_name',
    name: 'Prosjektnavn',
    type: 'text',
    is_primary_column: true
  },
  requestId: {
    key: 'request_id',
    name: 'Forespørsels-ID',
    type: 'text'
  },
  status: {
    key: 'status',
    name: 'Status',
    type: 'select',
    options: { format: 'single_select', choices: STATUS_CHOICES }
  },
  urgency: {
    key: 'urgency',
    name: 'Hastegrad',
    type: 'select',
    options: { format: 'single_select', choices: URGENCY_CHOICES }
  },
  assignedTo: {
    key: 'assigned_to',
    name: 'Tildelt til',
    type: 'user',
    options: {
      format: 'multi_entity',
      show_member_name: true,
      notify_users: false
    }
  },
  requestedBy: {
    key: 'requested_by',
    name: 'Forespurt av',
    type: 'user',
    options: {
      format: 'single_entity',
      show_member_name: true
    }
  },
  pentestType: {
    key: 'pentest_type',
    name: 'Type',
    type: 'select',
    options: { format: 'single_select', choices: PENTEST_TYPE_CHOICES }
  },
  adminMessageTs: {
    key: 'admin_message_ts',
    name: 'Admin Msg TS',
    type: 'text'
  }
});

const LIST_SCHEMA = Object.freeze(
  Object.values(LIST_COLUMNS).map(({ key, name, type, options, is_primary_column }) => ({
    key,
    name,
    type,
    ...(is_primary_column ? { is_primary_column: true } : {}),
    ...(options ? { options } : {})
  }))
);

const COLUMN_KEYS = Object.freeze(
  Object.fromEntries(Object.entries(LIST_COLUMNS).map(([alias, definition]) => [alias, definition.key]))
);

const REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DONE: 'done'
});

const REQUEST_TO_LIST_STATUS = Object.freeze({
  pending: 'pending',
  approved: 'pending',
  rejected: 'rejected',
  completed: 'done',
  done: 'done',
  in_progress: 'in_progress',
  complete: 'done',
  reporting: 'in_progress',
  review: 'in_progress',
  on_hold: 'pending'
});

const LIST_TO_REQUEST_STATUS = Object.freeze({
  pending: 'pending',
  in_progress: 'in_progress',
  done: 'completed',
  rejected: 'rejected'
});

const URGENCY_LABELS = Object.freeze(
  URGENCY_CHOICES.reduce((acc, choice) => {
    acc[choice.value] = choice.label;
    return acc;
  }, {})
);

const PENTEST_TYPE_LABELS = Object.freeze(
  PENTEST_TYPE_CHOICES.reduce((acc, choice) => {
    acc[choice.value] = choice.label;
    return acc;
  }, {})
);

const DEFAULT_ADMIN_MESSAGE_PLACEHOLDER = '-';

module.exports = {
  LIST_NAME,
  LIST_COLUMNS,
  LIST_SCHEMA,
  COLUMN_KEYS,
  STATUS_CHOICES,
  URGENCY_CHOICES,
  PENTEST_TYPE_CHOICES,
  REQUEST_STATUS,
  REQUEST_TO_LIST_STATUS,
  LIST_TO_REQUEST_STATUS,
  URGENCY_LABELS,
  PENTEST_TYPE_LABELS,
  DEFAULT_ADMIN_MESSAGE_PLACEHOLDER
};
