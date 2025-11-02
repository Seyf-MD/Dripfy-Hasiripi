import * as React from 'react';
import { Department, OperationalRole } from '../../../types';

interface RoleFiltersProps {
  role: OperationalRole | null;
  department: Department | null;
  availableRoles: OperationalRole[];
  availableDepartments: Department[];
  onChangeRole: (role: OperationalRole | null) => void;
  onChangeDepartment: (department: Department | null) => void;
}

const RoleFilters: React.FC<RoleFiltersProps> = ({
  role,
  department,
  availableRoles,
  availableDepartments,
  onChangeRole,
  onChangeDepartment,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span className="font-medium">Rol</span>
        <select
          value={role ?? ''}
          onChange={(event) => onChangeRole(event.target.value ? event.target.value as OperationalRole : null)}
          className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Tümü</option>
          {availableRoles.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span className="font-medium">Departman</span>
        <select
          value={department ?? ''}
          onChange={(event) => onChangeDepartment(event.target.value ? event.target.value as Department : null)}
          className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Tümü</option>
          {availableDepartments.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default RoleFilters;
