import { createTask } from '../tasks';
import { updateRecord as updateRecordApi } from '../records';
import { triggerReport as triggerReportApi } from '../reports';
import type {
  AutomationCommand,
  CreateTaskCommand,
  TriggerReportCommand,
  UpdateRecordCommand,
} from './commandParser/index';

export interface AutomationActionResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

function buildTaskPayload(command: CreateTaskCommand) {
  return {
    title: command.title,
    description: command.description,
    assignee: command.assignee,
    priority: command.priority,
    dueDate: command.dueDate,
  };
}

function buildRecordPayload(command: UpdateRecordCommand) {
  return {
    collection: command.collection,
    id: command.recordId,
    changes: command.changes,
  };
}

function buildReportPayload(command: TriggerReportCommand) {
  return {
    reportType: command.reportType,
    parameters: command.parameters,
    notes: command.notes,
  };
}

export async function executeAutomationCommand(command: AutomationCommand): Promise<AutomationActionResult> {
  switch (command.type) {
    case 'createTask': {
      const response = await createTask(buildTaskPayload(command));
      return {
        ok: true,
        message: `Görev oluşturuldu: ${command.title}`,
        data: response,
      };
    }
    case 'updateRecord': {
      const payload = buildRecordPayload(command);
      const response = await updateRecordApi(payload.collection, payload.id, payload.changes);
      return {
        ok: true,
        message: `${command.collection} koleksiyonunda ${command.recordId} kaydı güncellendi.`,
        data: response,
      };
    }
    case 'triggerReport': {
      const response = await triggerReportApi(buildReportPayload(command));
      return {
        ok: true,
        message: `${command.reportType} raporu tetiklendi.`,
        data: response,
      };
    }
    default:
      return { ok: false, message: 'Komut desteklenmiyor.' };
  }
}
