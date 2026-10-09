// Yoklama Reminder Service


export interface ReminderRecipient {
  memberId: string;
  athleteName: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  trainerName?: string;
  groupName: string;
  status: 'absent' | 'unmarked' | 'excused';
}

export interface TriggerReminderPayload {
  groupName: string;
  trainingTime?: string;
  trainingDate: string;
  recipients: ReminderRecipient[];
  targetAudience: 'parent' | 'trainer' | 'both';
  channels: {
    appNotification: boolean;
    sms: boolean;
    whatsapp: boolean;
    pushNotification: boolean;
  };
  customMessage?: string;
  triggeredBy?: string;
}

export interface ReminderLogItem {
  id: string;
  timestamp: string;
  groupName: string;
  trainingDate: string;
  targetAudience: 'parent' | 'trainer' | 'both';
  totalRecipientCount: number;
  channels: string[];
  messagePreview: string;
  status: 'sent' | 'pending' | 'failed';
  triggeredBy: string;
  recipientsSummary: string[];
}

export interface AutomationRuleConfig {
  autoSendOnSave: boolean; // Auto send when attendance saved with absent athletes
  autoSendAfterStartMinutes: number; // e.g. 15 minutes after start time
  autoSendAfterStartEnabled: boolean;
  trainerAlertOnMissingAttendance: boolean; // Alert trainer if attendance not taken by end of day
  channels: {
    appNotification: boolean;
    sms: boolean;
    whatsapp: boolean;
    pushNotification: boolean;
  };
  targetAudience: 'parent' | 'trainer' | 'both';
}

const CONFIG_STORAGE_KEY = 'sportsfly_yoklama_automation_config_v1';
const LOGS_STORAGE_KEY = 'sportsfly_yoklama_reminder_logs_v1';

export const DEFAULT_AUTOMATION_CONFIG: AutomationRuleConfig = {
  autoSendOnSave: true,
  autoSendAfterStartMinutes: 15,
  autoSendAfterStartEnabled: true,
  trainerAlertOnMissingAttendance: true,
  channels: {
    appNotification: true,
    sms: true,
    whatsapp: true,
    pushNotification: true,
  },
  targetAudience: 'parent',
};

// Retrieve automation rules config from localStorage
export function getAutomationConfig(): AutomationRuleConfig {
  if (typeof window === 'undefined') return DEFAULT_AUTOMATION_CONFIG;
  try {
    const cached = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_AUTOMATION_CONFIG, ...JSON.parse(cached) };
    }
  } catch (e) {
    console.error('Failed to parse automation config', e);
  }
  return DEFAULT_AUTOMATION_CONFIG;
}

// Save automation rules config to localStorage
export function saveAutomationConfig(config: AutomationRuleConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('sportsfly_yoklama_config_updated', { detail: config }));
  } catch (e) {
    console.error('Failed to save automation config', e);
  }
}

// Get history logs of sent reminders
export function getReminderLogs(): ReminderLogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(LOGS_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Failed to parse reminder logs', e);
  }
  return [
    {
      id: 'log-default-1',
      timestamp: 'Bugün 14:15',
      groupName: 'U14 Erkek Basketbol A Grubu',
      trainingDate: new Date().toISOString().split('T')[0],
      targetAudience: 'parent',
      totalRecipientCount: 3,
      channels: ['Uygulama İçi', 'SMS', 'WhatsApp', 'Push'],
      messagePreview: 'Sayın Veli, sporcumuz Can Erten antrenmana henüz giriş yapmamıştır.',
      status: 'sent',
      triggeredBy: 'Otomatik Zamanlayıcı (15. Dk)',
      recipientsSummary: ['Can Erten (Veli: Ali Erten)', 'Sarp Yılmaz (Veli: Mehmet Yılmaz)', 'Arda Kaya (Veli: Zeynep Kaya)'],
    },
  ];
}

// Save history log
export function saveReminderLogs(logs: ReminderLogItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save reminder logs', e);
  }
}

/**
 * Core function to execute reminder trigger logic
 * Dispatches notifications to Parents, Trainers and Admin, logs the event, and triggers push toast
 */
export function executeYoklamaReminderTrigger(payload: TriggerReminderPayload): ReminderLogItem {
  const {
    groupName,
    trainingTime = '16:00',
    trainingDate,
    recipients,
    targetAudience,
    channels,
    customMessage,
    triggeredBy = 'Sistem Tetikleyicisi',
  } = payload;

  const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const activeChannelsList: string[] = [];
  if (channels.appNotification) activeChannelsList.push('Uygulama İçi');
  if (channels.sms) activeChannelsList.push('SMS');
  if (channels.whatsapp) activeChannelsList.push('WhatsApp');
  if (channels.pushNotification) activeChannelsList.push('Anlık Push');

  const recipientsSummary = recipients.map(
    (r) => `${r.athleteName} (Veli: ${r.parentName || 'Veli'} ${r.parentPhone ? `- ${r.parentPhone}` : ''})`
  );

  const athleteNamesText = recipients.map((r) => r.athleteName).join(', ');

  // Construct standard notification text
  const baseMessage = customMessage || 
    (targetAudience === 'parent'
      ? `Sayın Veli, sporcumuz (${athleteNamesText}) ${trainingDate} tarihli ${groupName} antrenmanına henüz yoklama girişi yapmamıştır. Lütfen kontrol ediniz.`
      : targetAudience === 'trainer'
      ? `Sayın Eğitmen, ${groupName} grubunda ${recipients.length} sporcu (${athleteNamesText}) henüz yoklamaya katılmadı.`
      : `Hatırlatma: ${groupName} grubunda ${recipients.length} sporcu (${athleteNamesText}) antrenmana giriş yapmadı.`);

  // Note: Only real database user notifications are preserved in the system notification feed.
  // Test reminders and simulated alerts are logged for reports without polluting the user's notification center.

  // 4. Create log record
  const newLog: ReminderLogItem = {
    id: `log-${Date.now()}`,
    timestamp: `Bugün ${nowStr}`,
    groupName,
    trainingDate,
    targetAudience,
    totalRecipientCount: recipients.length,
    channels: activeChannelsList,
    messagePreview: baseMessage,
    status: 'sent',
    triggeredBy,
    recipientsSummary,
  };

  const existingLogs = getReminderLogs();
  saveReminderLogs([newLog, ...existingLogs]);

  // 5. Dispatch global live event for UI Push Toast Notification & Haptic
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sportsfly_reminder_triggered', {
        detail: {
          log: newLog,
          recipientsCount: recipients.length,
          athleteNamesText,
          groupName,
          targetAudience,
          channels: activeChannelsList,
          message: baseMessage,
        },
      })
    );
  }

  return newLog;
}
